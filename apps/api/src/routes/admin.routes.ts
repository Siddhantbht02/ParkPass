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

const UpdateCapacitySchema = z.object({
  carSlots: z.number().int().min(0).max(500),
  twoWheelerSlots: z.number().int().min(0).max(500),
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

const UpdateUserSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(10).optional(),
  email: z.string().email().optional().nullable(),
  flatId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
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
      allSocietySlots,
      activeSessions,
      todayEntries,
      todayExits,
      activeReservations,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.flat.count({ where: { societyId: user.societyId } }),
      prisma.parkingSlot.findMany({
        where: { societyId: user.societyId },
        include: {
          sessions: { where: { status: 'ACTIVE' } },
        },
      }),
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
      prisma.auditLog.findMany({
        where: { societyId: user.societyId },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
    ]);

    const totalSlots = allSocietySlots.length;
    const blockedSlots = allSocietySlots.filter((s) => !s.isActive).length;
    const carSlotsList = allSocietySlots.filter((s) => s.parkingType !== 'TWO_WHEELER');
    const bikeSlotsList = allSocietySlots.filter((s) => s.parkingType === 'TWO_WHEELER');

    const carTotal = carSlotsList.length;
    const carOccupied = carSlotsList.filter((s) => s.sessions.length > 0).length;
    const carBlocked = carSlotsList.filter((s) => !s.isActive).length;
    const carAvailable = Math.max(0, carTotal - carOccupied - carBlocked);

    const bikeTotal = bikeSlotsList.length;
    const bikeOccupied = bikeSlotsList.filter((s) => s.sessions.length > 0).length;
    const bikeBlocked = bikeSlotsList.filter((s) => !s.isActive).length;
    const bikeAvailable = Math.max(0, bikeTotal - bikeOccupied - bikeBlocked);

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
        carSlots: {
          total: carTotal,
          occupied: carOccupied,
          available: carAvailable,
          blocked: carBlocked,
        },
        twoWheelerSlots: {
          total: bikeTotal,
          occupied: bikeOccupied,
          available: bikeAvailable,
          blocked: bikeBlocked,
        },
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

  // POST /parking-capacity - modify number of car and two-wheeler spaces
  fastify.post('/parking-capacity', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const parseResult = UpdateCapacitySchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid capacity parameters. Numbers between 0 and 500 required.' });
    }

    const { carSlots: targetCar, twoWheelerSlots: targetBike } = parseResult.data;

    const allSlots = await prisma.parkingSlot.findMany({
      where: { societyId: user.societyId },
      include: {
        sessions: { where: { status: 'ACTIVE' } },
        reservations: { where: { status: 'ACTIVE' } },
      },
      orderBy: { slotNumber: 'asc' },
    });

    const currentCarSlots = allSlots.filter((s) => s.parkingType !== 'TWO_WHEELER');
    const currentBikeSlots = allSlots.filter((s) => s.parkingType === 'TWO_WHEELER');

    let carsAdded = 0;
    let carsRemoved = 0;
    let bikesAdded = 0;
    let bikesRemoved = 0;
    const warningMessages: string[] = [];

    // Set of uppercase slot numbers to prevent duplicate collisions
    const existingSlotNumbers = new Set(allSlots.map((s) => s.slotNumber.toUpperCase()));

    const getNextSlotNumber = (prefix: string) => {
      let num = 1;
      while (existingSlotNumbers.has(`${prefix}-${num.toString().padStart(2, '0')}`)) {
        num++;
      }
      const newSlot = `${prefix}-${num.toString().padStart(2, '0')}`;
      existingSlotNumbers.add(newSlot);
      return newSlot;
    };

    // 1. Adjust Car Slots
    if (targetCar > currentCarSlots.length) {
      const diff = targetCar - currentCarSlots.length;
      for (let i = 0; i < diff; i++) {
        const slotNumber = getNextSlotNumber('V');
        await prisma.parkingSlot.create({
          data: {
            societyId: user.societyId,
            slotNumber,
            parkingType: 'CAR',
            zone: 'Basement 1',
            floor: 'B1',
            isActive: true,
          },
        });
        carsAdded++;
      }
    } else if (targetCar < currentCarSlots.length) {
      const toRemove = currentCarSlots.length - targetCar;
      const removable = currentCarSlots
        .filter((s) => s.sessions.length === 0 && s.reservations.length === 0)
        .sort((a, b) => b.slotNumber.localeCompare(a.slotNumber, undefined, { numeric: true }));

      const toDelete = removable.slice(0, toRemove);
      if (toDelete.length > 0) {
        await prisma.parkingSlot.deleteMany({
          where: { id: { in: toDelete.map((s) => s.id) } },
        });
        carsRemoved = toDelete.length;
      }
      if (carsRemoved < toRemove) {
        warningMessages.push(
          `Could only remove ${carsRemoved} car spaces. ${toRemove - carsRemoved} spaces are currently occupied or reserved.`
        );
      }
    }

    // 2. Adjust Two-Wheeler Slots
    if (targetBike > currentBikeSlots.length) {
      const diff = targetBike - currentBikeSlots.length;
      for (let i = 0; i < diff; i++) {
        const slotNumber = getNextSlotNumber('TW');
        await prisma.parkingSlot.create({
          data: {
            societyId: user.societyId,
            slotNumber,
            parkingType: 'TWO_WHEELER',
            zone: 'Tower A Ground',
            floor: 'G',
            isActive: true,
          },
        });
        bikesAdded++;
      }
    } else if (targetBike < currentBikeSlots.length) {
      const toRemove = currentBikeSlots.length - targetBike;
      const removable = currentBikeSlots
        .filter((s) => s.sessions.length === 0 && s.reservations.length === 0)
        .sort((a, b) => b.slotNumber.localeCompare(a.slotNumber, undefined, { numeric: true }));

      const toDelete = removable.slice(0, toRemove);
      if (toDelete.length > 0) {
        await prisma.parkingSlot.deleteMany({
          where: { id: { in: toDelete.map((s) => s.id) } },
        });
        bikesRemoved = toDelete.length;
      }
      if (bikesRemoved < toRemove) {
        warningMessages.push(
          `Could only remove ${bikesRemoved} two-wheeler spaces. ${toRemove - bikesRemoved} spaces are currently occupied or reserved.`
        );
      }
    }

    await AuditService.log({
      societyId: user.societyId,
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'CAPACITY_CONFIGURED',
      entityType: 'PARKING_SLOT',
      entityId: user.societyId,
      metadata: {
        targetCar,
        targetBike,
        carsAdded,
        carsRemoved,
        bikesAdded,
        bikesRemoved,
      },
    });

    const finalSlots = await prisma.parkingSlot.findMany({
      where: { societyId: user.societyId },
      include: {
        sessions: { where: { status: 'ACTIVE' } },
      },
    });

    const finalCarCount = finalSlots.filter((s) => s.parkingType !== 'TWO_WHEELER').length;
    const finalBikeCount = finalSlots.filter((s) => s.parkingType === 'TWO_WHEELER').length;

    let message = `Capacity updated: ${finalCarCount} Car bays, ${finalBikeCount} Two-Wheeler bays.`;
    if (warningMessages.length > 0) {
      message += ' Note: ' + warningMessages.join(' ');
    }

    return reply.send({
      success: true,
      message,
      carSlots: finalCarCount,
      twoWheelerSlots: finalBikeCount,
      totalSlots: finalSlots.length,
      warnings: warningMessages,
    });
  });

  // DELETE /parking-slots/:id
  fastify.delete('/parking-slots/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id } = request.params as any;

    const slot = await prisma.parkingSlot.findFirst({
      where: { id, societyId: user.societyId },
      include: {
        sessions: { where: { status: 'ACTIVE' } },
        reservations: { where: { status: 'ACTIVE' } },
      },
    });

    if (!slot) {
      return reply.status(404).send({ error: 'Parking slot not found.' });
    }

    if (slot.sessions.length > 0 || slot.reservations.length > 0) {
      return reply.status(400).send({
        error: `Slot ${slot.slotNumber} is currently occupied or reserved. Release it before deleting.`,
      });
    }

    await prisma.parkingSlot.delete({ where: { id } });

    await AuditService.log({
      societyId: user.societyId,
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'SLOT_DELETED',
      entityType: 'PARKING_SLOT',
      entityId: slot.id,
      metadata: { slotNumber: slot.slotNumber, parkingType: slot.parkingType },
    });

    return reply.send({
      success: true,
      message: `Slot ${slot.slotNumber} was deleted successfully.`,
    });
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
        flatId: u.flatId,
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

  // PATCH /users/:id - edit guard or resident settings
  fastify.patch('/users/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id } = request.params as any;
    const parseResult = UpdateUserSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid user data', details: parseResult.error.flatten() });
    }

    const targetUser = await prisma.user.findFirst({
      where: { id, societyId: user.societyId },
    });

    if (!targetUser) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const { name, phone, email, flatId, isActive, password } = parseResult.data;

    // Check duplicate phone if phone is being changed
    if (phone && phone !== targetUser.phone) {
      const existing = await prisma.user.findFirst({
        where: { societyId: user.societyId, phone, id: { not: id } },
      });
      if (existing) {
        return reply.status(409).send({ error: 'Another user already has this phone number' });
      }
    }

    let passwordHash: string | undefined = undefined;
    if (password && password.trim().length >= 6) {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(password.trim(), salt);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(phone ? { phone: phone.trim() } : {}),
        ...(email !== undefined ? { email: email ? email.trim() : null } : {}),
        ...(flatId !== undefined ? { flatId } : {}),
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
        ...(passwordHash ? { passwordHash } : {}),
      },
      include: {
        flat: { include: { tower: true } },
      },
    });

    await AuditService.log({
      societyId: user.societyId,
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'USER_UPDATED',
      entityType: 'USER',
      entityId: updated.id,
      metadata: { role: updated.role, name: updated.name, phone: updated.phone },
    });

    return reply.send({
      message: `${updated.role === 'GUARD' ? 'Guard' : 'Resident'} profile updated successfully.`,
      user: {
        id: updated.id,
        name: updated.name,
        phone: updated.phone,
        email: updated.email,
        role: updated.role,
        isActive: updated.isActive,
        flatId: updated.flatId,
        flatNumber: updated.flat?.flatNumber,
        towerName: updated.flat?.tower?.name,
      },
    });
  });

  // DELETE /users/:id - deactivate guard or resident
  fastify.delete('/users/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id } = request.params as any;

    const targetUser = await prisma.user.findFirst({
      where: { id, societyId: user.societyId },
    });

    if (!targetUser) {
      return reply.status(404).send({ error: 'User not found' });
    }

    if (targetUser.id === user.id) {
      return reply.status(400).send({ error: 'Cannot deactivate your own administrator account.' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    await AuditService.log({
      societyId: user.societyId,
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'USER_DEACTIVATED',
      entityType: 'USER',
      entityId: targetUser.id,
      metadata: { role: targetUser.role, name: targetUser.name },
    });

    return reply.send({
      message: `${targetUser.name} (${targetUser.role}) has been deactivated.`,
      user: updated,
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
