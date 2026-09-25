/**
 * Keep-Alive Service for Free Tier Hosting (e.g., Render)
 * Automatically pings the server's public endpoint every 60 seconds (1 minute)
 * to keep the instance active and prevent sleep / spin-down.
 */

export function startKeepAlive(localPort: number) {
  // Render automatically injects RENDER_EXTERNAL_URL (e.g., https://parkpass-api.onrender.com)
  const externalUrl = process.env.RENDER_EXTERNAL_URL
    ? `${process.env.RENDER_EXTERNAL_URL.replace(/\/+$/, '')}/health`
    : null;

  const targetUrl = process.env.SELF_PING_URL || externalUrl;

  // Default to 60 seconds (1 minute)
  const intervalMs = parseInt(process.env.PING_INTERVAL_MS || '60000', 10);

  const pingUrl = targetUrl || `http://127.0.0.1:${localPort}/health`;

  console.log(`💓 [Keep-Alive] Service active. Pinging every ${intervalMs / 1000}s: ${pingUrl}`);

  // Initial ping after 15 seconds
  setTimeout(performPing, 15000);

  const intervalId = setInterval(performPing, intervalMs);

  if (intervalId.unref) {
    intervalId.unref();
  }

  async function performPing() {
    try {
      const res = await fetch(pingUrl, {
        headers: { 'User-Agent': 'ParkPass-KeepAlive/1.0' },
      });
      if (res.ok) {
        console.log(`💓 [Keep-Alive] Self-ping OK (${res.status}) at ${new Date().toLocaleTimeString()}`);
      } else {
        console.warn(`⚠️ [Keep-Alive] Self-ping returned HTTP ${res.status}`);
      }
    } catch (err: any) {
      console.warn(`⚠️ [Keep-Alive] Self-ping attempt: ${err.message}`);
    }
  }
}
