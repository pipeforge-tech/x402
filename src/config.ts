import { InspectionError } from './errors.js';

export interface AppConfig {
  listenHost: '127.0.0.1';
  port: number;
  environment: string;
  network: 'testnet' | 'mainnet';
  paymentsEnabled: boolean;
  publicBaseUrl?: string;
  payTo?: string;
  price: string;
  facilitatorUrl: string;
  challengeTag: string;
  timeoutMs: number;
  maxRedirects: number;
}

function integer(value: string | undefined, fallback: number, minimum: number, maximum: number): number {
  const parsed = value === undefined ? fallback : Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`Configuration value must be an integer from ${minimum} to ${maximum}`);
  }
  return parsed;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const listenHost = env.LISTEN_HOST ?? '127.0.0.1';
  if (listenHost !== '127.0.0.1') throw new Error('LISTEN_HOST must be 127.0.0.1');
  const network = env.X402_NETWORK ?? 'testnet';
  if (network !== 'testnet' && network !== 'mainnet') throw new Error('X402_NETWORK must be testnet or mainnet');
  const paymentsEnabled = env.PAYMENTS_ENABLED === 'true';
  const publicBaseUrlValue = env.PUBLIC_BASE_URL?.trim();
  let publicBaseUrl: string | undefined;
  if (publicBaseUrlValue) {
    try {
      const parsed = new URL(publicBaseUrlValue);
      const localHttp = parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname);
      if (parsed.protocol !== 'https:' && !localHttp) throw new Error();
      if (parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) throw new Error();
      publicBaseUrl = parsed.origin;
    } catch {
      throw new InspectionError('INTERNAL_ERROR', 'PUBLIC_BASE_URL must be an HTTPS origin without credentials, path, query, or fragment');
    }
  }
  if (paymentsEnabled && !publicBaseUrl) throw new Error('PUBLIC_BASE_URL is required when payments are enabled');
  const payTo = env.X402_PAY_TO?.trim();
  if (paymentsEnabled && !payTo) throw new Error('X402_PAY_TO is required when payments are enabled');
  if (payTo && !/^[A-Z2-7]{58}$/.test(payTo)) throw new Error('X402_PAY_TO must be a 58-character Algorand address');
  const facilitatorUrl = env.X402_FACILITATOR_URL ?? 'https://facilitator.goplausible.xyz';
  try {
    const parsed = new URL(facilitatorUrl);
    if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') throw new Error();
  } catch {
    throw new InspectionError('INTERNAL_ERROR', 'X402_FACILITATOR_URL must be a valid HTTPS URL');
  }
  return {
    listenHost,
    port: integer(env.PORT, 4021, 1, 65_535),
    environment: env.APP_ENV ?? 'development',
    network,
    paymentsEnabled,
    ...(publicBaseUrl ? { publicBaseUrl } : {}),
    ...(payTo ? { payTo } : {}),
    price: env.X402_PRICE_USD ?? '$0.02',
    facilitatorUrl,
    challengeTag: env.X402_CHALLENGE_TAG ?? 'x402-global-challenge',
    timeoutMs: integer(env.INSPECTION_TIMEOUT_MS, 5_000, 250, 30_000),
    maxRedirects: integer(env.INSPECTION_MAX_REDIRECTS, 5, 0, 10),
  };
}
