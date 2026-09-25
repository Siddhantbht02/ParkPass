import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { prisma } from '../prisma';
import { AllocationService } from '../services/allocation.service';
import { NotificationService } from '../services/notification.service';
import { WaitlistService } from '../services/waitlist.service';
import { z } from 'zod';

const VerifyPassSchema = z.object({
  qrData: z.string().min(1, 'QR data or Pass Code is required'),
  autoCheckout: z.boolean().optional().default(false),
  gateId: z.string().optional().nullable(),
});

const ConfirmEntrySchema = z.object({
  passId: z.string().min(1, 'Pass ID is required'),
  gateId: z.string().optional().nullable(),
});

const WalkInSchema = z.object({
  visitorName: z.string().min(2, 'Visitor name is required'),
  visitorPhone: z.string().optional().nullable(),
  visitorCategory: z.string().default('GUEST'),
  vehicleNumber: z.string().min(4, 'Vehicle number is required'),
  vehicleType: z.string().default('CAR'),
  flatId: z.string().min(1, 'Destination flat is required'),
  durationHours: z.number().min(1).max(24).default(4),
  gateId: z.string().optional().nullable(),
});

// Helper for atomic vehicle checkout and slot release
async function executeCheckoutSession({
  sessionId,
  societyId,
  guardId,
  gateId,
}: {
  sessionId: string;
  societyId: string;
  guardId: string;
  gateId?: string | null;
}) {
  const session = await prisma.parkingSession.findFirst({
    where: {
      id: sessionId,
      societyId,
    },
    include: {
      pass: { include: { resident: true } },
      parkingSlot: true,
    },
  });

  if (!session) {
    throw new Error('Active parking session not found');
  }

  if (session.status !== 'ACTIVE') {
    throw new Error(`Session is already ${session.status.toLowerCase()}`);
  }

  const now = new Date();
  const durationMinutes = Math.max(0, Math.floor((now.getTime() - new Date(session.actualEntryTime).getTime()) / 60000));
  const validUntil = new Date(session.pass.validUntil);
  const wasOverstay = now > validUntil;

  await prisma.$transaction(async (tx) => {
    // 1. Mark session COMPLETED or OVERSTAYED
    await tx.parkingSession.update({
      where: { id: session.id },
      data: {
        actualExitTime: now,
        status: wasOverstay ? 'OVERSTAYED' : 'COMPLETED',
        guardExitId: guardId,
        exitGateId: gateId || null,
      },
    });

    // 2. Mark pass CHECKED_OUT
    await tx.visitorPass.update({
      where: { id: session.passId },
      data: { status: 'CHECKED_OUT' },
    });

    // 3. Release any reservation
    await tx.parkingReservation.updateMany({
      where: { passId: session.passId },
      data: { status: 'RELEASED' },
    });

    // 4. Record VisitEvent
    await tx.visitEvent.create({
      data: {
        societyId,
        passId: session.passId,
        sessionId: session.id,
        eventType: 'EXIT_CONFIRMED',
        eventTime: now,
        guardId,
        gateId: gateId || null,
        metadata: JSON.stringify({
          durationMinutes,
          wasOverstay,
          slot: session.parkingSlot.slotNumber,
        }),
      },
    });

    // 5. Notify resident
    await tx.notification.create({
      data: {
        societyId,
        userId: session.pass.residentId,
        title: 'Visitor Departed',
        message: `${session.pass.visitorName} (${session.pass.vehicleNumber}) has left the building. Parking slot ${session.parkingSlot.slotNumber} has been released.`,
        type: 'EXIT',
      },
    });
  });

  // Automatically check and promote waitlist as a slot has been freed
  WaitlistService.checkAndPromoteWaitlist(societyId, session.pass.vehicleType).catch(console.error);

  return {
    session,
    durationMinutes,
    slotNumber: session.parkingSlot.slotNumber,
    wasOverstay,
  };
}

