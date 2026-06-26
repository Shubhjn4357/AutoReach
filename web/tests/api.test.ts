import request from 'supertest';
import { app } from '../server';

// In a real test you would spin up the server on a test port.
// For demonstration, we import the express app directly and use supertest.
describe('Contact API', () => {
  it('GET /api/contacts should return 200 and an array', async () => {
    const res = await request(app).get('/api/contacts');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
