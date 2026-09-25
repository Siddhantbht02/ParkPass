import crypto from 'crypto';
import { prisma } from '../prisma';
import { AllocationService } from './allocation.service';

export interface AddWaitlistParams {
  societyId: string;
  residentId: string;
  visitorName: string;
  visitorPhone?: string | null;
  vehicleNumber: string;
  vehicleType?: string;
  visitorCategory?: string;
  durationHours?: number;
}

export class WaitlistService {
  /**
   * Add a resident's visitor to the society parking waitlist
   */
  static async addToWaitlist(params: AddWaitlistParams) {
    const {
      societyId,
      residentId,
      visitorName,
      visitorPhone,
      vehicleNumber,
      vehicleType = 'CAR',
      visitorCategory = 'GUEST',
      durationHours = 4,
    } = params;

    const normalizedVehicle = vehicleNumber.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

    // Check if there is already an active waitlist entry for this vehicle
    const existing = await prisma.parkingWaitlist.findFirst({
      where: {
        societyId,
        vehicleNumber: normalizedVehicle,
        status: 'WAITING',
      },
    });

    if (existing) {
      const position = await this.getQueuePosition(existing.id, societyId, existing.vehicleType);
      return {
        entry: existing,
        queuePosition: position,
        message: 'Vehicle is already on the waitlist.',
      };
    }

    const entry = await prisma.parkingWaitlist.create({
      data: {
        societyId,
        residentId,
        visitorName: visitorName.trim(),
        visitorPhone: visitorPhone || null,
        vehicleNumber: normalizedVehicle,
        vehicleType,
        visitorCategory,
        durationHours,
        status: 'WAITING',
      },
      include: {
        resident: {
          select: {
            name: true,
            phone: true,
            flat: {
              select: {
                flatNumber: true,
                tower: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    const queuePosition = await this.getQueuePosition(entry.id, societyId, vehicleType);

    // Notify resident of successful waitlist entry
    await prisma.notification.create({
      data: {
        societyId,
        userId: residentId,
        title: 'Joined Parking Waitlist',
        message: `You are #${queuePosition} in queue for a ${vehicleType} parking slot for ${visitorName} (${normalizedVehicle}). We will notify you immediately when a slot opens!`,
        type: 'SYSTEM',
        metadata: JSON.stringify({ waitlistId: entry.id, queuePosition }),
      },
    });

    return {
      entry,
      queuePosition,
      message: `Successfully joined waitlist. You are #${queuePosition} in queue.`,
    };
  }

  /**
   * Calculate queue position for a waitlist entry
   */
  static async getQueuePosition(waitlistId: string, societyId: string, vehicleType: string): Promise<number> {
    const entry = await prisma.parkingWaitlist.findUnique({
      where: { id: waitlistId },
      select: { createdAt: true },
    });

    if (!entry) return 1;

    const aheadCount = await prisma.parkingWaitlist.count({
      where: {
        societyId,
        vehicleType,
        status: 'WAITING',
        createdAt: { lt: entry.createdAt },
      },
    });

    return aheadCount + 1;
  }

  /**
   * Get active waitlist entries for a resident with live queue position
   */
  static async getResidentWaitlist(residentId: string, societyId: string) {
    const entries = await prisma.parkingWaitlist.findMany({
      where: {
        residentId,
        societyId,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const enriched = await Promise.all(
      entries.map(async (item) => {
        let queuePosition: number | null = null;
        if (item.status === 'WAITING') {
          queuePosition = await this.getQueuePosition(item.id, societyId, item.vehicleType);
        }
        return {
          ...item,
          queuePosition,
        };
      })
    );

    return enriched;
  }

  /**
   * Cancel waitlist entry
   */
  static async cancelWaitlist(id: string, residentId: string) {
    const entry = await prisma.parkingWaitlist.findFirst({
      where: { id, residentId },
    });

    if (!entry) {
      throw new Error('Waitlist entry not found');
    }

    if (entry.status !== 'WAITING') {
      throw new Error(`Cannot cancel entry that is already ${entry.status.toLowerCase()}`);
    }

    const updated = await prisma.parkingWaitlist.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    return updated;
  }

  /**
   * Check and promote eligible waitlist entries when a slot is freed or capacity increases
   */
  static async checkAndPromoteWaitlist(societyId: string, specificVehicleType?: string) {
    const where: any = {
      societyId,
      status: 'WAITING',
    };
    if (specificVehicleType) {
      where.vehicleType = specificVehicleType;
    }

    const waitingEntries = await prisma.parkingWaitlist.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        resident: {
          include: {
            society: true,
            flat: { include: { tower: true } },
          },
        },
      },
    });

    if (waitingEntries.length === 0) {
      return null;
    }

    const now = new Date();
    const promotedResults = [];

    for (const waitlist of waitingEntries) {
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + waitlist.durationHours * 60 * 60 * 1000);

      // Try allocating a slot
      const slot = await AllocationService.allocateSlot({
        societyId,
        vehicleType: waitlist.vehicleType,
        startTime,
        endTime,
      });

      if (!slot) {
        // Still no slot available for this vehicle type, try next or stop
        continue;
      }

      // Slot found! Promote this waitlist item to a confirmed visitor pass
      const secureToken = 'pk_' + crypto.randomBytes(16).toString('hex');
      const passCode = 'PP-' + Math.floor(10000 + Math.random() * 90000);

      const result = await prisma.$transaction(async (tx) => {
        // 1. Create VisitorPass
        const pass = await tx.visitorPass.create({
          data: {
            passCode,
            societyId,
            residentId: waitlist.residentId,
            visitorName: waitlist.visitorName,
            visitorPhone: waitlist.visitorPhone,
            vehicleNumber: waitlist.vehicleNumber,
            vehicleType: waitlist.vehicleType,
            visitorCategory: waitlist.visitorCategory,
            secureToken,
            parkingSlotId: slot.id,
            validFrom: startTime,
            validUntil: endTime,
            durationHours: waitlist.durationHours,
            status: 'SCHEDULED',
            arrivalStatus: 'SCHEDULED',
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

        // 2. Create Reservation
        await tx.parkingReservation.create({
          data: {
            societyId,
            passId: pass.id,
            parkingSlotId: slot.id,
            startTime,
            endTime,
            status: 'ACTIVE',
          },
        });

        // 3. Update Waitlist item
        await tx.parkingWaitlist.update({
          where: { id: waitlist.id },
          data: {
            status: 'ALLOCATED',
            allocatedPassId: pass.id,
            allocatedSlotId: slot.id,
            notifiedAt: now,
          },
        });

        // 4. Record VisitEvent
        await tx.visitEvent.create({
          data: {
            societyId,
            passId: pass.id,
            eventType: 'PASS_CREATED',
            metadata: JSON.stringify({
              source: 'WAITLIST_AUTO_PROMOTION',
              waitlistId: waitlist.id,
              slot: slot.slotNumber,
            }),
          },
        });

        // 5. Notify resident
        await tx.notification.create({
          data: {
            societyId,
            userId: waitlist.residentId,
            title: '🎉 Parking Slot Allocated from Waitlist!',
            message: `A visitor parking slot (${slot.slotNumber}) has opened up and been automatically allocated for your visitor ${waitlist.visitorName} (${waitlist.vehicleNumber})! Valid until ${endTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}.`,
            type: 'WAITLIST_ALLOCATED',
            metadata: JSON.stringify({
              passId: pass.id,
              secureToken: pass.secureToken,
              slotNumber: slot.slotNumber,
              validUntil: endTime,
            }),
          },
        });

        return { pass, slot, waitlist };
      });

      promotedResults.push(result);
    }

    return promotedResults.length > 0 ? promotedResults : null;
  }
}
