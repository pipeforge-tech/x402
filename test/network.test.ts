import { describe, expect, it, vi } from 'vitest';
import { SafeNetworkInspector } from '../src/network.js';
import type { TargetResolver } from '../src/resolver.js';

const publicResolver: TargetResolver = {
  resolvePublic: vi.fn(async hostname => {
    if (hostname === 'private.example') throw Object.assign(new Error('private'), { code: 'FORBIDDEN_TARGET' });
    return { ipv4: ['93.184.216.34'], ipv6: [], addresses: ['93.184.216.34'] };
  }),
  records: vi.fn(),
};

describe('SafeNetworkInspector redirects', () => {
  it('rejects a redirect to a private literal address before connecting', async () => {
    const inspector = new SafeNetworkInspector(publicResolver, 100, 2);
    (inspector as unknown as { request: () => Promise<unknown> }).request = vi.fn(async () => ({
      statusCode: 302,
      headers: { location: 'http://127.0.0.1/admin' },
    }));
    await expect(inspector.inspectHttp('example.com')).rejects.toMatchObject({ code: 'FORBIDDEN_TARGET' });
  });

  it('caps redirect chains', async () => {
    const inspector = new SafeNetworkInspector(publicResolver, 100, 1);
    (inspector as unknown as { request: () => Promise<unknown> }).request = vi.fn(async () => ({
      statusCode: 302,
      headers: { location: 'https://example.com/again' },
    }));
    const report = await inspector.inspectHttp('example.com');
    expect(report.reachable).toBe(false);
    expect(report.error).toContain('Maximum redirect count exceeded');
  });
});
