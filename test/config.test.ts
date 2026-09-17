import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

describe('deployment configuration', () => {
  it('binds to IPv4 loopback by default', () => {
    expect(loadConfig({}).listenHost).toBe('127.0.0.1');
  });

  it('refuses an all-interface bind', () => {
    expect(() => loadConfig({ LISTEN_HOST: '0.0.0.0' })).toThrow('LISTEN_HOST must be 127.0.0.1');
  });
});
