import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';
import { z } from 'zod';

const LoginBodySchema = z.object({
  identifier: z.string().min(1, 'Identifier is required'),
  password: z.string().min(1, 'Password is required'),
});

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

    // Find user by phone or email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: identifier },
          { email: identifier },
        ],
        isActive: true,
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
