import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../prisma';

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
        createdAt: pass.createdAt,
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

    return reply.send({
      success: true,
      message: `Pass cancelled successfully. Slot ${pass.parkingSlot.slotNumber} has been freed.`,
    });
  });
}
