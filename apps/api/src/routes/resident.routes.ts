import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { prisma } from '../prisma';
import { AllocationService } from '../services/allocation.service';
import { NotificationService } from '../services/notification.service';
import { WaitlistService } from '../services/waitlist.service';
import { z } from 'zod';

const CreatePassSchema = z.object({
  visitorName: z.string().min(2, 'Visitor name must be at least 2 characters'),
  visitorPhone: z.string().optional().nullable(),
  visitorCategory: z.string().default('GUEST'),
  vehicleNumber: z.string().min(4, 'Vehicle number is too short').max(20),
  vehicleType: z.string().default('CAR'),
  validFrom: z.string().datetime(),
  durationHours: z.number().min(1).max(72),
  preferredSlotId: z.string().optional().nullable(),
});

const ExtendPassSchema = z.object({
  additionalHours: z.number().min(1).max(48),
});

const JoinWaitlistSchema = z.object({
  visitorName: z.string().min(2, 'Visitor name must be at least 2 characters'),
  visitorPhone: z.string().optional().nullable(),
  vehicleNumber: z.string().min(4, 'Vehicle number is too short').max(20),
  vehicleType: z.string().default('CAR'),
  visitorCategory: z.string().default('GUEST'),
  durationHours: z.number().min(1).max(72).default(4),
});

