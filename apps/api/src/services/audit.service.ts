import { prisma } from '../prisma';

export interface AuditLogOptions {
  societyId: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  reason?: string;
  metadata?: Record<string, any>;
}

export class AuditService {
  static async log(options: AuditLogOptions) {
    try {
      return await prisma.auditLog.create({
        data: {
          societyId: options.societyId,
          actorId: options.actorId,
          actorName: options.actorName,
          actorRole: options.actorRole,
          action: options.action,
          entityType: options.entityType,
          entityId: options.entityId,
          reason: options.reason || null,
          metadata: options.metadata ? JSON.stringify(options.metadata) : null,
        },
      });
    } catch (err) {
      console.error('Failed to create audit log:', err);
    }
  }
}
