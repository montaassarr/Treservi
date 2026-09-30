import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { startTestDb, stopTestDb } from './testUtils.js';

describe('GET /health', () => {
  beforeAll(startTestDb);
  afterAll(stopTestDb);

  it('returns ok when the database is connected', async () => {
    const app = createApp();
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok', mongodb: 'connected' });
  });
});
