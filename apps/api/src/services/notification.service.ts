import { prisma } from '../prisma';
import { config } from '../config';

export interface NotificationPayload {
  societyId: string;
  userId: string;
  title: string;
  message: string;
  type: 'ENTRY' | 'EXIT' | 'WALK_IN_APPROVAL' | 'OVERSTAY' | 'SYSTEM';
  metadata?: Record<string, any>;
}

export class NotificationService {
  /**
   * Send in-app notification and record in DB
   */
  static async send(payload: NotificationPayload) {
    try {
      const notification = await prisma.notification.create({
        data: {
          societyId: payload.societyId,
          userId: payload.userId,
          title: payload.title,
          message: payload.message,
          type: payload.type,
          metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
        },
      });

      console.log(`[Notification Engine - DEV MODE] Sent to User ${payload.userId}: [${payload.type}] ${payload.title} - ${payload.message}`);
      return notification;
    } catch (err) {
      console.error('Failed to create notification:', err);
    }
  }

  /**
   * Generate WhatsApp share link with prefilled text and public pass URL
   */
  static generateWhatsAppLink(details: {
    visitorName: string;
    vehicleNumber: string;
    societyName: string;
    towerName: string;
    flatNumber: string;
    slotNumber: string;
    arrivalStr: string;
    validUntilStr: string;
    secureToken: string;
    visitorPhone?: string | null;
  }) {
    const passUrl = `${config.publicAppUrl}/pass/${details.secureToken}`;

    const text = `Hi ${details.visitorName},

Your visitor parking pass for ${details.societyName} is ready!

Vehicle: ${details.vehicleNumber}
Destination: ${details.towerName}, Flat ${details.flatNumber}
Assigned Slot: ${details.slotNumber}
Expected Arrival: ${details.arrivalStr}
Valid Until: ${details.validUntilStr}

Please show this digital pass & QR code to security at the gate:
${passUrl}

Important: Please park only in your assigned slot.`;

    const encodedText = encodeURIComponent(text);
    const cleanPhone = details.visitorPhone ? details.visitorPhone.replace(/[^0-9]/g, '') : '';
    const phoneParam = cleanPhone ? `phone=${cleanPhone}&` : '';

    return `https://api.whatsapp.com/send?${phoneParam}text=${encodedText}`;
  }
}