export async function residentRoutes(fastify: FastifyInstance) {
  // Middleware: verify resident or admin
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const decoded = await request.jwtVerify() as any;
      (request as any).user = decoded;
      if (decoded.role !== 'RESIDENT' && decoded.role !== 'ADMIN') {
        return reply.status(403).send({ error: 'Access forbidden: Resident only' });
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
      totalPasses,
      activeSessions,
      upcomingPasses,
      recentPasses,
      notifications,
      waitlist,
      expiringPasses,
    ] = await Promise.all([
      prisma.visitorPass.count({
        where: { residentId: user.id, societyId: user.societyId },
      }),
      prisma.parkingSession.findMany({
        where: {
          societyId: user.societyId,
          status: 'ACTIVE',
          pass: { residentId: user.id },
        },
        include: {
          pass: true,
          parkingSlot: true,
        },
      }),
      prisma.visitorPass.findMany({
        where: {
          residentId: user.id,
          societyId: user.societyId,
          status: 'SCHEDULED',
          validUntil: { gte: now },
        },
        include: {
          parkingSlot: true,
        },
        orderBy: { validFrom: 'asc' },
        take: 10,
      }),
      prisma.visitorPass.findMany({
        where: {
          residentId: user.id,
          societyId: user.societyId,
        },
        include: {
          parkingSlot: true,
          sessions: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      WaitlistService.getResidentWaitlist(user.id, user.societyId),
      prisma.visitorPass.findMany({
        where: {
          residentId: user.id,
          societyId: user.societyId,
          status: { in: ['CHECKED_IN', 'SCHEDULED'] },
          validUntil: {
            gte: now,
            lte: new Date(now.getTime() + 30 * 60 * 1000), // expiring in next 30 minutes
          },
        },
        include: {
          parkingSlot: true,
          sessions: true,
        },
        orderBy: { validUntil: 'asc' },
      }),
    ]);

    return reply.send({
      stats: {
        totalBookings: totalPasses,
        activeVisitors: activeSessions.length,
        upcomingArrivals: upcomingPasses.length,
        activeWaitlist: waitlist.filter((w) => w.status === 'WAITING').length,
      },
      activeSessions,
      upcomingPasses,
      recentPasses,
      notifications,
      waitlist,
      expiringPasses,
    });
  });

  // GET /parking-availability
  fastify.get('/parking-availability', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const query = request.query as any;

    const startTime = query.validFrom ? new Date(query.validFrom) : new Date();
    const durationHours = parseInt(query.durationHours || '4', 10);
    const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);
    const vehicleType = query.vehicleType || 'CAR';

    const availability = await AllocationService.getAvailableSlots({
      societyId: user.societyId,
      vehicleType,
      startTime,
      endTime,
    });

    return reply.send(availability);
  });

  // POST /visitor-passes
  fastify.post('/visitor-passes', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const parseResult = CreatePassSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parseResult.error.flatten(),
      });
    }

    const data = parseResult.data;
    const startTime = new Date(data.validFrom);
    const endTime = new Date(startTime.getTime() + data.durationHours * 60 * 60 * 1000);

    // Normalize vehicle number
    const normalizedVehicle = data.vehicleNumber.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

    // Allocate slot atomically
    const slot = await AllocationService.allocateSlot({
      societyId: user.societyId,
      vehicleType: data.vehicleType,
      startTime,
      endTime,
      preferredSlotId: data.preferredSlotId,
    });

    if (!slot) {
      return reply.status(409).send({
        error: 'PARKING_FULL',
        canWaitlist: true,
        message: 'No visitor parking is available during this time. All slots are currently occupied. You can join the Society Parking Waitlist to be automatically allocated when a vehicle exits.',
      });
    }

    // Generate secure pass credentials
    const secureToken = 'pk_' + crypto.randomBytes(16).toString('hex');
    const passCode = 'PP-' + Math.floor(10000 + Math.random() * 90000);

    // Save pass and reservation in transaction
    const pass = await prisma.$transaction(async (tx) => {
      const newPass = await tx.visitorPass.create({
        data: {
          passCode,
          societyId: user.societyId,
          residentId: user.id,
          visitorName: data.visitorName.trim(),
          visitorPhone: data.visitorPhone || null,
          vehicleNumber: normalizedVehicle,
          vehicleType: data.vehicleType,
          visitorCategory: data.visitorCategory,
          secureToken,
          parkingSlotId: slot.id,
          validFrom: startTime,
          validUntil: endTime,
          durationHours: data.durationHours,
          status: 'SCHEDULED',
        },
        include: {
          parkingSlot: true,
          resident: {
            include: {
              society: true,
              flat: { include: { tower: true } },
            },
          },
        },
      });

      // Create reservation
      await tx.parkingReservation.create({
        data: {
          societyId: user.societyId,
          passId: newPass.id,
          parkingSlotId: slot.id,
          startTime,
          endTime,
          status: 'ACTIVE',
        },
      });

      // Log event
      await tx.visitEvent.create({
        data: {
          societyId: user.societyId,
          passId: newPass.id,
          eventType: 'PASS_CREATED',
          metadata: JSON.stringify({
            slot: slot.slotNumber,
            vehicle: normalizedVehicle,
          }),
        },
      });

      return newPass;
    });

    // Generate WhatsApp link
    const waLink = NotificationService.generateWhatsAppLink({
      visitorName: pass.visitorName,
      vehicleNumber: pass.vehicleNumber,
      societyName: pass.resident.society.name,
      towerName: pass.resident.flat?.tower.name || 'Tower',
      flatNumber: pass.resident.flat?.flatNumber || '',
      slotNumber: slot.slotNumber,
      arrivalStr: startTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }),
      validUntilStr: endTime.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }),
      secureToken: pass.secureToken,
      visitorPhone: pass.visitorPhone,
    });

    return reply.status(201).send({
      pass,
      whatsappLink: waLink,
      message: `Parking slot ${slot.slotNumber} has been reserved for your visitor.`,
    });
  });

  // GET /visitor-passes
  fastify.get('/visitor-passes', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const query = request.query as any;

    const where: any = {
      residentId: user.id,
      societyId: user.societyId,
    };

    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
    }

    const passes = await prisma.visitorPass.findMany({
      where,
      include: {
        parkingSlot: true,
        sessions: {
          include: {
            guardEntry: { select: { name: true } },
            guardExit: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({ passes });
  });

  // GET /visitor-passes/:id
  fastify.get('/visitor-passes/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id } = request.params as any;

    const pass = await prisma.visitorPass.findFirst({
      where: {
        id,
        residentId: user.id,
        societyId: user.societyId,
      },
      include: {
        parkingSlot: true,
        sessions: true,
        events: { orderBy: { eventTime: 'asc' } },
        resident: {
          include: {
            society: true,
            flat: { include: { tower: true } },
          },
        },
      },
    });

    if (!pass) {
      return reply.status(404).send({ error: 'Visitor pass not found' });
    }

    return reply.send({ pass });
  });

  // POST /visitor-passes/:id/cancel
  fastify.post('/visitor-passes/:id/cancel', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id } = request.params as any;

    const pass = await prisma.visitorPass.findFirst({
      where: {
        id,
        residentId: user.id,
        societyId: user.societyId,
      },
      include: { parkingSlot: true },
    });

    if (!pass) {
      return reply.status(404).send({ error: 'Visitor pass not found' });
    }

    if (pass.status === 'CHECKED_IN') {
      return reply.status(400).send({
        error: 'Cannot cancel pass while vehicle is currently parked inside. Please contact security.',
      });
    }

    if (pass.status === 'CANCELLED' || pass.status === 'CHECKED_OUT') {
      return reply.status(400).send({ error: `Pass is already ${pass.status.toLowerCase()}` });
    }

    await prisma.$transaction(async (tx) => {
      await tx.visitorPass.update({
        where: { id: pass.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });

      // Release reservation
      await tx.parkingReservation.updateMany({
        where: { passId: pass.id, status: 'ACTIVE' },
        data: { status: 'CANCELLED' },
      });

      // Log event
      await tx.visitEvent.create({
        data: {
          societyId: user.societyId,
          passId: pass.id,
          eventType: 'PASS_CANCELLED',
          metadata: JSON.stringify({ cancelledBy: user.name }),
        },
      });
    });

    // Check and promote eligible waitlist entry immediately
    WaitlistService.checkAndPromoteWaitlist(user.societyId, pass.vehicleType).catch(console.error);

    return reply.send({ message: 'Visitor pass successfully cancelled and parking slot released.' });
  });

  // POST /visitor-passes/:id/extend (One-Tap Visitor Extension with Alternative Slot Check)
  fastify.post('/visitor-passes/:id/extend', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id } = request.params as any;
    const parseResult = ExtendPassSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid extension hours' });
    }

    const { additionalHours } = parseResult.data;

    const pass = await prisma.visitorPass.findFirst({
      where: {
        id,
        residentId: user.id,
        societyId: user.societyId,
      },
      include: {
        parkingSlot: true,
        sessions: { where: { status: 'ACTIVE' } },
      },
    });

    if (!pass) {
      return reply.status(404).send({ error: 'Pass not found' });
    }

    if (pass.status !== 'SCHEDULED' && pass.status !== 'CHECKED_IN') {
      return reply.status(400).send({ error: `Cannot extend a pass that is ${pass.status}` });
    }

    const currentEndTime = new Date(pass.validUntil);
    const newEndTime = new Date(currentEndTime.getTime() + additionalHours * 60 * 60 * 1000);

    // 1. Check if the current slot is available for extended period
    const isCurrentSlotAvailable = await AllocationService.isSlotAvailable(
      pass.parkingSlotId,
      currentEndTime,
      newEndTime,
      pass.id
    );

    if (isCurrentSlotAvailable) {
      // Direct extension on same slot!
      await prisma.$transaction(async (tx) => {
        await tx.visitorPass.update({
          where: { id: pass.id },
          data: {
            validUntil: newEndTime,
            durationHours: pass.durationHours + additionalHours,
          },
        });

        await tx.parkingReservation.updateMany({
          where: { passId: pass.id, status: 'ACTIVE' },
          data: { endTime: newEndTime },
        });

        await tx.visitEvent.create({
          data: {
            societyId: user.societyId,
            passId: pass.id,
            eventType: 'PASS_EXTENDED',
            metadata: JSON.stringify({
              additionalHours,
              newEndTime,
              slot: pass.parkingSlot.slotNumber,
              reassigned: false,
            }),
          },
        });

        await tx.notification.create({
          data: {
            societyId: user.societyId,
            userId: user.id,
            title: `Parking Extended (+${additionalHours}h)`,
            message: `Parking for ${pass.visitorName} (${pass.vehicleNumber}) extended until ${newEndTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })} in slot ${pass.parkingSlot.slotNumber}. No security call needed!`,
            type: 'SYSTEM',
          },
        });
      });

      return reply.send({
        success: true,
        reassigned: false,
        slotNumber: pass.parkingSlot.slotNumber,
        newEndTime,
        message: `Pass successfully extended by ${additionalHours} hour(s) until ${newEndTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })} in slot ${pass.parkingSlot.slotNumber}.`,
      });
    }

    // 2. Current slot has upcoming conflict! Check for an alternative available slot
    const alternativeSlot = await AllocationService.allocateSlot({
      societyId: user.societyId,
      vehicleType: pass.vehicleType,
      startTime: currentEndTime,
      endTime: newEndTime,
      excludePassId: pass.id,
    });

    if (alternativeSlot) {
      // Relocate seamlessly to alternative slot!
      await prisma.$transaction(async (tx) => {
        await tx.visitorPass.update({
          where: { id: pass.id },
          data: {
            parkingSlotId: alternativeSlot.id,
            validUntil: newEndTime,
            durationHours: pass.durationHours + additionalHours,
          },
        });

        // Update reservation with alternative slot and new end time
        await tx.parkingReservation.updateMany({
          where: { passId: pass.id, status: 'ACTIVE' },
          data: {
            parkingSlotId: alternativeSlot.id,
            endTime: newEndTime,
          },
        });

        // If physically checked in, update session parking slot
        if (pass.sessions.length > 0) {
          await tx.parkingSession.updateMany({
            where: { passId: pass.id, status: 'ACTIVE' },
            data: { parkingSlotId: alternativeSlot.id },
          });
        }

        await tx.visitEvent.create({
          data: {
            societyId: user.societyId,
            passId: pass.id,
            eventType: 'PASS_EXTENDED_REASSIGNED',
            metadata: JSON.stringify({
              additionalHours,
              previousSlot: pass.parkingSlot.slotNumber,
              newSlot: alternativeSlot.slotNumber,
              newEndTime,
            }),
          },
        });

        await tx.notification.create({
          data: {
            societyId: user.societyId,
            userId: user.id,
            title: `Parking Extended (Relocated to ${alternativeSlot.slotNumber})`,
            message: `Slot ${pass.parkingSlot.slotNumber} has an upcoming reservation. Visitor was seamlessly moved to alternative slot ${alternativeSlot.slotNumber} until ${newEndTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}.`,
            type: 'SYSTEM',
          },
        });
      });

      return reply.send({
        success: true,
        reassigned: true,
        previousSlot: pass.parkingSlot.slotNumber,
        slotNumber: alternativeSlot.slotNumber,
        newEndTime,
        message: `Current slot (${pass.parkingSlot.slotNumber}) is reserved for another resident. Your visitor was seamlessly relocated to alternative slot ${alternativeSlot.slotNumber} until ${newEndTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}.`,
      });
    }

    // 3. No slots available
    return reply.status(409).send({
      error: 'PARKING_FULL',
      canWaitlist: true,
      message: `All visitor parking bays are booked for this extension window. You can join the society waitlist to secure the next available bay.`,
    });
  });

  // POST /waitlist (Join Society Parking Waitlist)
  fastify.post('/waitlist', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const parseResult = JoinWaitlistSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parseResult.error.flatten(),
      });
    }

    const data = parseResult.data;
    const result = await WaitlistService.addToWaitlist({
      societyId: user.societyId,
      residentId: user.id,
      visitorName: data.visitorName,
      visitorPhone: data.visitorPhone,
      vehicleNumber: data.vehicleNumber,
      vehicleType: data.vehicleType,
      visitorCategory: data.visitorCategory,
      durationHours: data.durationHours,
    });

    return reply.status(201).send(result);
  });

  // GET /waitlist (Get resident's active waitlist entries)
  fastify.get('/waitlist', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const entries = await WaitlistService.getResidentWaitlist(user.id, user.societyId);
    return reply.send({ waitlist: entries });
  });

  // DELETE /waitlist/:id (Cancel waitlist entry)
  fastify.delete('/waitlist/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id } = request.params as any;

    try {
      const cancelled = await WaitlistService.cancelWaitlist(id, user.id);
      return reply.send({ message: 'Waitlist entry cancelled successfully', entry: cancelled });
    } catch (err: any) {
      return reply.status(400).send({ error: err.message || 'Failed to cancel waitlist entry' });
    }
  });

  // POST /simulate-expiry-alert (Demo trigger for "Your visitor's parking expires in 15 minutes")
  fastify.post('/simulate-expiry-alert', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const body = (request.body as any) || {};

    let targetPass: any = null;
    if (body.passId) {
      targetPass = await prisma.visitorPass.findFirst({
        where: { id: body.passId, residentId: user.id },
        include: { parkingSlot: true },
      });
    }

    if (!targetPass) {
      targetPass = await prisma.visitorPass.findFirst({
        where: { residentId: user.id, status: { in: ['CHECKED_IN', 'SCHEDULED'] } },
        include: { parkingSlot: true },
        orderBy: { validUntil: 'asc' },
      });
    }

    if (!targetPass) {
      return reply.status(400).send({ error: 'No active or scheduled pass found to trigger expiry alert for.' });
    }

    const notification = await prisma.notification.create({
      data: {
        societyId: user.societyId,
        userId: user.id,
        title: '⚠️ Parking Expires in 15 Minutes',
        message: `Your visitor ${targetPass.visitorName}'s parking in slot ${targetPass.parkingSlot.slotNumber} expires in 15 minutes. Tap below to extend with one tap!`,
        type: 'EXPIRING_SOON',
        metadata: JSON.stringify({
          passId: targetPass.id,
          slotNumber: targetPass.parkingSlot.slotNumber,
          vehicleNumber: targetPass.vehicleNumber,
          visitorName: targetPass.visitorName,
          validUntil: targetPass.validUntil,
        }),
      },
    });

    return reply.send({
      success: true,
      message: 'Expiry alert sent to resident dashboard.',
      notification,
    });
  });

  // POST /simulate-handover (The Visitor Handover: "Your visitor has arrived")
  fastify.post('/simulate-handover', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const body = (request.body as any) || {};

    let targetPass: any = null;
    if (body.passId) {
      targetPass = await prisma.visitorPass.findFirst({
        where: { id: body.passId, residentId: user.id },
        include: { parkingSlot: true },
      });
    }

    if (!targetPass) {
      targetPass = await prisma.visitorPass.findFirst({
        where: { residentId: user.id },
        include: { parkingSlot: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    const visitorName = targetPass?.visitorName || 'Rohit Verma';
    const vehicleNumber = targetPass?.vehicleNumber || 'MH02BV4455';
    const slotNumber = targetPass?.parkingSlot?.slotNumber || 'P-06';
    const now = new Date();

    const notification = await prisma.notification.create({
      data: {
        societyId: user.societyId,
        userId: user.id,
        title: 'The Visitor Handover',
        message: `Your visitor has arrived: ${visitorName} (${vehicleNumber}) has entered through gate and parked at Bay ${slotNumber}.`,
        type: 'VISITOR_ARRIVED',
        metadata: JSON.stringify({
          handover: true,
          passId: targetPass?.id,
          visitorName,
          vehicleNumber,
          slotNumber,
          arrivedAt: now.toISOString(),
        }),
      },
    });

    return reply.send({
      success: true,
      message: 'Your visitor has arrived.',
      notification,
    });
  });

  // GET /notifications
  fastify.get('/notifications', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return reply.send({ notifications });
  });

  // POST /notifications/:id/read
  fastify.post('/notifications/:id/read', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id } = request.params as any;

    await prisma.notification.updateMany({
      where: { id, userId: user.id },
      data: { isRead: true },
    });

    return reply.send({ success: true });
  });
}
