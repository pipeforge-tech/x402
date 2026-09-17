import { InspectionError } from './errors.js';
import {
  isValidAlgorandAddress,
  USDC_MAINNET_ASA_ID,
  USDC_TESTNET_ASA_ID,
} from '@x402/avm';

const MAINNET_CHALLENGE_TAG = 'x402-global-challenge';
const TESTNET_ADDRESSES = new Set([
  'ADBNOSHDDGCDA4TOJSWM6LTZFIWOMGAZVCR75CY6OKI2K2JFVYMW3U6SLY',
  '2UXLRFM6JLSAJWBT5QQOOYTVLJECMKMA7B6PLXIPKKOJ4LUW2XIN6EL3RY',
]);
const PAYER_CREDENTIAL_ENV_VARS = [
  'AVM_MNEMONIC_FILE',
  'AVM_PRIVATE_KEY',
  'X402_PAYER_MNEMONIC',
  'X402_PAYER_PRIVATE_KEY',
] as const;

export interface AppConfig {
  listenHost: '127.0.0.1';
  port: number;
  environment: string;
  network: 'testnet' | 'mainnet';
  paymentsEnabled: boolean;
  publicBaseUrl?: string;
  payTo?: string;
  asset: string;
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
  if (paymentsEnabled && network === 'mainnet' && !publicBaseUrl?.startsWith('https://')) {
    throw new Error('PUBLIC_BASE_URL must use HTTPS for MainNet');
  }
  const payTo = env.X402_PAY_TO?.trim();
  if (paymentsEnabled && !payTo) throw new Error('X402_PAY_TO is required when payments are enabled');
  if (payTo && !isValidAlgorandAddress(payTo)) throw new Error('X402_PAY_TO must be a valid Algorand address');
  const configuredAsset = env.X402_ASSET_ID?.trim();
  if (paymentsEnabled && network === 'mainnet' && !configuredAsset) {
    throw new Error('X402_ASSET_ID must be explicitly configured for MainNet');
  }
  const asset = configuredAsset ?? (network === 'mainnet' ? USDC_MAINNET_ASA_ID : USDC_TESTNET_ASA_ID);
  if (network === 'mainnet' && asset !== USDC_MAINNET_ASA_ID) {
    throw new Error(`MainNet requires USDC ASA ${USDC_MAINNET_ASA_ID}`);
  }
  if (network === 'testnet' && asset !== USDC_TESTNET_ASA_ID) {
    throw new Error(`TestNet requires USDC ASA ${USDC_TESTNET_ASA_ID}`);
  }
  const configuredPrice = env.X402_PRICE_USD?.trim();
  if (paymentsEnabled && network === 'mainnet' && !configuredPrice) {
    throw new Error('X402_PRICE_USD must be explicitly configured for MainNet');
  }
  const price = configuredPrice ?? '$0.02';
  if (!/^\$(?:0|[1-9]\d*)(?:\.\d{1,6})?$/.test(price) || Number(price.slice(1)) <= 0) {
    throw new Error('X402_PRICE_USD must be a positive USD amount with at most 6 decimal places');
  }
  const challengeTag = env.X402_CHALLENGE_TAG?.trim() ?? MAINNET_CHALLENGE_TAG;
  if (paymentsEnabled && network === 'mainnet' && challengeTag !== MAINNET_CHALLENGE_TAG) {
    throw new Error(`MainNet X402_CHALLENGE_TAG must be ${MAINNET_CHALLENGE_TAG}`);
  }
  if (paymentsEnabled && network === 'mainnet' && payTo && TESTNET_ADDRESSES.has(payTo)) {
    throw new Error('MainNet X402_PAY_TO must be a fresh address and must not reuse a known TestNet account');
  }
  if (paymentsEnabled && network === 'mainnet') {
    const credentialVariable = PAYER_CREDENTIAL_ENV_VARS.find(name => Boolean(env[name]?.trim()));
    if (credentialVariable) {
      throw new Error(`${credentialVariable} must not exist in the MainNet resource-server environment`);
    }
  }
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
    asset,
    price,
    facilitatorUrl,
    challengeTag,
    timeoutMs: integer(env.INSPECTION_TIMEOUT_MS, 5_000, 250, 30_000),
    maxRedirects: integer(env.INSPECTION_MAX_REDIRECTS, 5, 0, 10),
  };
}

export function loadMainnetConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const config = loadConfig(env);
  if (config.network !== 'mainnet') throw new Error('MainNet preflight requires X402_NETWORK=mainnet');
  if (!config.paymentsEnabled) throw new Error('MainNet preflight requires PAYMENTS_ENABLED=true');
  return config;
}
