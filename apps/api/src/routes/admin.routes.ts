import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';
import { AuditService } from '../services/audit.service';
import { z } from 'zod';

const UpdateSlotSchema = z.object({
  isActive: z.boolean().optional(),
  parkingType: z.string().optional(),
  zone: z.string().optional(),
  floor: z.string().optional(),
  forceRelease: z.boolean().optional(),
  reason: z.string().optional(),
});

const CreateSlotSchema = z.object({
  slotNumber: z.string().min(1, 'Slot number is required'),
  parkingType: z.string().default('CAR'),
  zone: z.string().optional(),
  floor: z.string().optional(),
});

const SocietyConfigSchema = z.object({
  name: z.string().optional(),
  address: z.string().optional(),
  timezone: z.string().optional(),
  configuration: z.record(z.any()).optional(),
});

const CreateUserSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email().optional().nullable(),
  role: z.enum(['RESIDENT', 'GUARD', 'ADMIN']),
  flatId: z.string().optional().nullable(),
  password: z.string().min(6).default('password123'),
});

export async function adminRoutes(fastify: FastifyInstance) {
  // Middleware: verify admin
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const decoded = await request.jwtVerify() as any;
      (request as any).user = decoded;
      if (decoded.role !== 'ADMIN') {
        return reply.status(403).send({ error: 'Access forbidden: Administrator role required' });
      }
    } catch (err) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // GET /dashboard
  fastify.get('/dashboard', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      flatsCount,
      totalSlots,
      activeSessions,
      todayEntries,
      todayExits,
      activeReservations,
      blockedSlots,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.flat.count({ where: { societyId: user.societyId } }),
      prisma.parkingSlot.count({ where: { societyId: user.societyId } }),
      prisma.parkingSession.findMany({
        where: { societyId: user.societyId, status: 'ACTIVE' },
        include: {
          pass: { include: { resident: { include: { flat: { include: { tower: true } } } } } },
          parkingSlot: true,
        },
      }),
      prisma.parkingSession.count({
        where: { societyId: user.societyId, actualEntryTime: { gte: startOfToday } },
      }),
      prisma.parkingSession.count({
        where: { societyId: user.societyId, actualExitTime: { gte: startOfToday } },
      }),
      prisma.parkingReservation.count({
        where: { societyId: user.societyId, status: 'ACTIVE' },
      }),
      prisma.parkingSlot.count({
        where: { societyId: user.societyId, isActive: false },
      }),
      prisma.auditLog.findMany({
        where: { societyId: user.societyId },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
    ]);

    // Calculate overstays
    const overstayCount = activeSessions.filter((s) => now > new Date(s.pass.validUntil)).length;
    const occupiedCount = activeSessions.length;
    const availableCount = Math.max(0, totalSlots - occupiedCount - blockedSlots);

    return reply.send({
      stats: {
        totalFlats: flatsCount,
        totalSlots,
        occupiedSlots: occupiedCount,
        availableSlots: availableCount,
        activeReservations,
        blockedSlots,
        todayEntries,
        todayExits,
        overstayCount,
      },
      activeSessions: activeSessions.map((s) => ({
        id: s.id,
        slotNumber: s.parkingSlot.slotNumber,
        vehicleNumber: s.pass.vehicleNumber,
        visitorName: s.pass.visitorName,
        flatNumber: s.pass.resident.flat?.flatNumber,
        towerName: s.pass.resident.flat?.tower.name,
        actualEntryTime: s.actualEntryTime,
        validUntil: s.pass.validUntil,
        isOverstay: now > new Date(s.pass.validUntil),
      })),
      recentAuditLogs,
    });
  });

  // GET /parking-slots
  fastify.get('/parking-slots', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const now = new Date();

    const slots = await prisma.parkingSlot.findMany({
      where: { societyId: user.societyId },
      include: {
        sessions: {
          where: { status: 'ACTIVE' },
          include: {
            pass: {
              include: {
                resident: {
                  include: { flat: { include: { tower: true } } },
                },
              },
            },
          },
        },
        reservations: {
          where: {
            status: 'ACTIVE',
            startTime: { lte: new Date(now.getTime() + 2 * 60 * 60 * 1000) },
            endTime: { gte: now },
          },
          include: {
            pass: {
              include: {
                resident: {
                  include: { flat: { include: { tower: true } } },
                },
              },
            },
          },
        },
      },
      orderBy: { slotNumber: 'asc' },
    });

    const enriched = slots.map((s) => {
      let status = 'AVAILABLE';
      let currentOccupant = null;
      let reservation = null;

      if (!s.isActive) {
        status = 'BLOCKED';
      } else if (s.sessions.length > 0) {
        status = 'OCCUPIED';
        const session = s.sessions[0];
        const isOverstay = now > new Date(session.pass.validUntil);
        currentOccupant = {
          sessionId: session.id,
          visitorName: session.pass.visitorName,
          vehicleNumber: session.pass.vehicleNumber,
          residentName: session.pass.resident.name,
          flatNumber: session.pass.resident.flat?.flatNumber,
          towerName: session.pass.resident.flat?.tower.name,
          actualEntryTime: session.actualEntryTime,
          validUntil: session.pass.validUntil,
          isOverstay,
        };
      } else if (s.reservations.length > 0) {
        status = 'RESERVED';
        const res = s.reservations[0];
        reservation = {
          visitorName: res.pass.visitorName,
          vehicleNumber: res.pass.vehicleNumber,
          flatNumber: res.pass.resident.flat?.flatNumber,
          startTime: res.startTime,
          endTime: res.endTime,
        };
      }

      return {
        id: s.id,
        slotNumber: s.slotNumber,
        parkingType: s.parkingType,
        zone: s.zone,
        floor: s.floor,
        isActive: s.isActive,
        status,
        currentOccupant,
        reservation,
      };
    });

    return reply.send({ slots: enriched });
  });

  // POST /parking-slots
  fastify.post('/parking-slots', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const parseResult = CreateSlotSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid slot data' });
    }

    const { slotNumber, parkingType, zone, floor } = parseResult.data;

    // Check duplicate
    const existing = await prisma.parkingSlot.findFirst({
      where: { societyId: user.societyId, slotNumber: slotNumber.toUpperCase() },
    });

    if (existing) {
      return reply.status(409).send({ error: `Slot ${slotNumber} already exists in this society` });
    }

    const slot = await prisma.parkingSlot.create({
      data: {
        societyId: user.societyId,
        slotNumber: slotNumber.toUpperCase(),
        parkingType,
        zone: zone || 'General',
        floor: floor || 'Ground',
        isActive: true,
      },
    });

    await AuditService.log({
      societyId: user.societyId,
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'SLOT_CREATED',
      entityType: 'PARKING_SLOT',
      entityId: slot.id,
      metadata: { slotNumber: slot.slotNumber },
    });

    return reply.status(201).send({ slot, message: `Slot ${slot.slotNumber} created successfully.` });
  });

  // PATCH /parking-slots/:id
  fastify.patch('/parking-slots/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id } = request.params as any;
    const parseResult = UpdateSlotSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid update body' });
    }

    const { isActive, parkingType, zone, floor, forceRelease, reason } = parseResult.data;

    const slot = await prisma.parkingSlot.findFirst({
      where: { id, societyId: user.societyId },
      include: { sessions: { where: { status: 'ACTIVE' } } },
    });

    if (!slot) {
      return reply.status(404).send({ error: 'Slot not found' });
    }

    // Administrative Force Release override
    if (forceRelease) {
      if (!reason || reason.trim().length < 3) {
        return reply.status(400).send({ error: 'A mandatory reason is required for administrative slot override.' });
      }

      await prisma.$transaction(async (tx) => {
        // Complete any active session
        await tx.parkingSession.updateMany({
          where: { parkingSlotId: slot.id, status: 'ACTIVE' },
          data: {
            status: 'RESOLVED',
            actualExitTime: new Date(),
          },
        });

        // Release any active reservation
        await tx.parkingReservation.updateMany({
          where: { parkingSlotId: slot.id, status: 'ACTIVE' },
          data: { status: 'RELEASED' },
        });

        // Update pass status
        if (slot.sessions.length > 0) {
          await tx.visitorPass.updateMany({
            where: { parkingSlotId: slot.id, status: 'CHECKED_IN' },
            data: { status: 'CHECKED_OUT' },
          });
        }
      });

      await AuditService.log({
        societyId: user.societyId,
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        action: 'SLOT_FORCE_RELEASED',
        entityType: 'PARKING_SLOT',
        entityId: slot.id,
        reason,
        metadata: { slotNumber: slot.slotNumber },
      });

      return reply.send({ message: `Slot ${slot.slotNumber} has been forcefully released by administrator.` });
    }

    // Standard update (toggle active, change type, etc.)
    const updated = await prisma.parkingSlot.update({
      where: { id },
      data: {
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
        ...(parkingType ? { parkingType } : {}),
        ...(zone ? { zone } : {}),
        ...(floor ? { floor } : {}),
      },
    });

    await AuditService.log({
      societyId: user.societyId,
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'SLOT_UPDATED',
      entityType: 'PARKING_SLOT',
      entityId: slot.id,
      reason,
      metadata: { changes: { isActive, parkingType, zone, floor } },
    });

    return reply.send({ slot: updated, message: 'Parking slot updated successfully.' });
  });

  // GET /visitor-records
  fastify.get('/visitor-records', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const query = request.query as any;

    const where: any = {
      societyId: user.societyId,
    };

    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
    }
    if (query.search) {
      const q = query.search.trim();
      where.OR = [
        { visitorName: { contains: q } },
        { vehicleNumber: { contains: q.toUpperCase() } },
        { passCode: { contains: q.toUpperCase() } },
      ];
    }
    if (query.towerId) {
      where.resident = { flat: { towerId: query.towerId } };
    }

    const passes = await prisma.visitorPass.findMany({
      where,
      include: {
        parkingSlot: true,
        resident: {
          include: {
            flat: { include: { tower: true } },
          },
        },
        sessions: {
          include: {
            guardEntry: { select: { name: true } },
            guardExit: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(query.limit || '100', 10),
    });

    // Check if CSV format is requested
    if (query.format === 'csv') {
      const headers = ['Pass ID,Visitor Name,Visitor Phone,Vehicle Number,Vehicle Type,Tower,Flat,Resident,Parking Slot,Valid From,Valid Until,Status,Entry Time,Exit Time'];
      const rows = passes.map((p) => {
        const session = p.sessions[0];
        const entryStr = session?.actualEntryTime ? new Date(session.actualEntryTime).toISOString() : '';
        const exitStr = session?.actualExitTime ? new Date(session.actualExitTime).toISOString() : '';
        return [
          p.passCode,
          `"${p.visitorName.replace(/"/g, '""')}"`,
          p.visitorPhone || '',
          p.vehicleNumber,
          p.vehicleType,
          p.resident.flat?.tower.name || '',
          p.resident.flat?.flatNumber || '',
          `"${p.resident.name.replace(/"/g, '""')}"`,
          p.parkingSlot.slotNumber,
          p.validFrom.toISOString(),
          p.validUntil.toISOString(),
          p.status,
          entryStr,
          exitStr,
        ].join(',');
      });

      const csvContent = headers.concat(rows).join('\n');
      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', `attachment; filename="parkpass_visitor_records_${Date.now()}.csv"`);
      return reply.send(csvContent);
    }

    return reply.send({ passes });
  });

  // GET /society-config
  fastify.get('/society-config', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const society = await prisma.society.findUnique({
      where: { id: user.societyId },
      include: {
        towers: { include: { flats: true } },
        gates: true,
      },
    });

    if (!society) {
      return reply.status(404).send({ error: 'Society not found' });
    }

    return reply.send({
      society: {
        id: society.id,
        name: society.name,
        address: society.address,
        timezone: society.timezone,
        configuration: JSON.parse(society.configuration || '{}'),
        towers: society.towers,
        gates: society.gates,
      },
    });
  });

  // PATCH /society-config
  fastify.patch('/society-config', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const parseResult = SocietyConfigSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid configuration data' });
    }

    const { name, address, timezone, configuration } = parseResult.data;

    const existing = await prisma.society.findUnique({ where: { id: user.societyId } });
    if (!existing) {
      return reply.status(404).send({ error: 'Society not found' });
    }

    let mergedConfig = JSON.parse(existing.configuration || '{}');
    if (configuration) {
      mergedConfig = { ...mergedConfig, ...configuration };
    }

    const updated = await prisma.society.update({
      where: { id: user.societyId },
      data: {
        ...(name ? { name } : {}),
        ...(address ? { address } : {}),
        ...(timezone ? { timezone } : {}),
        configuration: JSON.stringify(mergedConfig),
      },
    });

    await AuditService.log({
      societyId: user.societyId,
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'SOCIETY_CONFIG_UPDATED',
      entityType: 'SOCIETY',
      entityId: user.societyId,
      metadata: { name, address, timezone, configuration: mergedConfig },
    });

    return reply.send({
      message: 'Society configuration updated successfully',
      society: {
        id: updated.id,
        name: updated.name,
        address: updated.address,
        timezone: updated.timezone,
        configuration: mergedConfig,
      },
    });
  });

  // GET /audit-logs
  fastify.get('/audit-logs', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const logs = await prisma.auditLog.findMany({
      where: { societyId: user.societyId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return reply.send({ logs });
  });

  // GET /users
  fastify.get('/users', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const users = await prisma.user.findMany({
      where: { societyId: user.societyId },
      include: {
        flat: { include: { tower: true } },
      },
      orderBy: { role: 'asc' },
    });

    return reply.send({
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        phone: u.phone,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        flatNumber: u.flat?.flatNumber,
        towerName: u.flat?.tower?.name,
        createdAt: u.createdAt,
      })),
    });
  });

  // POST /users
  fastify.post('/users', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const parseResult = CreateUserSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid user data', details: parseResult.error.flatten() });
    }

    const data = parseResult.data;
    const existing = await prisma.user.findFirst({
      where: { societyId: user.societyId, phone: data.phone },
    });

    if (existing) {
      return reply.status(409).send({ error: 'A user with this phone number already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const newUser = await prisma.user.create({
      data: {
        societyId: user.societyId,
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        role: data.role,
        flatId: data.flatId || null,
        passwordHash,
      },
    });

    await AuditService.log({
      societyId: user.societyId,
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'USER_CREATED',
      entityType: 'USER',
      entityId: newUser.id,
      metadata: { name: newUser.name, phone: newUser.phone, role: newUser.role },
    });

    return reply.status(201).send({
      message: `${data.role} account created successfully.`,
      user: {
        id: newUser.id,
        name: newUser.name,
        phone: newUser.phone,
        role: newUser.role,
      },
    });
  });

  // GET /flats
  fastify.get('/flats', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const flats = await prisma.flat.findMany({
      where: { societyId: user.societyId },
      include: {
        tower: true,
        residents: { select: { id: true, name: true, phone: true } },
      },
      orderBy: [{ towerId: 'asc' }, { flatNumber: 'asc' }],
    });

    return reply.send({ flats });
  });
}
