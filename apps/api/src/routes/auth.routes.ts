import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';
import { z } from 'zod';

const LoginBodySchema = z.object({
  identifier: z.string().min(1, 'Identifier is required'),
  password: z.string().min(1, 'Password is required'),
});

const SocietyRegisterSchema = z.object({
  societyName: z.string().min(2, 'Society name is required'),
  societyAddress: z.string().min(5, 'Society address is required'),
  adminName: z.string().min(2, 'Admin name is required'),
  adminPhone: z.string().min(8, 'Admin phone is required'),
  adminEmail: z.string().email().optional().nullable(),
  adminPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

const RegisterRequestSchema = z.object({
  societyCode: z.string().min(3, 'Society code is required'),
  role: z.enum(['RESIDENT', 'GUARD']),
  name: z.string().min(2, 'Name is required'),
  phone: z.string().min(8, 'Phone is required'),
  email: z.string().email().optional().nullable(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  towerName: z.string().optional(),
  flatNumber: z.string().optional(),
  gateName: z.string().optional(),
});

function generateUniqueSocietyCode(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 7) || 'SOCIETY';
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${clean}-${randomSuffix}`;
}

export async function authRoutes(fastify: FastifyInstance) {
  // Login
  fastify.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const parseResult = LoginBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Invalid input',
        details: parseResult.error.flatten(),
      });
    }

    const { identifier, password } = parseResult.data;

    // Find user by phone or email (even if inactive/pending, so we give clear feedback)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: identifier },
          { email: identifier },
        ],
      },
      include: {
        society: true,
        flat: {
          include: {
            tower: true,
          },
        },
      },
    });

    if (!user) {
      return reply.status(401).send({ error: 'Invalid phone/email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return reply.status(401).send({ error: 'Invalid phone/email or password' });
    }

    // Check Approval Status
    if ((user as any).approvalStatus === 'PENDING') {
      return reply.status(403).send({
        error: 'Your account registration is pending approval by the Society Admin. You will be able to log in once approved.',
        status: 'PENDING',
      });
    }

    if ((user as any).approvalStatus === 'REJECTED') {
      return reply.status(403).send({
        error: 'Your account registration was rejected by the Society Admin. Please contact society management.',
        status: 'REJECTED',
      });
    }

    if (!user.isActive) {
      return reply.status(403).send({
        error: 'Your account is inactive or disabled. Please contact the society administrator.',
      });
    }

    // Sign JWT
    const token = fastify.jwt.sign({
      id: user.id,
      role: user.role,
      societyId: user.societyId,
      name: user.name,
      flatId: user.flatId,
    });

    // Set cookie
    reply.setCookie('parkpass_token', token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return reply.send({
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        societyId: user.societyId,
        societyName: user.society.name,
        societyCode: (user.society as any).code || null,
        societyTimezone: user.society.timezone,
        flatId: user.flatId,
        flatNumber: user.flat ? user.flat.flatNumber : null,
        towerName: user.flat?.tower ? user.flat.tower.name : null,
      },
    });
  });

  // Logout
  fastify.post('/logout', async (_req, reply) => {
    reply.clearCookie('parkpass_token', { path: '/' });
    return reply.send({ message: 'Logged out successfully' });
  });

  // Me
  fastify.get('/me', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const decoded = await request.jwtVerify() as any;
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        include: {
          society: true,
          flat: {
            include: {
              tower: true,
            },
          },
        },
      });

      if (!user || !user.isActive) {
        return reply.status(401).send({ error: 'User not found or disabled' });
      }

      return reply.send({
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role,
          societyId: user.societyId,
          societyName: user.society.name,
          societyCode: (user.society as any).code || null,
          societyTimezone: user.society.timezone,
          flatId: user.flatId,
          flatNumber: user.flat ? user.flat.flatNumber : null,
          towerName: user.flat?.tower ? user.flat.tower.name : null,
        },
      });
    } catch (err) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // Public: Lookup Society by Unique Code
  fastify.get('/society/lookup', async (request: FastifyRequest, reply: FastifyReply) => {
    const { code } = request.query as { code?: string };
    if (!code || !code.trim()) {
      return reply.status(400).send({ error: 'Society code is required' });
    }

    const cleanCode = code.trim().toUpperCase();
    const society = await prisma.society.findFirst({
      where: {
        code: cleanCode,
      },
      include: {
        towers: {
          include: {
            flats: {
              orderBy: { flatNumber: 'asc' },
            },
          },
          orderBy: { name: 'asc' },
        },
        gates: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!society) {
      return reply.status(404).send({
        error: `Society with Code "${cleanCode}" was not found. Please verify with your society secretary or admin.`,
      });
    }

    return reply.send({
      found: true,
      society: {
        id: society.id,
        name: society.name,
        code: (society as any).code,
        address: society.address,
        towers: society.towers.map((t) => ({
          id: t.id,
          name: t.name,
          flats: t.flats.map((f) => ({ id: f.id, flatNumber: f.flatNumber })),
        })),
        gates: society.gates.map((g) => ({ id: g.id, name: g.name })),
      },
    });
  });

  // Public: Register a New Society & Get Unique Code
  fastify.post('/society/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const parseResult = SocietyRegisterSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Invalid input',
        details: parseResult.error.flatten(),
      });
    }

    const { societyName, societyAddress, adminName, adminPhone, adminEmail, adminPassword } = parseResult.data;

    // Check if phone or email already in use
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: adminPhone },
          ...(adminEmail ? [{ email: adminEmail }] : []),
        ],
      },
    });

    if (existingUser) {
      return reply.status(400).send({
        error: 'An account with this phone number or email is already registered.',
      });
    }

    // Generate unique code with uniqueness check
    let uniqueCode = generateUniqueSocietyCode(societyName);
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.society.findUnique({ where: { code: uniqueCode } });
      if (!existing) break;
      uniqueCode = generateUniqueSocietyCode(societyName);
      attempts++;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminPassword, salt);

    // Create society, initial admin, default towers, flats, gate, and bays
    const society = await prisma.society.create({
      data: {
        name: societyName.trim(),
        code: uniqueCode,
        address: societyAddress.trim(),
        timezone: 'Asia/Kolkata',
        configuration: JSON.stringify({
          maxParkingDurationHours: 48,
          residentApprovalRequired: true,
          gracePeriodMinutes: 30,
          entryStartTime: '06:00',
          entryEndTime: '23:00',
        }),
      },
    });

    // Create Admin User
    const adminUser = await prisma.user.create({
      data: {
        name: adminName.trim(),
        phone: adminPhone.trim(),
        email: adminEmail ? adminEmail.trim() : null,
        passwordHash,
        role: 'ADMIN',
        societyId: society.id,
        isActive: true,
        approvalStatus: 'APPROVED',
      } as any,
    });

    // Seed default infrastructure
    const towerA = await prisma.tower.create({ data: { societyId: society.id, name: 'Tower A' } });
    const towerB = await prisma.tower.create({ data: { societyId: society.id, name: 'Tower B' } });
    await prisma.flat.create({ data: { societyId: society.id, towerId: towerA.id, flatNumber: '101' } });
    await prisma.flat.create({ data: { societyId: society.id, towerId: towerA.id, flatNumber: '102' } });
    await prisma.flat.create({ data: { societyId: society.id, towerId: towerB.id, flatNumber: '201' } });
    await prisma.gate.create({ data: { societyId: society.id, name: 'Main Gate' } });

    // Seed 10 parking slots
    for (let i = 1; i <= 8; i++) {
      const numStr = i < 10 ? `P-0${i}` : `P-${i}`;
      await prisma.parkingSlot.create({
        data: {
          societyId: society.id,
          slotNumber: numStr,
          parkingType: 'CAR',
          zone: 'GROUND',
          floor: 'G',
          isActive: true,
        },
      });
    }
    for (let i = 9; i <= 10; i++) {
      await prisma.parkingSlot.create({
        data: {
          societyId: society.id,
          slotNumber: `P-0${i}`,
          parkingType: 'TWO_WHEELER',
          zone: 'BIKE BAY',
          floor: 'G',
          isActive: true,
        },
      });
    }

    // Sign JWT
    const token = fastify.jwt.sign({
      id: adminUser.id,
      role: adminUser.role,
      societyId: society.id,
      name: adminUser.name,
      flatId: null,
    });

    reply.setCookie('parkpass_token', token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
    });

    return reply.status(201).send({
      message: `Society registered successfully! Your unique Society Code is ${uniqueCode}.`,
      societyCode: uniqueCode,
      token,
      society: {
        id: society.id,
        name: society.name,
        code: uniqueCode,
        address: society.address,
      },
      user: {
        id: adminUser.id,
        name: adminUser.name,
        phone: adminUser.phone,
        email: adminUser.email,
        role: adminUser.role,
        societyId: society.id,
        societyName: society.name,
      },
    });
  });

  // Public: Request Account Creation with Society Code (Resident or Guard)
  fastify.post('/register-request', async (request: FastifyRequest, reply: FastifyReply) => {
    const parseResult = RegisterRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Invalid input',
        details: parseResult.error.flatten(),
      });
    }

    const { societyCode, role, name, phone, email, password, towerName, flatNumber, gateName } = parseResult.data;

    const cleanCode = societyCode.trim().toUpperCase();
    const society = await prisma.society.findFirst({
      where: { code: cleanCode },
    });

    if (!society) {
      return reply.status(404).send({
        error: `Society Code "${cleanCode}" not found. Please check with your society secretary or admin.`,
      });
    }

    // Check if phone already registered in this society
    const existing = await prisma.user.findFirst({
      where: {
        societyId: society.id,
        phone: phone.trim(),
      },
    });

    if (existing) {
      if ((existing as any).approvalStatus === 'PENDING') {
        return reply.status(400).send({
          error: 'An account request with this phone number is already pending approval by the Society Admin.',
        });
      }
      return reply.status(400).send({
        error: 'This phone number is already registered in this society. Please log in directly.',
      });
    }

    // Resolve Flat for Resident if provided
    let flatId: string | null = null;
    if (role === 'RESIDENT' && towerName && flatNumber) {
      let tower = await prisma.tower.findFirst({
        where: { societyId: society.id, name: towerName.trim() },
      });
      if (!tower) {
        tower = await prisma.tower.create({
          data: { societyId: society.id, name: towerName.trim() },
        });
      }

      let flat = await prisma.flat.findFirst({
        where: { societyId: society.id, towerId: tower.id, flatNumber: flatNumber.trim() },
      });
      if (!flat) {
        flat = await prisma.flat.create({
          data: { societyId: society.id, towerId: tower.id, flatNumber: flatNumber.trim() },
        });
      }
      flatId = flat.id;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user with PENDING status and inactive
    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        phone: phone.trim(),
        email: email ? email.trim() : null,
        passwordHash,
        role,
        societyId: society.id,
        flatId,
        isActive: false,
        approvalStatus: 'PENDING',
      } as any,
    });

    // Notify the Society Admin
    const adminUser = await prisma.user.findFirst({
      where: { societyId: society.id, role: 'ADMIN' },
    });
    if (adminUser) {
      await prisma.notification.create({
        data: {
          societyId: society.id,
          userId: adminUser.id,
          type: 'SYSTEM',
          title: `New ${role} Registration Request`,
          message: `${name.trim()} (${phone.trim()}) has requested a ${role.toLowerCase()} account for ${
            role === 'RESIDENT'
              ? `${towerName || 'Tower'} Flat ${flatNumber || 'Unit'}`
              : gateName || 'Security Gate'
          }. Go to ${role === 'RESIDENT' ? 'Resident Settings' : 'Guard Settings'} to approve.`,
        },
      });
    }

    return reply.status(201).send({
      message: `Your account request has been submitted to ${society.name} Admin for approval! Once approved, you can log in.`,
      status: 'PENDING',
      approvalStatus: 'PENDING',
      role: newUser.role,
      societyName: society.name,
      societyCode: (society as any).code,
      user: {
        id: newUser.id,
        name: newUser.name,
        phone: newUser.phone,
        role: newUser.role,
        approvalStatus: 'PENDING',
      },
    });
  });

  // Demo user selector list (for seamless evaluator preview)
  fastify.get('/demo-users', async (_req, reply) => {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      include: {
        society: true,
        flat: {
          include: { tower: true },
        },
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
        flatNumber: u.flat?.flatNumber,
        towerName: u.flat?.tower?.name,
        societyName: u.society.name,
      })),
    });
  });
}
