import { prisma } from '../prisma';

export interface AllocationOptions {
  societyId: string;
  vehicleType: string; // CAR, TWO_WHEELER, SUV, OTHER
  startTime: Date;
  endTime: Date;
  preferredSlotId?: string | null;
  excludePassId?: string; // in case of extension
}

export class AllocationService {
  /**
   * Check if a given slot is available for a time range
   */
  static async isSlotAvailable(
    slotId: string,
    startTime: Date,
    endTime: Date,
    excludePassId?: string
  ): Promise<boolean> {
    const slot = await prisma.parkingSlot.findUnique({
      where: { id: slotId },
    });

    if (!slot || !slot.isActive) {
      return false;
    }

    // 1. Check if there's currently an ongoing physical session in this slot
    const activeSession = await prisma.parkingSession.findFirst({
      where: {
        parkingSlotId: slotId,
        status: 'ACTIVE',
        ...(excludePassId ? { passId: { not: excludePassId } } : {}),
      },
    });

    if (activeSession) {
      // If currently occupied, it cannot be booked during the immediate window
      const now = new Date();
      if (startTime <= now) {
        return false;
      }
    }

    // 2. Check for overlapping reservations
    // Overlap condition: existing.startTime < requested.endTime AND existing.endTime > requested.startTime
    const overlappingReservation = await prisma.parkingReservation.findFirst({
      where: {
        parkingSlotId: slotId,
        status: 'ACTIVE',
        ...(excludePassId ? { passId: { not: excludePassId } } : {}),
        startTime: {
          lt: endTime,
        },
        endTime: {
          gt: startTime,
        },
      },
    });

    return !overlappingReservation;
  }

  /**
   * Find available slots for a given time window and vehicle type
   */
  static async getAvailableSlots(options: AllocationOptions) {
    const { societyId, vehicleType, startTime, endTime, excludePassId } = options;

    // Get all active slots for the society
    const allSlots = await prisma.parkingSlot.findMany({
      where: {
        societyId,
        isActive: true,
      },
      orderBy: { slotNumber: 'asc' },
    });

    // Find conflicting reservations in this time frame
    const conflictingReservations = await prisma.parkingReservation.findMany({
      where: {
        societyId,
        status: 'ACTIVE',
        ...(excludePassId ? { passId: { not: excludePassId } } : {}),
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      select: { parkingSlotId: true },
    });

    const busySlotIds = new Set<string>(conflictingReservations.map((r) => r.parkingSlotId));

    // Also check currently physically occupied sessions if start time overlaps now
    const now = new Date();
    if (startTime <= now) {
      const activeSessions = await prisma.parkingSession.findMany({
        where: {
          societyId,
          status: 'ACTIVE',
          ...(excludePassId ? { passId: { not: excludePassId } } : {}),
        },
        select: { parkingSlotId: true },
      });
      activeSessions.forEach((s) => busySlotIds.add(s.parkingSlotId));
    }

    // Filter available
    const availableSlots = allSlots.filter((slot) => !busySlotIds.has(slot.id));

    // Sort to prioritize vehicle type match:
    // If TWO_WHEELER: prefer TWO_WHEELER slots
    // If SUV: prefer SUV slots, then CAR
    // If CAR: prefer CAR slots, then SUV
    availableSlots.sort((a, b) => {
      const aMatches = a.parkingType === vehicleType ? 0 : 1;
      const bMatches = b.parkingType === vehicleType ? 0 : 1;
      if (aMatches !== bMatches) return aMatches - bMatches;
      return a.slotNumber.localeCompare(b.slotNumber, undefined, { numeric: true });
    });

    return {
      totalSlots: allSlots.length,
      availableCount: availableSlots.length,
      slots: availableSlots,
    };
  }

  /**
   * Atomically allocate a slot for a reservation
   */
  static async allocateSlot(options: AllocationOptions) {
    const { societyId, preferredSlotId, startTime, endTime, excludePassId } = options;

    // If resident preferred a slot, check that one first
    if (preferredSlotId) {
      const preferredAvailable = await this.isSlotAvailable(
        preferredSlotId,
        startTime,
        endTime,
        excludePassId
      );
      if (preferredAvailable) {
        const slot = await prisma.parkingSlot.findUnique({ where: { id: preferredSlotId } });
        if (slot && slot.societyId === societyId && slot.isActive) {
          return slot;
        }
      }
    }

    // Find all available slots with vehicle preference
    const { slots } = await this.getAvailableSlots(options);
    if (slots.length === 0) {
      return null;
    }

    // Return the best matching available slot
    return slots[0];
  }
}
