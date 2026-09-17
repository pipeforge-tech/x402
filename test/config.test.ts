import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

describe('deployment configuration', () => {
  it('binds to IPv4 loopback by default', () => {
    expect(loadConfig({}).listenHost).toBe('127.0.0.1');
  });

  it('refuses an all-interface bind', () => {
    expect(() => loadConfig({ LISTEN_HOST: '0.0.0.0' })).toThrow('LISTEN_HOST must be 127.0.0.1');
  });

  it('normalizes the configured canonical public HTTPS origin', () => {
    expect(loadConfig({ PUBLIC_BASE_URL: 'https://x402.pipeforge.tech/' }).publicBaseUrl).toBe('https://x402.pipeforge.tech');
  });

  it('requires a canonical public base URL when payments are enabled', () => {
    expect(() => loadConfig({ PAYMENTS_ENABLED: 'true' })).toThrow('PUBLIC_BASE_URL is required when payments are enabled');
  });

  it.each([
    'http://x402.pipeforge.tech',
    'https://user:password@x402.pipeforge.tech',
    'https://x402.pipeforge.tech/base',
    'https://x402.pipeforge.tech/?query=value',
    'https://x402.pipeforge.tech/#fragment',
  ])('rejects unsafe or non-origin public base URL %s', value => {
    expect(() => loadConfig({ PUBLIC_BASE_URL: value })).toThrow('PUBLIC_BASE_URL must be an HTTPS origin');
  });
});
