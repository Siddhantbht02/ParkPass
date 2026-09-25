import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../prisma';
import { WaitlistService } from '../services/waitlist.service';

export async function visitorRoutes(fastify: FastifyInstance) {
  // Public GET pass by secure token
  fastify.get('/pass/:token', async (request: FastifyRequest, reply: FastifyReply) => {
    const { token } = request.params as any;

    if (!token || typeof token !== 'string') {
      return reply.status(400).send({ error: 'Pass token required' });
    }

    const pass = await prisma.visitorPass.findUnique({
      where: { secureToken: token },
      include: {
        society: {
          select: {
            name: true,
            address: true,
            timezone: true,
          },
        },
        parkingSlot: {
          select: {
            slotNumber: true,
            zone: true,
            floor: true,
            parkingType: true,
          },
        },
        resident: {
          select: {
            name: true,
            flat: {
              select: {
                flatNumber: true,
                tower: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!pass) {
      return reply.status(404).send({ error: 'Visitor pass not found or invalid link' });
    }

    // Return sanitized public pass DTO
    return reply.send({
      pass: {
        id: pass.id,
        passCode: pass.passCode,
        secureToken: pass.secureToken,
        visitorName: pass.visitorName,
        vehicleNumber: pass.vehicleNumber,
        vehicleType: pass.vehicleType,
        visitorCategory: pass.visitorCategory,
        societyName: pass.society.name,
        societyAddress: pass.society.address,
        towerName: pass.resident.flat?.tower.name || 'Tower',
        flatNumber: pass.resident.flat?.flatNumber || '',
        residentName: pass.resident.name,
        slotNumber: pass.parkingSlot.slotNumber,
        slotZone: pass.parkingSlot.zone,
        slotFloor: pass.parkingSlot.floor,
        validFrom: pass.validFrom,
        validUntil: pass.validUntil,
        durationHours: pass.durationHours,
        status: pass.status,
        arrivalStatus: pass.arrivalStatus,
        etaMinutes: pass.etaMinutes,
        etaArrivalTime: pass.etaArrivalTime,
        arrivalNotes: pass.arrivalNotes,
        lastCoordination: pass.lastCoordination,
        createdAt: pass.createdAt,
      },
    });
  });

  // Public POST arrival coordination update ("I'm on my way" / "I've arrived" / "Delayed")
  fastify.post('/pass/:token/arrival-status', async (request: FastifyRequest, reply: FastifyReply) => {
    const { token } = request.params as any;
    const { status, etaMinutes, notes } = (request.body as any) || {};

    if (!status || !['ON_THE_WAY', 'ARRIVED', 'DELAYED'].includes(status)) {
      return reply.status(400).send({
        error: 'Invalid status. Must be ON_THE_WAY, ARRIVED, or DELAYED',
      });
    }

    const pass = await prisma.visitorPass.findUnique({
      where: { secureToken: token },
      include: {
        parkingSlot: true,
        resident: true,
        society: true,
      },
    });

    if (!pass) {
      return reply.status(404).send({ error: 'Visitor pass not found' });
    }

    if (pass.status !== 'SCHEDULED' && pass.status !== 'CHECKED_IN') {
      return reply.status(400).send({ error: `Cannot coordinate for pass that is ${pass.status.toLowerCase()}` });
    }

    const now = new Date();
    const minutes = typeof etaMinutes === 'number' ? etaMinutes : 15;
    const etaArrivalTime = status === 'ARRIVED' ? now : new Date(now.getTime() + minutes * 60 * 1000);

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.visitorPass.update({
        where: { id: pass.id },
        data: {
          arrivalStatus: status,
          etaMinutes: status === 'ARRIVED' ? 0 : minutes,
          etaArrivalTime,
          arrivalNotes: notes || null,
          lastCoordination: now,
        },
      });

      // Record visit event
      await tx.visitEvent.create({
        data: {
          societyId: pass.societyId,
          passId: pass.id,
          eventType: 'COORDINATION_UPDATE',
          metadata: JSON.stringify({
            status,
            etaMinutes: minutes,
            etaArrivalTime,
            notes,
          }),
        },
      });

      // Notify resident
      let title = '';
      let message = '';
      if (status === 'ARRIVED') {
        title = '📍 Visitor Arrived at Gate';
        message = `${pass.visitorName} (${pass.vehicleNumber}) has arrived at the security gate! Reserved bay: ${pass.parkingSlot.slotNumber}.`;
      } else if (status === 'ON_THE_WAY') {
        title = '🚗 Visitor is On The Way';
        message = `${pass.visitorName} (${pass.vehicleNumber}) confirmed they are on their way! Estimated arrival in ~${minutes} mins. Bay: ${pass.parkingSlot.slotNumber}.`;
      } else {
        title = '⏱️ Visitor Arrival Delayed';
        message = `${pass.visitorName} (${pass.vehicleNumber}) reported a delay (~${minutes} mins). Parking reservation remains safe.`;
      }

      await tx.notification.create({
        data: {
          societyId: pass.societyId,
          userId: pass.residentId,
          title,
          message,
          type: 'ARRIVAL_UPDATE',
          metadata: JSON.stringify({
            passId: pass.id,
            status,
            etaMinutes: minutes,
            slotNumber: pass.parkingSlot.slotNumber,
          }),
        },
      });

      return p;
    });

    return reply.send({
      success: true,
      message:
        status === 'ARRIVED'
          ? 'Arrival confirmed! Security has been notified of your presence at the gate.'
          : `ETA updated. Resident and security notified (~${minutes} mins).`,
      pass: {
        arrivalStatus: updated.arrivalStatus,
        etaMinutes: updated.etaMinutes,
        etaArrivalTime: updated.etaArrivalTime,
        lastCoordination: updated.lastCoordination,
      },
    });
  });

  // Public POST cancel pass by secure token
  fastify.post('/pass/:token/cancel', async (request: FastifyRequest, reply: FastifyReply) => {
    const { token } = request.params as any;

    const pass = await prisma.visitorPass.findUnique({
      where: { secureToken: token },
      include: { parkingSlot: true, resident: true },
    });

    if (!pass) {
      return reply.status(404).send({ error: 'Visitor pass not found' });
    }

    if (pass.status === 'CHECKED_IN') {
      return reply.status(400).send({ error: 'Cannot cancel active parked session. Please contact security at the gate.' });
    }

    if (pass.status !== 'SCHEDULED') {
      return reply.status(400).send({ error: `Pass is already ${pass.status.toLowerCase()}` });
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
          societyId: pass.societyId,
          passId: pass.id,
          eventType: 'PASS_CANCELLED',
          metadata: JSON.stringify({ cancelledVia: 'Public ticket page' }),
        },
      });

      await tx.notification.create({
        data: {
          societyId: pass.societyId,
          userId: pass.residentId,
          title: 'Visitor Pass Cancelled',
          message: `Visitor pass for ${pass.visitorName} (${pass.vehicleNumber}) was cancelled. Slot ${pass.parkingSlot.slotNumber} has been released.`,
          type: 'INFO',
        },
      });
    });

    // Automatically check and promote waitlist
    WaitlistService.checkAndPromoteWaitlist(pass.societyId, pass.vehicleType).catch(console.error);

    return reply.send({
      success: true,
      message: `Pass cancelled successfully. Slot ${pass.parkingSlot.slotNumber} has been freed.`,
    });
  });

  // POST release reservation if no-show beyond arrival grace window (Smart Rule)
  fastify.post('/pass/:token/check-no-show', async (request: FastifyRequest, reply: FastifyReply) => {
    const { token } = request.params as any;

    const pass = await prisma.visitorPass.findUnique({
      where: { secureToken: token },
      include: { parkingSlot: true, resident: true },
    });

    if (!pass || pass.status !== 'SCHEDULED') {
      return reply.status(400).send({ error: 'Pass not eligible for no-show release' });
    }

    const now = new Date();
    // Use etaArrivalTime if available, else validFrom + 45 minutes grace period
    const arrivalDeadline = pass.etaArrivalTime
      ? new Date(pass.etaArrivalTime.getTime() + 30 * 60 * 1000)
      : new Date(pass.validFrom.getTime() + 45 * 60 * 1000);

    if (now < arrivalDeadline) {
      return reply.send({
        released: false,
        message: 'Pass is still within arrival window.',
        deadline: arrivalDeadline,
      });
    }

    // Release reservation due to no-show
    await prisma.$transaction(async (tx) => {
      await tx.visitorPass.update({
        where: { id: pass.id },
        data: {
          status: 'EXPIRED',
          arrivalStatus: 'NO_SHOW',
        },
      });

      await tx.parkingReservation.updateMany({
        where: { passId: pass.id, status: 'ACTIVE' },
        data: { status: 'EXPIRED' },
      });

      await tx.visitEvent.create({
        data: {
          societyId: pass.societyId,
          passId: pass.id,
          eventType: 'RESERVATION_AUTO_RELEASED',
          metadata: JSON.stringify({ reason: 'Arrival window expired with no-show' }),
        },
      });

      await tx.notification.create({
        data: {
          societyId: pass.societyId,
          userId: pass.residentId,
          title: 'Reservation Released (No-Show)',
          message: `Visitor pass for ${pass.visitorName} (${pass.vehicleNumber}) was automatically released after exceeding the arrival grace window. Slot ${pass.parkingSlot.slotNumber} was freed for others.`,
          type: 'INFO',
        },
      });
    });

    // Free slot -> promote waitlist!
    WaitlistService.checkAndPromoteWaitlist(pass.societyId, pass.vehicleType).catch(console.error);

    return reply.send({
      released: true,
      message: `Reservation released due to no-show. Slot ${pass.parkingSlot.slotNumber} freed.`,
    });
  });
}
