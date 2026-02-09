import mongoose from 'mongoose';
import { env } from './config/env.js';
import { createApp } from './app.js';

const start = async () => {
  try {
    await mongoose.connect(env.mongoUri);
    console.log('✅ MongoDB connected');

    const app = createApp();
    app.listen(env.port, () => {
      console.log(`🚀 API running on http://localhost:${env.port}`);
    });
  } catch (error) {
    console.error('Failed to start server', error);
    process.exit(1);
  }
};

start();
