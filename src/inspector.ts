import type { DnsReport, TargetResolver } from './resolver.js';
import type { HttpReport, NetworkInspector, TlsReport } from './network.js';
import { normalizeTarget } from './target.js';

export interface InspectionReport {
  target: string;
  timestamp: string;
  dns: Omit<DnsReport, 'addresses'>;
  http: Omit<HttpReport, 'headers'>;
  tls: TlsReport;
  security_headers: {
    strict_transport_security: boolean;
    content_security_policy: boolean;
    x_content_type_options: boolean;
    referrer_policy: boolean;
    permissions_policy: boolean;
  };
}

export class InfrastructureInspector {
  constructor(
    private readonly resolver: TargetResolver,
    private readonly network: NetworkInspector,
  ) {}

  async inspect(input: string): Promise<InspectionReport> {
    const target = normalizeTarget(input);
    const dns = await this.resolver.records(target);
    const [http, tls] = await Promise.all([
      this.network.inspectHttp(target),
      this.network.inspectTls(target),
    ]);
    const { headers, ...httpReport } = http;
    return {
      target,
      timestamp: new Date().toISOString(),
      dns: { ipv4: dns.ipv4, ipv6: dns.ipv6, mx: dns.mx, nameservers: dns.nameservers },
      http: httpReport,
      tls,
      security_headers: {
        strict_transport_security: headers['strict-transport-security'] !== undefined,
        content_security_policy: headers['content-security-policy'] !== undefined,
        x_content_type_options: headers['x-content-type-options'] !== undefined,
        referrer_policy: headers['referrer-policy'] !== undefined,
        permissions_policy: headers['permissions-policy'] !== undefined,
      },
    };
  }
}