export async function guardRoutes(fastify: FastifyInstance) {
  // Middleware: verify guard or admin
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const decoded = await request.jwtVerify() as any;
      (request as any).user = decoded;
      if (decoded.role !== 'GUARD' && decoded.role !== 'ADMIN') {
        return reply.status(403).send({ error: 'Access forbidden: Guard or Admin only' });
      }
    } catch (err) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // GET /dashboard
  fastify.get('/dashboard', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const now = new Date();

    const [
      activeSessionsCount,
      totalSlots,
      recentSessions,
      gates,
      expectedArrivals,
      activeWaitlistCount,
    ] = await Promise.all([
      prisma.parkingSession.count({
        where: { societyId: user.societyId, status: 'ACTIVE' },
      }),
      prisma.parkingSlot.count({
        where: { societyId: user.societyId, isActive: true },
      }),
      prisma.parkingSession.findMany({
        where: { societyId: user.societyId },
        include: {
          pass: {
            include: {
              resident: {
                include: { flat: { include: { tower: true } } },
              },
            },
          },
          parkingSlot: true,
          entryGate: true,
        },
        orderBy: { actualEntryTime: 'desc' },
        take: 5,
      }),
      prisma.gate.findMany({
        where: { societyId: user.societyId, isActive: true },
      }),
      prisma.visitorPass.findMany({
        where: {
          societyId: user.societyId,
          status: 'SCHEDULED',
          validUntil: { gte: now },
        },
        include: {
          parkingSlot: true,
          resident: {
            include: { flat: { include: { tower: true } } },
          },
        },
        orderBy: [{ arrivalStatus: 'desc' }, { validFrom: 'asc' }],
        take: 15,
      }),
      prisma.parkingWaitlist.count({
        where: { societyId: user.societyId, status: 'WAITING' },
      }),
    ]);

    return reply.send({
      stats: {
        parkedVehicles: activeSessionsCount,
        availableSlots: Math.max(0, totalSlots - activeSessionsCount),
        totalSlots,
        activeWaitlist: activeWaitlistCount,
        expectedToday: expectedArrivals.length,
      },
      recentSessions,
      expectedArrivals,
      gates,
      activeWaitlistCount,
      currentTime: now.toISOString(),
    });
  });

  // POST /verify-pass
  fastify.post('/verify-pass', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const parseResult = VerifyPassSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        isValid: false,
        code: 'INVALID_INPUT',
        message: 'Invalid pass or QR code input',
      });
    }

    let { qrData } = parseResult.data;
    qrData = qrData.trim();

    // If QR data is a full URL, extract the token from /pass/<token>
    if (qrData.includes('/pass/')) {
      const parts = qrData.split('/pass/');
      qrData = parts[parts.length - 1].split('?')[0];
    }

    // Try finding by secureToken or passCode
    const pass = await prisma.visitorPass.findFirst({
      where: {
        OR: [
          { secureToken: qrData },
          { passCode: qrData.toUpperCase() },
        ],
      },
      include: {
        society: true,
        parkingSlot: true,
        resident: {
          include: {
            flat: { include: { tower: true } },
          },
        },
      },
    });

    if (!pass) {
      return reply.send({
        isValid: false,
        code: 'PASS_NOT_FOUND',
        message: 'Pass not found. Please verify the code or check if it was generated for this society.',
      });
    }

    // 1. Tenant check: Pass must belong to the guard's society
    if (pass.societyId !== user.societyId) {
      return reply.send({
        isValid: false,
        code: 'WRONG_SOCIETY',
        message: `Pass belongs to a different society (${pass.society.name}). Entry denied.`,
      });
    }

    // 2. Status checks
    if (pass.status === 'CANCELLED') {
      return reply.send({
        isValid: false,
        code: 'PASS_CANCELLED',
        message: 'This pass has been cancelled by the resident.',
        pass: {
          id: pass.id,
          passCode: pass.passCode,
          visitorName: pass.visitorName,
          vehicleNumber: pass.vehicleNumber,
          status: pass.status,
        },
      });
    }

    if (pass.status === 'REVOKED') {
      return reply.send({
        isValid: false,
        code: 'PASS_REVOKED',
        message: 'This pass was revoked by the society administration.',
      });
    }

    if (pass.status === 'CHECKED_IN') {
      const activeSession = await prisma.parkingSession.findFirst({
        where: {
          passId: pass.id,
          status: 'ACTIVE',
        },
        include: {
          parkingSlot: true,
        },
      });

      if (!activeSession) {
        return reply.send({
          isValid: false,
          code: 'NO_ACTIVE_SESSION',
          message: 'Pass is marked as checked in, but no active parking session was found.',
        });
      }

      const now = new Date();
      const actualEntry = activeSession.actualEntryTime ? new Date(activeSession.actualEntryTime) : new Date();
      const durationMinutes = Math.max(0, Math.floor((now.getTime() - actualEntry.getTime()) / 60000));
      const validUntil = new Date(pass.validUntil);
      const isOverstay = now > validUntil;
      const overstayMinutes = isOverstay ? Math.floor((now.getTime() - validUntil.getTime()) / 60000) : 0;

      // If autoCheckout flag is set (e.g. from guard auto-exit scan mode)
      if (parseResult.data.autoCheckout) {
        const checkoutResult = await executeCheckoutSession({
          sessionId: activeSession.id,
          societyId: user.societyId,
          guardId: user.id,
          gateId: parseResult.data.gateId,
        });

        return reply.send({
          isValid: true,
          action: 'EXIT_COMPLETED',
          code: 'CHECKED_OUT',
          message: `Visitor marked as left from building! Slot ${checkoutResult.slotNumber} is now free.`,
          pass: {
            id: pass.id,
            passCode: pass.passCode,
            visitorName: pass.visitorName,
            visitorPhone: pass.visitorPhone,
            vehicleNumber: pass.vehicleNumber,
            vehicleType: pass.vehicleType,
            visitorCategory: pass.visitorCategory,
            towerName: pass.resident.flat?.tower.name || 'Tower',
            flatNumber: pass.resident.flat?.flatNumber || '',
            residentName: pass.resident.name,
            slotId: pass.parkingSlotId,
            slotNumber: pass.parkingSlot.slotNumber,
            slotZone: pass.parkingSlot.zone,
            validFrom: pass.validFrom,
            validUntil: pass.validUntil,
            status: 'CHECKED_OUT',
          },
          session: {
            id: activeSession.id,
            actualEntryTime: activeSession.actualEntryTime,
            actualExitTime: now,
            durationMinutes,
            isOverstay,
            overstayMinutes,
          },
        });
      }

      // Return READY_FOR_EXIT so guard can confirm departure and release slot
      return reply.send({
        isValid: true,
        action: 'EXIT',
        code: 'READY_FOR_EXIT',
        message: `Visitor is currently parked in Slot ${pass.parkingSlot.slotNumber}. Scanning again marks departure and releases the slot.`,
        pass: {
          id: pass.id,
          passCode: pass.passCode,
          visitorName: pass.visitorName,
          visitorPhone: pass.visitorPhone,
          vehicleNumber: pass.vehicleNumber,
          vehicleType: pass.vehicleType,
          visitorCategory: pass.visitorCategory,
          towerName: pass.resident.flat?.tower.name || 'Tower',
          flatNumber: pass.resident.flat?.flatNumber || '',
          residentName: pass.resident.name,
          slotId: pass.parkingSlotId,
          slotNumber: pass.parkingSlot.slotNumber,
          slotZone: pass.parkingSlot.zone,
          validFrom: pass.validFrom,
          validUntil: pass.validUntil,
          status: pass.status,
        },
        session: {
          id: activeSession.id,
          actualEntryTime: activeSession.actualEntryTime,
          durationMinutes,
          isOverstay,
          overstayMinutes,
        },
      });
    }

    if (pass.status === 'CHECKED_OUT') {
      const lastSession = await prisma.parkingSession.findFirst({
        where: { passId: pass.id },
        orderBy: { actualExitTime: 'desc' },
      });
      const exitTimeStr = lastSession?.actualExitTime
        ? new Date(lastSession.actualExitTime).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })
        : '';
      return reply.send({
        isValid: false,
        code: 'ALREADY_CHECKED_OUT',
        message: `This pass has already been completed. Visitor already left the building${exitTimeStr ? ` at ${exitTimeStr}` : ''}.`,
        pass: {
          id: pass.id,
          passCode: pass.passCode,
          visitorName: pass.visitorName,
          vehicleNumber: pass.vehicleNumber,
          status: pass.status,
        },
      });
    }

    // 3. Expiration & timing check (with 30 min grace period before/after)
    const now = new Date();
    const graceMs = 30 * 60 * 1000;
    const windowStart = new Date(new Date(pass.validFrom).getTime() - graceMs);
    const windowEnd = new Date(new Date(pass.validUntil).getTime() + graceMs);

    if (now < windowStart) {
      return reply.send({
        isValid: false,
        code: 'TOO_EARLY',
        message: `Arrival scheduled for ${new Date(pass.validFrom).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}. Early entry is outside the grace window.`,
        pass: {
          id: pass.id,
          passCode: pass.passCode,
          visitorName: pass.visitorName,
          vehicleNumber: pass.vehicleNumber,
          validFrom: pass.validFrom,
          status: pass.status,
        },
      });
    }

    if (now > windowEnd) {
      return reply.send({
        isValid: false,
        code: 'PASS_EXPIRED',
        message: `Pass expired on ${new Date(pass.validUntil).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}.`,
        pass: {
          id: pass.id,
          passCode: pass.passCode,
          visitorName: pass.visitorName,
          vehicleNumber: pass.vehicleNumber,
          status: pass.status,
        },
      });
    }

    // 4. Verify slot is still valid and not physically occupied by another vehicle
    const activeOccupant = await prisma.parkingSession.findFirst({
      where: {
        parkingSlotId: pass.parkingSlotId,
        status: 'ACTIVE',
      },
    });

    if (activeOccupant) {
      return reply.send({
        isValid: false,
        code: 'SLOT_OCCUPIED',
        message: `Assigned slot ${pass.parkingSlot.slotNumber} is currently occupied by another vehicle. Please reallocate slot.`,
      });
    }

    // Pass is verified! Return details for guard confirmation
    return reply.send({
      isValid: true,
      code: 'VERIFIED',
      message: 'Visitor pass verified successfully. Please inspect vehicle and confirm entry.',
      pass: {
        id: pass.id,
        passCode: pass.passCode,
        visitorName: pass.visitorName,
        visitorPhone: pass.visitorPhone,
        vehicleNumber: pass.vehicleNumber,
        vehicleType: pass.vehicleType,
        visitorCategory: pass.visitorCategory,
        towerName: pass.resident.flat?.tower.name || 'Tower',
        flatNumber: pass.resident.flat?.flatNumber || '',
        residentName: pass.resident.name,
        slotId: pass.parkingSlotId,
        slotNumber: pass.parkingSlot.slotNumber,
        slotZone: pass.parkingSlot.zone,
        validFrom: pass.validFrom,
        validUntil: pass.validUntil,
        status: pass.status,
      },
    });
  });

  // POST /confirm-entry
  fastify.post('/confirm-entry', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const parseResult = ConfirmEntrySchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Pass ID is required' });
    }

    const { passId, gateId } = parseResult.data;

    // Use transaction to ensure idempotency and atomic entry creation
    const session = await prisma.$transaction(async (tx) => {
      const pass = await tx.visitorPass.findUnique({
        where: { id: passId },
        include: {
          parkingSlot: true,
          resident: { include: { flat: { include: { tower: true } } } },
        },
      });

      if (!pass) {
        throw new Error('Pass not found');
      }

      if (pass.societyId !== user.societyId) {
        throw new Error('Pass belongs to different society');
      }

      if (pass.status === 'CHECKED_IN') {
        throw new Error('Vehicle is already checked in');
      }

      if (pass.status !== 'SCHEDULED') {
        throw new Error(`Cannot check in pass with status ${pass.status}`);
      }

      // Check slot occupancy
      const existingSession = await tx.parkingSession.findFirst({
        where: { parkingSlotId: pass.parkingSlotId, status: 'ACTIVE' },
      });
      if (existingSession) {
        throw new Error(`Slot ${pass.parkingSlot.slotNumber} is currently occupied`);
      }

      const now = new Date();

      // Create parking session
      const newSession = await tx.parkingSession.create({
        data: {
          societyId: user.societyId,
          passId: pass.id,
          parkingSlotId: pass.parkingSlotId,
          guardEntryId: user.id,
          entryGateId: gateId || null,
          actualEntryTime: now,
          status: 'ACTIVE',
        },
      });

      // Update pass status
      await tx.visitorPass.update({
        where: { id: pass.id },
        data: { status: 'CHECKED_IN' },
      });

      // Convert reservation
      await tx.parkingReservation.updateMany({
        where: { passId: pass.id, status: 'ACTIVE' },
        data: { status: 'CONVERTED' },
      });

      // Log VisitEvent
      await tx.visitEvent.create({
        data: {
          societyId: user.societyId,
          passId: pass.id,
          sessionId: newSession.id,
          eventType: 'ENTRY_CONFIRMED',
          eventTime: now,
          guardId: user.id,
          gateId: gateId || null,
          metadata: JSON.stringify({
            vehicleNumber: pass.vehicleNumber,
            slot: pass.parkingSlot.slotNumber,
          }),
        },
      });

      // The Visitor Handover: When a visitor enters, ParkPass automatically sends the resident a notification: "Your visitor has arrived."
      await tx.notification.create({
        data: {
          societyId: user.societyId,
          userId: pass.residentId,
          title: 'The Visitor Handover',
          message: `Your visitor has arrived: ${pass.visitorName} (${pass.vehicleNumber}) has entered through gate and parked at Bay ${pass.parkingSlot.slotNumber}.`,
          type: 'VISITOR_ARRIVED',
          metadata: JSON.stringify({
            handover: true,
            passId: pass.id,
            sessionId: newSession.id,
            visitorName: pass.visitorName,
            vehicleNumber: pass.vehicleNumber,
            slotNumber: pass.parkingSlot.slotNumber,
            arrivedAt: now.toISOString(),
          }),
        },
      });

      return newSession;
    });

    return reply.send({
      success: true,
      message: 'Vehicle entry confirmed and parking session activated.',
      session,
    });
  });

  // POST /walk-in
  fastify.post('/walk-in', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const parseResult = WalkInSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parseResult.error.flatten(),
      });
    }

    const data = parseResult.data;
    const now = new Date();
    const endTime = new Date(now.getTime() + data.durationHours * 60 * 60 * 1000);
    const normalizedVehicle = data.vehicleNumber.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

    // Find flat and resident
    const flat = await prisma.flat.findUnique({
      where: { id: data.flatId },
      include: {
        residents: { where: { isActive: true }, take: 1 },
        tower: true,
      },
    });

    if (!flat || flat.societyId !== user.societyId) {
      return reply.status(404).send({ error: 'Flat not found in this society' });
    }

    const resident = flat.residents[0];
    if (!resident) {
      return reply.status(400).send({ error: 'No active resident registered for this flat' });
    }

    // Allocate slot
    const slot = await AllocationService.allocateSlot({
      societyId: user.societyId,
      vehicleType: data.vehicleType,
      startTime: now,
      endTime,
    });

    if (!slot) {
      return reply.status(409).send({
        error: 'No visitor parking slots currently available for this vehicle type.',
      });
    }

    const secureToken = 'pk_' + crypto.randomBytes(16).toString('hex');
    const passCode = 'PP-' + Math.floor(10000 + Math.random() * 90000);

    const session = await prisma.$transaction(async (tx) => {
      const pass = await tx.visitorPass.create({
        data: {
          passCode,
          societyId: user.societyId,
          residentId: resident.id,
          visitorName: data.visitorName.trim(),
          visitorPhone: data.visitorPhone || null,
          vehicleNumber: normalizedVehicle,
          vehicleType: data.vehicleType,
          visitorCategory: data.visitorCategory,
          secureToken,
          parkingSlotId: slot.id,
          validFrom: now,
          validUntil: endTime,
          durationHours: data.durationHours,
          status: 'CHECKED_IN',
        },
      });

      const newSession = await tx.parkingSession.create({
        data: {
          societyId: user.societyId,
          passId: pass.id,
          parkingSlotId: slot.id,
          guardEntryId: user.id,
          entryGateId: data.gateId || null,
          actualEntryTime: now,
          status: 'ACTIVE',
        },
      });

      await tx.visitEvent.create({
        data: {
          societyId: user.societyId,
          passId: pass.id,
          sessionId: newSession.id,
          eventType: 'WALK_IN_APPROVED',
          eventTime: now,
          guardId: user.id,
          gateId: data.gateId || null,
          metadata: JSON.stringify({
            flat: `${flat.tower.name} ${flat.flatNumber}`,
            slot: slot.slotNumber,
            vehicle: normalizedVehicle,
          }),
        },
      });

      // The Visitor Handover
      await tx.notification.create({
        data: {
          societyId: user.societyId,
          userId: resident.id,
          title: 'The Visitor Handover',
          message: `Your visitor has arrived: ${data.visitorName} (${normalizedVehicle}) has arrived at gate and has been assigned parking slot ${slot.slotNumber}.`,
          type: 'VISITOR_ARRIVED',
          metadata: JSON.stringify({
            handover: true,
            passId: pass.id,
            sessionId: newSession.id,
            visitorName: data.visitorName,
            vehicleNumber: normalizedVehicle,
            slotNumber: slot.slotNumber,
            arrivedAt: now.toISOString(),
          }),
        },
      });

      return newSession;
    });

    return reply.status(201).send({
      message: `Walk-in visitor registered and assigned to slot ${slot.slotNumber}.`,
      session,
      slotNumber: slot.slotNumber,
    });
  });

  // GET /active-parking
  fastify.get('/active-parking', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const query = request.query as any;

    const sessions = await prisma.parkingSession.findMany({
      where: {
        societyId: user.societyId,
        status: 'ACTIVE',
      },
      include: {
        pass: {
          include: {
            resident: {
              include: {
                flat: { include: { tower: true } },
              },
            },
          },
        },
        parkingSlot: true,
        guardEntry: { select: { name: true } },
        entryGate: true,
      },
      orderBy: { actualEntryTime: 'desc' },
    });

    const now = new Date();
    // Annotate overstay
    const enriched = sessions.map((s) => {
      const validUntil = new Date(s.pass.validUntil);
      const isOverstay = now > validUntil;
      const overstayMinutes = isOverstay ? Math.floor((now.getTime() - validUntil.getTime()) / 60000) : 0;
      return {
        ...s,
        isOverstay,
        overstayMinutes,
      };
    });

    // Optional query filtering
    let filtered = enriched;
    if (query.search) {
      const q = query.search.toLowerCase().trim();
      filtered = filtered.filter(
        (s) =>
          s.pass.vehicleNumber.toLowerCase().includes(q) ||
          s.pass.visitorName.toLowerCase().includes(q) ||
          s.parkingSlot.slotNumber.toLowerCase().includes(q) ||
          s.pass.resident.flat?.flatNumber.toLowerCase().includes(q)
      );
    }

    return reply.send({ sessions: filtered });
  });

  // POST /checkout/:sessionId
  fastify.post('/checkout/:sessionId', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { sessionId } = request.params as any;
    const body = (request.body as any) || {};

    try {
      const result = await executeCheckoutSession({
        sessionId,
        societyId: user.societyId,
        guardId: user.id,
        gateId: body.gateId,
      });

      return reply.send({
        success: true,
        message: `Checkout confirmed. Slot ${result.slotNumber} is now free. Total duration: ${Math.floor(result.durationMinutes / 60)}h ${result.durationMinutes % 60}m.`,
        durationMinutes: result.durationMinutes,
        slotNumber: result.slotNumber,
      });
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  // POST /mark-exit (Checkout directly by passId or qrData)
  fastify.post('/mark-exit', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const body = (request.body as any) || {};
    let passId = body.passId;

    if (!passId && body.qrData) {
      let qrData = String(body.qrData).trim();
      if (qrData.includes('/pass/')) {
        const parts = qrData.split('/pass/');
        qrData = parts[parts.length - 1].split('?')[0];
      }
      const pass = await prisma.visitorPass.findFirst({
        where: {
          societyId: user.societyId,
          OR: [{ secureToken: qrData }, { passCode: qrData.toUpperCase() }],
        },
      });
      if (pass) {
        passId = pass.id;
      }
    }

    if (!passId) {
      return reply.status(400).send({ error: 'passId or valid qrData is required' });
    }

    const activeSession = await prisma.parkingSession.findFirst({
      where: {
        passId,
        societyId: user.societyId,
        status: 'ACTIVE',
      },
    });

    if (!activeSession) {
      return reply.status(404).send({ error: 'No active parking session found for this pass' });
    }

    try {
      const result = await executeCheckoutSession({
        sessionId: activeSession.id,
        societyId: user.societyId,
        guardId: user.id,
        gateId: body.gateId,
      });

      return reply.send({
        success: true,
        message: `Visitor successfully marked as left from building. Slot ${result.slotNumber} is released.`,
        durationMinutes: result.durationMinutes,
        slotNumber: result.slotNumber,
      });
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  // POST /cancel-pass (Guard cancels pass at gate)
  fastify.post('/cancel-pass', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { passId, reason } = (request.body as any) || {};

    if (!passId) {
      return reply.status(400).send({ error: 'passId is required' });
    }

    const pass = await prisma.visitorPass.findFirst({
      where: { id: passId, societyId: user.societyId },
      include: { parkingSlot: true, resident: true },
    });

    if (!pass) {
      return reply.status(404).send({ error: 'Pass not found' });
    }

    if (pass.status === 'CHECKED_IN') {
      return reply.status(400).send({ error: 'Cannot cancel active parked session. Use checkout instead.' });
    }

    if (pass.status !== 'SCHEDULED') {
      return reply.status(400).send({ error: `Cannot cancel pass with status ${pass.status}` });
    }

    await prisma.$transaction(async (tx) => {
      await tx.visitorPass.update({
        where: { id: pass.id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });

      await tx.parkingReservation.updateMany({
        where: { passId: pass.id, status: 'ACTIVE' },
        data: { status: 'CANCELLED' },
      });

      await tx.visitEvent.create({
        data: {
          societyId: user.societyId,
          passId: pass.id,
          eventType: 'PASS_CANCELLED',
          guardId: user.id,
          metadata: JSON.stringify({
            cancelledByGuard: user.name,
            reason: reason || 'Cancelled at gate by security guard',
          }),
        },
      });

      await tx.notification.create({
        data: {
          societyId: user.societyId,
          userId: pass.residentId,
          title: 'Visitor Pass Cancelled',
          message: `Visitor pass for ${pass.visitorName} (${pass.vehicleNumber}) was cancelled at the gate. Slot ${pass.parkingSlot.slotNumber} has been freed.`,
          type: 'INFO',
        },
      });
    });

    return reply.send({
      success: true,
      message: `Pass cancelled successfully. Slot ${pass.parkingSlot.slotNumber} has been released.`,
    });
  });

  // GET /entry-history
  fastify.get('/entry-history', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const query = request.query as any;

    const sessions = await prisma.parkingSession.findMany({
      where: { societyId: user.societyId },
      include: {
        pass: {
          include: {
            resident: {
              include: { flat: { include: { tower: true } } },
            },
          },
        },
        parkingSlot: true,
        guardEntry: { select: { name: true } },
        guardExit: { select: { name: true } },
      },
      orderBy: { actualEntryTime: 'desc' },
      take: parseInt(query.limit || '50', 10),
    });

    return reply.send({ sessions });
  });
}
