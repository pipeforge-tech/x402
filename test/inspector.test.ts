import { describe, expect, it, vi } from 'vitest';
import { InfrastructureInspector } from '../src/inspector.js';

describe('InfrastructureInspector', () => {
  it('combines bounded inspection results', async () => {
    const resolver = {
      resolvePublic: vi.fn(),
      records: vi.fn(async () => ({ ipv4: ['93.184.216.34'], ipv6: [], addresses: ['93.184.216.34'], mx: [], nameservers: ['a.iana-servers.net'] })),
    };
    const network = {
      inspectHttp: vi.fn(async () => ({ reachable: true, status: 200, final_url: 'https://example.com/', redirect_count: 0, latency_ms: 10, headers: { 'strict-transport-security': 'max-age=1' } })),
      inspectTls: vi.fn(async () => ({ present: true, valid: true, issuer: 'CA', subject: 'example.com', expires_at: null, days_remaining: null, protocol: 'TLSv1.3' })),
    };
    const report = await new InfrastructureInspector(resolver, network).inspect('example.com');
    expect(report.target).toBe('example.com');
    expect(report.http.status).toBe(200);
    expect(report.security_headers.strict_transport_security).toBe(true);
  });
});
