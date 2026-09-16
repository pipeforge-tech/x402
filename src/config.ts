import { InspectionError } from './errors.js';

export interface AppConfig {
  port: number;
  environment: string;
  network: 'testnet' | 'mainnet';
  paymentsEnabled: boolean;
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
  const network = env.X402_NETWORK ?? 'testnet';
  if (network !== 'testnet' && network !== 'mainnet') throw new Error('X402_NETWORK must be testnet or mainnet');
  const paymentsEnabled = env.PAYMENTS_ENABLED === 'true';
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
    port: integer(env.PORT, 4021, 1, 65_535),
    environment: env.APP_ENV ?? 'development',
    network,
    paymentsEnabled,
    ...(payTo ? { payTo } : {}),
    price: env.X402_PRICE_USD ?? '$0.02',
    facilitatorUrl,
    challengeTag: env.X402_CHALLENGE_TAG ?? 'x402-global-challenge',
    timeoutMs: integer(env.INSPECTION_TIMEOUT_MS, 5_000, 250, 30_000),
    maxRedirects: integer(env.INSPECTION_MAX_REDIRECTS, 5, 0, 10),
  };
}
