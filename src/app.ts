import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import type { MiddlewareHandler } from 'hono';
import { paymentMiddleware, x402ResourceServer } from '@x402/hono';
import { HTTPFacilitatorClient } from '@x402/core/server';
import type { ResourceServerExtension } from '@x402/core/types';
import type { Network } from '@x402/core/types';
import { ExactAvmScheme } from '@x402/avm/exact/server';
import {
  ALGORAND_MAINNET_CAIP2,
  ALGORAND_MAINNET_GENESIS_HASH,
  ALGORAND_TESTNET_CAIP2,
  ALGORAND_TESTNET_GENESIS_HASH,
} from '@x402/avm';
import { bazaarResourceServerExtension, declareDiscoveryExtension } from '@x402-avm/extensions';
import type { AppConfig } from './config.js';
import { publicError } from './errors.js';
import { AlgorandNetworkCompatibilityFacilitator } from './facilitator.js';
import type { InfrastructureInspector } from './inspector.js';

const startedAt = Date.now();
const resourceDescription = 'Bounded DNS, HTTP(S), TLS, redirects, latency, and security-header inspection of a public Internet hostname.';
const manifestUpdatedAt = '2026-10-01T00:00:00Z';

const exampleReport = {
  target: 'example.com',
  timestamp: '2026-09-16T21:00:00.000Z',
  dns: { ipv4: ['93.184.216.34'], ipv6: [], mx: [], nameservers: [] },
  http: { reachable: true, status: 200, final_url: 'https://example.com/', redirect_count: 0, latency_ms: 82 },
  tls: { present: true, valid: true, issuer: 'O=Example CA', subject: 'CN=example.com', expires_at: '2026-12-01T00:00:00.000Z', days_remaining: 75, protocol: 'TLSv1.3' },
  security_headers: { strict_transport_security: true, content_security_policy: false, x_content_type_options: true, referrer_policy: true, permissions_policy: false },
};

