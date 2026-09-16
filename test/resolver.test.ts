import { afterEach, describe, expect, it, vi } from 'vitest';
import { promises as dns } from 'node:dns';
import { SafeDnsResolver } from '../src/resolver.js';

afterEach(() => vi.restoreAllMocks());

describe('SafeDnsResolver', () => {
  it('rejects a hostname if any answer is private', async () => {
    vi.spyOn(dns, 'lookup').mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
      { address: '10.0.0.8', family: 4 },
    ] as never);
    await expect(new SafeDnsResolver().resolvePublic('mixed.example')).rejects.toMatchObject({ code: 'FORBIDDEN_TARGET' });
  });

  it('reports deterministic DNS failures', async () => {
    vi.spyOn(dns, 'lookup').mockRejectedValue(new Error('ENOTFOUND'));
    await expect(new SafeDnsResolver().resolvePublic('missing.example')).rejects.toMatchObject({ code: 'DNS_FAILURE' });
  });
});
