import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import type { AppConfig } from '../src/config.js';

const config: AppConfig = {
  listenHost: '127.0.0.1',
  port: 4021,
  environment: 'test',
  network: 'testnet',
  paymentsEnabled: false,
  publicBaseUrl: 'https://x402.pipeforge.tech',
  asset: '10458941',
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

  it('accepts a host in the POST JSON body', async () => {
    const response = await createApp(config, inspector).request('/api/v1/inspect', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ host: 'example.com' }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ target: 'example.com' });
  });

  it('rejects a missing or malformed POST JSON host', async () => {
    const app = createApp(config, inspector);
    const missing = await app.request('/api/v1/inspect', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    const malformed = await app.request('/api/v1/inspect', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{',
    });
    expect(missing.status).toBe(400);
    expect(malformed.status).toBe(400);
    expect(await missing.json()).toMatchObject({ error: { code: 'INVALID_TARGET' } });
    expect(await malformed.json()).toMatchObject({ error: { code: 'INVALID_TARGET' } });
  });

  it.each(['/.well-known/x402', '/.well-known/x402.json'])('serves the discovery manifest at %s', async path => {
    const response = await createApp(config, inspector).request(path);
    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(response.headers.get('cache-control')).toBe('public, max-age=3600');
    expect(await response.json()).toMatchObject({
      x402Version: 2,
      kind: 'resource-server',
      resources: [
        { url: 'https://x402.pipeforge.tech/api/v1/inspect?host=example.com', method: 'GET' },
        { url: 'https://x402.pipeforge.tech/api/v1/inspect', method: 'POST' },
      ],
      attestation: { type: 'none' },
    });
  });

  it('returns a TestNet USDC x402 requirement with Bazaar metadata and the canonical HTTPS resource URL', async () => {
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
      }, inspector).request('http://127.0.0.1:4021/api/v1/inspect?host=example.com', {
        headers: {
          host: 'x402.pipeforge.tech',
          'x-forwarded-host': 'x402.pipeforge.tech',
          'x-forwarded-proto': 'https',
        },
      });
      expect(response.status).toBe(402);
      const encoded = response.headers.get('payment-required');
      expect(encoded).toBeTruthy();
      const requirement = JSON.parse(Buffer.from(encoded!, 'base64').toString('utf8')) as {
        x402Version: number;
        accepts: Array<{ network: string; asset: string; amount: string; payTo: string; extra: { tag: string } }>;
        resource: { url: string };
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
      expect(requirement.accepts[1]).toMatchObject({
        network: 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe',
        asset: '10458941',
        amount: '20000',
        payTo: '2UXLRFM6JLSAJWBT5QQOOYTVLJECMKMA7B6PLXIPKKOJ4LUW2XIN6EL3RY',
        extra: { tag: 'x402-global-challenge' },
      });
      expect(requirement.extensions?.bazaar).toBeTruthy();
      expect(requirement.resource.url).toBe('https://x402.pipeforge.tech/api/v1/inspect?host=example.com');
      expect(await response.json()).toEqual(requirement);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('protects POST with a body-readable v2 requirement and canonical resource URL', async () => {
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
      }, inspector).request('http://127.0.0.1:4021/api/v1/inspect', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ host: 'example.com' }),
      });
      expect(response.status).toBe(402);
      const encoded = response.headers.get('payment-required');
      expect(encoded).toBeTruthy();
      const requirement = JSON.parse(Buffer.from(encoded!, 'base64').toString('utf8')) as {
        x402Version: number;
        accepts: Array<{ network: string }>;
        resource: { url: string };
        extensions?: { bazaar?: unknown };
      };
      expect(requirement.x402Version).toBe(2);
      expect(requirement.accepts.map(accept => accept.network)).toEqual([
        network,
        'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe',
      ]);
      expect(requirement.resource.url).toBe('https://x402.pipeforge.tech/api/v1/inspect');
      expect(requirement.extensions?.bazaar).toBeTruthy();
      expect(await response.json()).toEqual(requirement);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('does not let untrusted forwarding headers alter the canonical resource URL', async () => {
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
      }, inspector).request('http://127.0.0.1:4021/api/v1/inspect?host=example.com', {
        headers: {
          host: 'attacker.invalid',
          'x-forwarded-host': 'attacker.invalid',
          'x-forwarded-proto': 'http',
        },
      });
      const encoded = response.headers.get('payment-required');
      expect(response.status).toBe(402);
      expect(encoded).toBeTruthy();
      const requirement = JSON.parse(Buffer.from(encoded!, 'base64').toString('utf8')) as { resource: { url: string } };
      expect(requirement.resource.url).toBe('https://x402.pipeforge.tech/api/v1/inspect?host=example.com');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('builds an unpaid MainNet requirement with the verified USDC asset', async () => {
    const network = 'algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=';
    const receiver = 'ZMFK2OI7ZBD2U27ISERZC4S6LKM6WMFJPZQ4MYNJDZ2VNBNMBA67RA22AA';
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      kinds: [{ x402Version: 2, scheme: 'exact', network, extra: { feePayer: receiver } }],
      extensions: [],
      signers: { 'algorand:*': [receiver] },
    }), { status: 200, headers: { 'content-type': 'application/json' } })));
    try {
      const response = await createApp({
        ...config,
        network: 'mainnet',
        paymentsEnabled: true,
        asset: '31566704',
        payTo: receiver,
      }, inspector).request('https://x402.pipeforge.tech/api/v1/inspect?host=example.com');
      expect(response.status).toBe(402);
      const encoded = response.headers.get('payment-required');
      expect(encoded).toBeTruthy();
      const requirement = JSON.parse(Buffer.from(encoded!, 'base64').toString('utf8')) as {
        accepts: Array<{ network: string; asset: string; amount: string; payTo: string; extra: { tag: string } }>;
        resource: { url: string };
        extensions?: { bazaar?: unknown };
      };
      expect(requirement.accepts[0]).toMatchObject({
        network,
        asset: '31566704',
        amount: '20000',
        payTo: receiver,
        extra: { tag: 'x402-global-challenge' },
      });
      expect(requirement.accepts[1]).toMatchObject({
        network: 'algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73k',
        asset: '31566704',
        amount: '20000',
        payTo: receiver,
        extra: { tag: 'x402-global-challenge' },
      });
      expect(requirement.extensions?.bazaar).toBeTruthy();
      expect(requirement.resource.url).toBe('https://x402.pipeforge.tech/api/v1/inspect?host=example.com');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