function payments(config: AppConfig): MiddlewareHandler {
  // GoPlausible currently advertises the full genesis-hash identifiers, while
  // the x402 specification uses truncated CAIP-2 identifiers. Advertise both.
  const genesisHash = config.network === 'mainnet' ? ALGORAND_MAINNET_GENESIS_HASH : ALGORAND_TESTNET_GENESIS_HASH;
  const legacyNetwork = `algorand:${genesisHash}` as Network;
  const canonicalNetwork = (config.network === 'mainnet' ? ALGORAND_MAINNET_CAIP2 : ALGORAND_TESTNET_CAIP2) as Network;
  const facilitator = new AlgorandNetworkCompatibilityFacilitator(
    new HTTPFacilitatorClient({ url: config.facilitatorUrl }),
  );
  const server = new x402ResourceServer(facilitator);
  server.register(legacyNetwork, new ExactAvmScheme());
  server.register(canonicalNetwork, new ExactAvmScheme());
  server.registerExtension(bazaarResourceServerExtension as unknown as ResourceServerExtension);

  const discovery = declareDiscoveryExtension({
    input: { host: 'example.com' },
    inputSchema: {
      properties: { host: { type: 'string', description: 'Public Internet hostname or public IP address' } },
      required: ['host'],
    },
    output: { example: exampleReport },
  });

  const route = {
    accepts: [legacyNetwork, canonicalNetwork].map(network => ({
      scheme: 'exact' as const,
      price: config.price,
      network,
      payTo: config.payTo!,
      extra: { asset: config.asset, tag: config.challengeTag },
    })),
    description: resourceDescription,
    mimeType: 'application/json',
    extensions: discovery,
  };

  const middleware = paymentMiddleware({
    'GET /api/v1/inspect': route,
    'POST /api/v1/inspect': route,
  }, server);

  return async (context, next) => {
    const originalRequest = context.req.raw;
    const incomingUrl = new URL(originalRequest.url);
    const canonicalUrl = new URL(config.publicBaseUrl!);
    canonicalUrl.pathname = incomingUrl.pathname;
    canonicalUrl.search = incomingUrl.search;
    context.req.raw = new Request(canonicalUrl, originalRequest);
    try {
      const response = await middleware(context, next);
      if (!response) return response;
      const encodedRequirement = response.headers.get('payment-required');
      if (response.status !== 402 || !encodedRequirement) return response;

      // x402 v2 defines PAYMENT-REQUIRED as authoritative. Mirroring that
      // challenge in the JSON body also helps body-reading probes and clients,
      // without falsely claiming that this v2-only facilitator accepts v1.
      try {
        const requirement = JSON.parse(Buffer.from(encodedRequirement, 'base64').toString('utf8')) as unknown;
        const headers = new Headers(response.headers);
        headers.delete('content-length');
        headers.set('content-type', 'application/json; charset=UTF-8');
        return new Response(JSON.stringify(requirement), {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      } catch {
        return response;
      }
    } finally {
      context.req.raw = originalRequest;
    }
  };
}

export function createApp(config: AppConfig, inspector: InfrastructureInspector): Hono {
  const app = new Hono();

  app.use('*', async (context, next) => {
    const requestId = context.req.header('x-request-id') ?? randomUUID();
    context.header('x-request-id', requestId);
    const began = Date.now();
    await next();
    console.info(JSON.stringify({
      timestamp: new Date().toISOString(),
      request_id: requestId,
      method: context.req.method,
      endpoint: context.req.path,
      status: context.res.status,
      duration_ms: Date.now() - began,
    }));
  });

  app.get('/health', context => context.json({
    status: 'ok',
    service: 'x402-infra-inspector',
    version: '0.1.0',
    network: config.network,
    uptime_seconds: Math.floor((Date.now() - startedAt) / 1_000),
  }));

  const discoveryManifest = () => ({
    x402Version: 2,
    kind: 'resource-server',
    name: 'PipeForge x402 Infrastructure Inspector',
    description: resourceDescription,
    resources: config.publicBaseUrl ? [
      {
        url: `${config.publicBaseUrl}/api/v1/inspect?host=example.com`,
        method: 'GET',
        description: resourceDescription,
      },
      {
        url: `${config.publicBaseUrl}/api/v1/inspect`,
        method: 'POST',
        description: resourceDescription,
      },
    ] : [],
    attestation: { type: 'none' },
    docs: 'https://github.com/pipeforge-tech/x402',
    updated: manifestUpdatedAt,
  });
  const serveDiscoveryManifest: MiddlewareHandler = async context => {
    context.header('Access-Control-Allow-Origin', '*');
    context.header('Cache-Control', 'public, max-age=3600');
    return context.json(discoveryManifest());
  };
  app.get('/.well-known/x402', serveDiscoveryManifest);
  app.get('/.well-known/x402.json', serveDiscoveryManifest);

  if (config.paymentsEnabled) app.use('/api/v1/inspect', payments(config));

  app.get('/api/v1/inspect', async context => {
    const host = context.req.query('host');
    if (!host) return context.json({ error: { code: 'INVALID_TARGET', message: 'Query parameter "host" is required' } }, 400);
    try {
      return context.json(await inspector.inspect(host));
    } catch (error) {
      const result = publicError(error);
      return context.json(result.body, result.status as 400);
    }
  });

  app.post('/api/v1/inspect', async context => {
    let body: unknown;
    try {
      body = await context.req.json();
    } catch {
      return context.json({ error: { code: 'INVALID_TARGET', message: 'JSON body with string field "host" is required' } }, 400);
    }
    const host = typeof body === 'object' && body !== null && 'host' in body
      ? (body as { host?: unknown }).host
      : undefined;
    if (typeof host !== 'string' || host.length === 0) {
      return context.json({ error: { code: 'INVALID_TARGET', message: 'JSON body with string field "host" is required' } }, 400);
    }
    try {
      return context.json(await inspector.inspect(host));
    } catch (error) {
      const result = publicError(error);
      return context.json(result.body, result.status as 400);
    }
  });

  app.notFound(context => context.json({ error: { code: 'NOT_FOUND', message: 'Route not found' } }, 404));
  app.onError((error, context) => {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: 'error', message: error.message }));
    return context.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, 500);
  });
  return app;
}
