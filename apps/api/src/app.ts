import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import { config } from './config';
import { authRoutes } from './routes/auth.routes';
import { residentRoutes } from './routes/resident.routes';
import { visitorRoutes } from './routes/visitor.routes';
import { guardRoutes } from './routes/guard.routes';
import { adminRoutes } from './routes/admin.routes';

export function buildApp() {
  const app = Fastify({
    logger: process.env.NODE_ENV === 'test' ? false : true,
  });

  // CORS
  app.register(cors, {
    origin: (origin, cb) => {
      // Allow localhost frontend in dev, or same origin
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        cb(null, true);
        return;
      }
      cb(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Cookie
  app.register(cookie, {
    secret: config.cookieSecret,
    parseOptions: {},
  });

  // JWT
  app.register(jwt, {
    secret: config.jwtSecret,
    cookie: {
      cookieName: 'parkpass_token',
      signed: false,
    },
  });

  // Health check
  app.get('/health', async () => {
    return { status: 'healthy', timestamp: new Date().toISOString(), system: 'ParkPass Core API' };
  });

  // API v1 Routes
  app.register(async (v1) => {
    v1.register(authRoutes, { prefix: '/auth' });
    v1.register(residentRoutes, { prefix: '/resident' });
    v1.register(visitorRoutes, { prefix: '/visitor' });
    v1.register(guardRoutes, { prefix: '/guard' });
    v1.register(adminRoutes, { prefix: '/admin' });
  }, { prefix: '/api/v1' });

  // Global Error Handler
  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    const statusCode = error.statusCode || 500;
    reply.status(statusCode).send({
      error: error.name || 'InternalServerError',
      message: error.message || 'An unexpected server error occurred.',
    });
  });

  return app;
}
