import { buildApp } from './app';
import { config } from './config';
import { startKeepAlive } from './services/keep-alive.service';

async function start() {
  const app = buildApp();

  try {
    const address = await app.listen({ port: config.port, host: config.host });
    console.log(`
===================================================
🚗  PARKPASS BACKEND API SERVER RUNNING
👉  Listening on: ${address}
👉  Health check: ${address}/health
👉  Environment:  ${process.env.NODE_ENV || 'development'}
===================================================
    `);

    // Keep server active by self-pinging every 1 min (prevents free-tier sleep)
    startKeepAlive(config.port);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
