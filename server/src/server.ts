import app from './app.js';
import { config } from './config/index.js';
import { prisma } from './config/prisma.js';

async function main(): Promise<void> {
  try {
    // Verify database connectivity
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    const server = app.listen(config.PORT, () => {
      console.log(
        `🚀 Server running on http://localhost:${config.PORT} [${config.NODE_ENV}]`
      );
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        await prisma.$disconnect();
        console.log('Database disconnected. Process exiting.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
