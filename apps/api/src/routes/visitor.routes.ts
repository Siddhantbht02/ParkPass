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
}
