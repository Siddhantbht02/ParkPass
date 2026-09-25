import { z } from 'zod';

export enum UserRole {
  RESIDENT = 'RESIDENT',
  GUARD = 'GUARD',
  ADMIN = 'ADMIN',
}

export enum PassStatus {
  SCHEDULED = 'SCHEDULED',
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  REVOKED = 'REVOKED',
}

export enum SlotStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  OCCUPIED = 'OCCUPIED',
  BLOCKED = 'BLOCKED',
}

export enum VehicleType {
  TWO_WHEELER = 'TWO_WHEELER',
  CAR = 'CAR',
  SUV = 'SUV',
  OTHER = 'OTHER',
}

export enum VisitorCategory {
  GUEST = 'GUEST',
  RELATIVE = 'RELATIVE',
  FRIEND = 'FRIEND',
  CAB = 'CAB',
  SERVICE = 'SERVICE',
  OTHER = 'OTHER',
}

export enum EventType {
  PASS_CREATED = 'PASS_CREATED',
  ENTRY_ATTEMPTED = 'ENTRY_ATTEMPTED',
  ENTRY_CONFIRMED = 'ENTRY_CONFIRMED',
  ENTRY_REJECTED = 'ENTRY_REJECTED',
  OVERSTAY_DETECTED = 'OVERSTAY_DETECTED',
  EXIT_CONFIRMED = 'EXIT_CONFIRMED',
  PASS_CANCELLED = 'PASS_CANCELLED',
  PASS_REVOKED = 'PASS_REVOKED',
  PASS_EXTENDED = 'PASS_EXTENDED',
  WALK_IN_REQUESTED = 'WALK_IN_REQUESTED',
  WALK_IN_APPROVED = 'WALK_IN_APPROVED',
}

export enum NotificationType {
  ENTRY = 'ENTRY',
  EXIT = 'EXIT',
  WALK_IN_APPROVAL = 'WALK_IN_APPROVAL',
  OVERSTAY = 'OVERSTAY',
  SYSTEM = 'SYSTEM',
}

// Indian vehicle registration normalization and validation
export function normalizeVehicleNumber(vehicleNo: string): string {
  return vehicleNo.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

export function formatVehicleNumber(vehicleNo: string): string {
  const clean = normalizeVehicleNumber(vehicleNo);
  // Match standard Indian format like MH12AB1122 -> MH 12 AB 1122
  const standardMatch = clean.match(/^([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{1,4})$/);
  if (standardMatch) {
    return `${standardMatch[1]} ${standardMatch[2]} ${standardMatch[3]} ${standardMatch[4]}`;
  }
  // Bharat Series like 22BH1234AA -> 22 BH 1234 AA
  const bhMatch = clean.match(/^(\d{2})(BH)(\d{1,4})([A-Z]{1,2})$/);
  if (bhMatch) {
    return `${bhMatch[1]} ${bhMatch[2]} ${bhMatch[3]} ${bhMatch[4]}`;
  }
  return clean;
}

export const VehicleNumberSchema = z.string()
  .min(4, 'Vehicle number must be at least 4 characters')
  .max(15, 'Vehicle number is too long')
  .transform((val) => normalizeVehicleNumber(val));

export const CreateVisitorPassSchema = z.object({
  visitorName: z.string().min(2, 'Visitor name must be at least 2 characters'),
  visitorPhone: z.string().optional().nullable(),
  visitorCategory: z.nativeEnum(VisitorCategory).default(VisitorCategory.GUEST),
  vehicleNumber: VehicleNumberSchema,
  vehicleType: z.nativeEnum(VehicleType).default(VehicleType.CAR),
  vehicleDescription: z.string().optional().nullable(),
  validFrom: z.string().datetime({ message: 'Valid from must be an ISO 8601 datetime' }),
  durationHours: z.number().min(1).max(72),
  preferredSlotId: z.string().optional().nullable(),
});

export type CreateVisitorPassInput = z.infer<typeof CreateVisitorPassSchema>;

export const WalkInPassSchema = z.object({
  visitorName: z.string().min(2, 'Visitor name must be at least 2 characters'),
  visitorPhone: z.string().optional().nullable(),
  visitorCategory: z.nativeEnum(VisitorCategory).default(VisitorCategory.GUEST),
  vehicleNumber: VehicleNumberSchema,
  vehicleType: z.nativeEnum(VehicleType).default(VehicleType.CAR),
  flatId: z.string().min(1, 'Target flat is required'),
  durationHours: z.number().min(1).max(24).default(4),
  gateId: z.string().optional().nullable(),
});

export type WalkInPassInput = z.infer<typeof WalkInPassSchema>;

export const LoginSchema = z.object({
  identifier: z.string().min(3, 'Phone or email is required'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export interface PublicPassDTO {
  passCode: string;
  secureToken: string;
  visitorName: string;
  vehicleNumber: string;
  vehicleType: VehicleType;
  visitorCategory: VisitorCategory;
  societyName: string;
  societyAddress: string;
  towerName: string;
  flatNumber: string;
  slotNumber: string;
  validFrom: string;
  validUntil: string;
  durationHours: number;
  status: PassStatus;
  createdAt: string;
}

export interface VerificationResultDTO {
  isValid: boolean;
  code: string;
  message: string;
  pass?: {
    id: string;
    passCode: string;
    visitorName: string;
    visitorPhone?: string | null;
    vehicleNumber: string;
    vehicleType: VehicleType;
    visitorCategory: VisitorCategory;
    towerName: string;
    flatNumber: string;
    residentName: string;
    slotId: string;
    slotNumber: string;
    validFrom: string;
    validUntil: string;
    status: PassStatus;
  };
}
