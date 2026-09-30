import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Values set here take precedence over a local .env file (dotenv never overrides existing vars),
    // so tests can never pick up real database credentials or feature flags.
    env: {
      NODE_ENV: 'test',
      MONGODB_URI: 'mongodb://127.0.0.1:1/unused-tests-use-mongodb-memory-server',
      JWT_SECRET: 'test-jwt-secret',
      ENABLE_SEED_ROUTES: '',
      ALLOW_PUBLIC_REGISTRATION: '',
      SUPERADMIN_API_BASE_PATH: '/api/sa-test',
      VAPID_PUBLIC_KEY: '',
      VITE_VAPID_PUBLIC_KEY: '',
      VAPID_PRIVATE_KEY: ''
    },
    hookTimeout: 180_000,
    testTimeout: 30_000,
    fileParallelism: false
  }
});
