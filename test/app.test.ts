import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import type { AppConfig } from '../src/config.js';

const config: AppConfig = {
  listenHost: '127.0.0.1',
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

  it('returns a TestNet USDC x402 requirement with Bazaar metadata', async () => {
    const network = 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=';
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      kinds: [{ x402Version: 2, scheme: 'exact', network, extra: { feePayer: 'ZMFK2OI7ZBD2U27ISERZC4S6LKM6WMFJPZQ4MYNJDZ2VNBNMBA67RA22AA' } }],
      extensions: [],
      signers: { 'algorand:*': ['ZMFK2OI7ZBD2U27ISERZC4S6LKM6WMFJPZQ4MYNJDZ2VNBNMBA67RA22AA'] },
    }), { status: 200, headers: { 'content-type': 'application/json' } })));
    try {
      const response = await createApp({
        ...config,
        paymentsEnabled: true,
        payTo: '2UXLRFM6JLSAJWBT5QQOOYTVLJECMKMA7B6PLXIPKKOJ4LUW2XIN6EL3RY',
      }, inspector).request('/api/v1/inspect?host=example.com');
      expect(response.status).toBe(402);
      const encoded = response.headers.get('payment-required');
      expect(encoded).toBeTruthy();
      const requirement = JSON.parse(Buffer.from(encoded!, 'base64').toString('utf8')) as {
        x402Version: number;
        accepts: Array<{ network: string; asset: string; amount: string; payTo: string; extra: { tag: string } }>;
        extensions?: { bazaar?: unknown };
      };
      expect(requirement.x402Version).toBe(2);
      expect(requirement.accepts[0]).toMatchObject({
        network,
        asset: '10458941',
        amount: '20000',
        payTo: '2UXLRFM6JLSAJWBT5QQOOYTVLJECMKMA7B6PLXIPKKOJ4LUW2XIN6EL3RY',
        extra: { tag: 'x402-global-challenge' },
      });
      expect(requirement.extensions?.bazaar).toBeTruthy();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
