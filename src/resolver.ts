import { promises as dns, type MxRecord } from 'node:dns';
import { isIP } from 'node:net';
import { InspectionError } from './errors.js';
import { isPublicAddress } from './target.js';

export interface ResolvedTarget {
  ipv4: string[];
  ipv6: string[];
  addresses: string[];
}

export interface DnsReport extends ResolvedTarget {
  mx: MxRecord[];
  nameservers: string[];
}

export interface TargetResolver {
  resolvePublic(hostname: string): Promise<ResolvedTarget>;
  records(hostname: string): Promise<DnsReport>;
}

async function optional<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await operation();
  } catch {
    return fallback;
  }
}

export class SafeDnsResolver implements TargetResolver {
  async resolvePublic(hostname: string): Promise<ResolvedTarget> {
    if (isIP(hostname)) {
      const result = { ipv4: isIP(hostname) === 4 ? [hostname] : [], ipv6: isIP(hostname) === 6 ? [hostname] : [] };
      return { ...result, addresses: [hostname] };
    }
    let rows: Array<{ address: string; family: number }>;
    try {
      rows = await dns.lookup(hostname, { all: true, verbatim: true });
    } catch (error) {
      throw new InspectionError('DNS_FAILURE', 'Target could not be resolved', { cause: error });
    }
    const addresses = [...new Set(rows.map(row => row.address))];
    if (addresses.length === 0) throw new InspectionError('DNS_FAILURE', 'Target did not resolve to an address');
    if (addresses.some(address => !isPublicAddress(address))) {
      throw new InspectionError('FORBIDDEN_TARGET', 'Target resolves to a non-public address');
    }
    return {
      ipv4: addresses.filter(address => isIP(address) === 4),
      ipv6: addresses.filter(address => isIP(address) === 6),
      addresses,
    };
  }

  async records(hostname: string): Promise<DnsReport> {
    const resolved = await this.resolvePublic(hostname);
    if (isIP(hostname)) return { ...resolved, mx: [], nameservers: [] };
    const [ipv4, ipv6, mx, nameservers] = await Promise.all([
      optional(() => dns.resolve4(hostname), resolved.ipv4),
      optional(() => dns.resolve6(hostname), resolved.ipv6),
      optional(() => dns.resolveMx(hostname), []),
      optional(() => dns.resolveNs(hostname), []),
    ]);
    const allRecordAddresses = [...ipv4, ...ipv6];
    if (allRecordAddresses.some(address => !isPublicAddress(address))) {
      throw new InspectionError('FORBIDDEN_TARGET', 'Target DNS records include a non-public address');
    }
    return { ipv4, ipv6, addresses: resolved.addresses, mx, nameservers };
  }
}
