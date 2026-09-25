const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding ParkPass database...');

  // Clean existing data
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.visitEvent.deleteMany({});
  await prisma.parkingSession.deleteMany({});
  await prisma.parkingReservation.deleteMany({});
  await prisma.visitorPass.deleteMany({});
  await prisma.parkingSlot.deleteMany({});
  await prisma.gate.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.flat.deleteMany({});
  await prisma.tower.deleteMany({});
  await prisma.society.deleteMany({});

  // 1. Create Society
  const society = await prisma.society.create({
    data: {
      name: 'Skyline Residency',
      address: 'Plot 42, Hiranandani Estate, Powai, Mumbai, Maharashtra 400076',
      timezone: 'Asia/Kolkata',
      configuration: JSON.stringify({
        maxParkingDurationHours: 48,
        residentApprovalRequired: true,
        gracePeriodMinutes: 30,
        entryStartTime: '06:00',
        entryEndTime: '23:00',
        contactDesk: '+91 22 2570 9900'
      }),
    },
  });

  console.log(`Created society: ${society.name} (${society.id})`);

  // 2. Create Towers
  const towerA = await prisma.tower.create({ data: { societyId: society.id, name: 'Tower A' } });
  const towerB = await prisma.tower.create({ data: { societyId: society.id, name: 'Tower B' } });
  const towerC = await prisma.tower.create({ data: { societyId: society.id, name: 'Tower C' } });

  // 3. Create Flats
  const flatA804 = await prisma.flat.create({ data: { societyId: society.id, towerId: towerA.id, flatNumber: 'A-804' } });
  const flatA805 = await prisma.flat.create({ data: { societyId: society.id, towerId: towerA.id, flatNumber: 'A-805' } });
  const flatB402 = await prisma.flat.create({ data: { societyId: society.id, towerId: towerB.id, flatNumber: 'B-402' } });
  const flatC1102 = await prisma.flat.create({ data: { societyId: society.id, towerId: towerC.id, flatNumber: 'C-1102' } });

  // 4. Create Gates
  const mainGate = await prisma.gate.create({ data: { societyId: society.id, name: 'Main Gate' } });
  const serviceGate = await prisma.gate.create({ data: { societyId: society.id, name: 'Service Gate' } });

  // 5. Password hashes
  const salt = await bcrypt.genSalt(10);
  const residentPasswordHash = await bcrypt.hash('password123', salt);
  const adminPasswordHash = await bcrypt.hash('adminpassword123', salt);

  // 6. Create Users
  // Admin
  const admin = await prisma.user.create({
    data: {
      name: 'Society Secretary (Admin)',
      phone: '+919876543200',
      email: 'admin@skylineresidency.in',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      societyId: society.id,
    },
  });

  // Residents
  const residentSiddhant = await prisma.user.create({
    data: {
      name: 'Siddhant',
      phone: '+919876543210',
      email: 'siddhant@example.com',
      passwordHash: residentPasswordHash,
      role: 'RESIDENT',
      societyId: society.id,
      flatId: flatA804.id,
    },
  });

  const residentAarav = await prisma.user.create({
    data: {
      name: 'Aarav Sharma',
      phone: '+919876543211',
      email: 'aarav@example.com',
      passwordHash: residentPasswordHash,
      role: 'RESIDENT',
      societyId: society.id,
      flatId: flatA805.id,
    },
  });

  const residentPriya = await prisma.user.create({
    data: {
      name: 'Priya Patel',
      phone: '+919876543212',
      email: 'priya@example.com',
      passwordHash: residentPasswordHash,
      role: 'RESIDENT',
      societyId: society.id,
      flatId: flatB402.id,
    },
  });

  // Guards
  const guardRajesh = await prisma.user.create({
    data: {
      name: 'Rajesh Kumar (Main Gate)',
      phone: '+919876543220',
      passwordHash: residentPasswordHash,
      role: 'GUARD',
      societyId: society.id,
    },
  });

  const guardVikram = await prisma.user.create({
    data: {
      name: 'Vikram Singh (Service Gate)',
      phone: '+919876543221',
      passwordHash: residentPasswordHash,
      role: 'GUARD',
      societyId: society.id,
    },
  });

  console.log('Created users: 1 Admin, 3 Residents, 2 Guards');

  // 7. Create 20 Parking Slots (V-01 through V-20)
  const slots = [];
  for (let i = 1; i <= 20; i++) {
    const slotNumber = `V-${i.toString().padStart(2, '0')}`;
    let parkingType = 'CAR';
    let zone = 'Basement 1';
    let floor = 'B1';

    if (i > 10) {
      zone = 'Tower A Ground';
      floor = 'G';
    }
    if (i >= 16 && i <= 18) {
      parkingType = 'SUV';
    } else if (i >= 19) {
      parkingType = 'TWO_WHEELER';
    }

    const slot = await prisma.parkingSlot.create({
      data: {
        societyId: society.id,
        slotNumber,
        parkingType,
        zone,
        floor,
      },
    });
    slots.push(slot);
  }
  console.log(`Created ${slots.length} parking slots (V-01 to V-20)`);

  // 8. Seed sample visitor pass for Siddhant (A-804)
  // Expected arrival: 7:00 PM today, 24 hours
  const now = new Date();
  const arrival = new Date(now);
  arrival.setHours(19, 0, 0, 0); // 7:00 PM
  // If 7:00 PM today has already passed, set to today or tomorrow
  const departure = new Date(arrival.getTime() + 24 * 60 * 60 * 1000);

  const slotV12 = slots.find(s => s.slotNumber === 'V-12') || slots[11];
  const secureToken = 'pk_' + crypto.randomBytes(16).toString('hex');
  const passCode = 'PP-' + Math.floor(10000 + Math.random() * 90000);

  const samplePass = await prisma.visitorPass.create({
    data: {
      passCode,
      societyId: society.id,
      residentId: residentSiddhant.id,
      visitorName: 'Siddhant',
      visitorPhone: '+919988776655',
      vehicleNumber: 'MH 12 AB 1122',
      vehicleType: 'CAR',
      visitorCategory: 'GUEST',
      secureToken,
      parkingSlotId: slotV12.id,
      validFrom: arrival,
      validUntil: departure,
      durationHours: 24,
      status: 'SCHEDULED',
    },
  });

  // Create Reservation
  await prisma.parkingReservation.create({
    data: {
      societyId: society.id,
      passId: samplePass.id,
      parkingSlotId: slotV12.id,
      startTime: arrival,
      endTime: departure,
      status: 'ACTIVE',
    },
  });

  // Create VisitEvent
  await prisma.visitEvent.create({
    data: {
      societyId: society.id,
      passId: samplePass.id,
      eventType: 'PASS_CREATED',
      eventTime: new Date(),
      metadata: JSON.stringify({
        createdBy: residentSiddhant.name,
        slot: slotV12.slotNumber,
      }),
    },
  });

  // Create welcome notification
  await prisma.notification.create({
    data: {
      societyId: society.id,
      userId: residentSiddhant.id,
      title: 'Pass Created Successfully',
      message: `Visitor pass for Siddhant (MH 12 AB 1122) reserved at slot ${slotV12.slotNumber}`,
      type: 'SYSTEM',
    },
  });

  console.log(`Sample pass created! Code: ${passCode}, Token: ${secureToken}`);
  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
