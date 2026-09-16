import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import type { AppConfig } from '../src/config.js';

const config: AppConfig = {
  port: 4021,
  environment: 'test',
  network: 'testnet',
  paymentsEnabled: false,
  price: '$0.02',
  facilitatorUrl: 'https://facilitator.goplausible.xyz',
  challengeTag: 'x402-global-challenge',
  timeoutMs: 100,
  maxRedirects: 2,
};

describe('HTTP API', () => {
  const inspector = { inspect: vi.fn(async () => ({ target: 'example.com' })) } as never;

  it('returns safe health information', async () => {
    const response = await createApp(config, inspector).request('/health');
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: 'ok', service: 'x402-infra-inspector', version: '0.1.0', network: 'testnet' });
  });

  it('requires the host query parameter', async () => {
    const response = await createApp(config, inspector).request('/api/v1/inspect');
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: 'INVALID_TARGET' } });
  });
});
