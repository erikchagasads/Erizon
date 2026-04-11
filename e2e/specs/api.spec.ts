import { test, expect } from '../core/baseTest';

test('API responde', async ({ request }) => {
  const response = await request.get('/api');
  expect(response.status()).toBeLessThan(500);
});
