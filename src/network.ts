import http, { type IncomingHttpHeaders, type RequestOptions } from 'node:http';
import https from 'node:https';
import { isIP, type LookupFunction } from 'node:net';
import tls from 'node:tls';
import { performance } from 'node:perf_hooks';
import { InspectionError } from './errors.js';
import type { TargetResolver } from './resolver.js';
import { normalizeTarget } from './target.js';

export interface HttpReport {
  reachable: boolean;
  status: number | null;
  final_url: string | null;
  redirect_count: number;
  latency_ms: number | null;
  headers: IncomingHttpHeaders;
  error?: string;
}

export interface TlsReport {
  present: boolean;
  valid: boolean;
  issuer: string | null;
  subject: string | null;
  expires_at: string | null;
  days_remaining: number | null;
  protocol: string | null;
  error?: string;
}

export interface NetworkInspector {
  inspectHttp(hostname: string): Promise<HttpReport>;
  inspectTls(hostname: string): Promise<TlsReport>;
}

function formatDistinguishedName(value?: Record<string, string>): string | null {
  if (!value) return null;
  const text = Object.entries(value).map(([key, item]) => `${key}=${item}`).join(', ');
  return text || null;
}

function safeUrl(url: URL): void {
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new InspectionError('FORBIDDEN_TARGET', 'Redirect target is not an allowed HTTP(S) URL');
  }
  const expectedPort = url.protocol === 'https:' ? '443' : '80';
  if (url.port && url.port !== expectedPort) {
    throw new InspectionError('FORBIDDEN_TARGET', 'Redirect target uses a forbidden port');
  }
}

export class SafeNetworkInspector implements NetworkInspector {
  constructor(
    private readonly resolver: TargetResolver,
    private readonly timeoutMs = 5_000,
    private readonly maxRedirects = 5,
  ) {}

  async inspectHttp(hostname: string): Promise<HttpReport> {
    try {
      return await this.follow(new URL(`https://${hostname}/`), 0, performance.now());
    } catch (error) {
      if (error instanceof InspectionError && ['FORBIDDEN_TARGET', 'INVALID_TARGET'].includes(error.code)) throw error;
      try {
        return await this.follow(new URL(`http://${hostname}/`), 0, performance.now());
      } catch (fallbackError) {
        if (fallbackError instanceof InspectionError && ['FORBIDDEN_TARGET', 'INVALID_TARGET'].includes(fallbackError.code)) {
          throw fallbackError;
        }
        const detail = fallbackError instanceof Error ? fallbackError.message : 'Connection failed';
        return {
          reachable: false,
          status: null,
          final_url: null,
          redirect_count: 0,
          latency_ms: null,
          headers: {},
          error: detail,
        };
      }
    }
  }

  private async follow(url: URL, redirects: number, startedAt: number): Promise<HttpReport> {
    safeUrl(url);
    const hostname = normalizeTarget(url.hostname);
    const resolved = await this.resolver.resolvePublic(hostname);
    const address = resolved.addresses[0];
    if (!address) throw new InspectionError('DNS_FAILURE', 'Redirect target did not resolve');

    const response = await this.request(url, address);
    const location = response.headers.location;
    if (response.statusCode >= 300 && response.statusCode < 400 && location) {
      if (redirects >= this.maxRedirects) throw new InspectionError('UNREACHABLE', 'Maximum redirect count exceeded');
      let next: URL;
      try {
        next = new URL(location, url);
      } catch (error) {
        throw new InspectionError('UNREACHABLE', 'Server returned an invalid redirect', { cause: error });
      }
      return this.follow(next, redirects + 1, startedAt);
    }

    return {
      reachable: true,
      status: response.statusCode,
      final_url: url.toString(),
      redirect_count: redirects,
      latency_ms: Math.round(performance.now() - startedAt),
      headers: response.headers,
    };
  }

  private request(url: URL, address: string): Promise<{ statusCode: number; headers: IncomingHttpHeaders }> {
    return new Promise((resolve, reject) => {
      const lookup = ((_: string, options: unknown, callback: (...args: unknown[]) => void) => {
        const wantsAll = typeof options === 'object' && options !== null && 'all' in options && Boolean((options as { all?: boolean }).all);
        if (wantsAll) callback(null, [{ address, family: isIP(address) }]);
        else callback(null, address, isIP(address));
      }) as LookupFunction;
      const options: RequestOptions = {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || undefined,
        path: `${url.pathname}${url.search}`,
        method: 'GET',
        headers: { 'user-agent': 'x402-infra-inspector/0.1', accept: '*/*' },
        lookup,
        agent: false,
        timeout: this.timeoutMs,
        ...(url.protocol === 'https:' ? { rejectUnauthorized: false, servername: isIP(url.hostname) ? undefined : url.hostname } : {}),
      };
      const transport = url.protocol === 'https:' ? https : http;
      const request = transport.request(options, response => {
        const statusCode = response.statusCode ?? 0;
        const headers = response.headers;
        response.destroy();
        resolve({ statusCode, headers });
      });
      request.once('timeout', () => request.destroy(new InspectionError('TIMEOUT', 'HTTP request timed out')));
      request.once('error', reject);
      request.end();
    });
  }

  async inspectTls(hostname: string): Promise<TlsReport> {
    const resolved = await this.resolver.resolvePublic(hostname);
    const address = resolved.addresses[0];
    if (!address) throw new InspectionError('DNS_FAILURE', 'Target did not resolve');
    return new Promise(resolve => {
      let done = false;
      const finish = (report: TlsReport) => {
        if (done) return;
        done = true;
        resolve(report);
      };
      const socket = tls.connect({
        host: address,
        port: 443,
        servername: isIP(hostname) ? undefined : hostname,
        rejectUnauthorized: false,
        timeout: this.timeoutMs,
      });
      socket.once('secureConnect', () => {
        const certificate = socket.getPeerCertificate();
        const expires = certificate.valid_to ? new Date(certificate.valid_to) : null;
        finish({
          present: Object.keys(certificate).length > 0,
          valid: socket.authorized,
          issuer: formatDistinguishedName(certificate.issuer as Record<string, string>),
          subject: formatDistinguishedName(certificate.subject as Record<string, string>),
          expires_at: expires && !Number.isNaN(expires.valueOf()) ? expires.toISOString() : null,
          days_remaining: expires && !Number.isNaN(expires.valueOf())
            ? Math.floor((expires.valueOf() - Date.now()) / 86_400_000)
            : null,
          protocol: socket.getProtocol(),
          ...(!socket.authorized && socket.authorizationError ? { error: String(socket.authorizationError) } : {}),
        });
        socket.destroy();
      });
      socket.once('timeout', () => {
        socket.destroy();
        finish({ present: false, valid: false, issuer: null, subject: null, expires_at: null, days_remaining: null, protocol: null, error: 'TLS connection timed out' });
      });
      socket.once('error', error => {
        finish({ present: false, valid: false, issuer: null, subject: null, expires_at: null, days_remaining: null, protocol: null, error: error.message });
      });
    });
  }
}
