import mongoose from 'mongoose';
import { env } from './config/env.js';
import { createApp } from './app.js';

const start = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(env.mongoUri);
    console.log('✅ MongoDB connected successfully');
    console.log(`📊 Database: ${mongoose.connection.name}`);

    const app = createApp();
    const server = app.listen(env.port, () => {
      console.log(`🚀 Server running on port ${env.port}`);
      console.log(`🌍 Environment: ${env.nodeEnv}`);
      console.log(`📡 Health check: http://localhost:${env.port}/health`);
      console.log(`✅ API ready: http://localhost:${env.port}/api`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received, shutting down gracefully...`);
      
      server.close(async () => {
        console.log('🔌 HTTP server closed');
        
        try {
          await mongoose.connection.close();
          console.log('🔌 MongoDB connection closed');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        console.error('⚠️  Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

start();
