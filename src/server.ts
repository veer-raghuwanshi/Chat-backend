import { createApp } from './app';
import { testConnection, pool } from './config/db';

const PORT = process.env.PORT || 3000;

async function start() {
  await testConnection();

  const app = createApp();

  const server = app.listen(PORT, () => {
    console.log(`[server] Chat backend running on port ${PORT}`);
    console.log(`[server] UI Dashboard: http://localhost:${PORT}`);
    console.log(`[server] Health Check: http://localhost:${PORT}/health`);
  });

  const shutdown = async () => {
    console.log('\n[server] Shutting down gracefully...');
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  console.error('[server] Fatal error:', err);
  process.exit(1);
});
