import { describe, expect, it } from 'vitest';
import { loadConfig, loadMainnetConfig } from '../src/config.js';

const freshMainnetReceiver = 'ZMFK2OI7ZBD2U27ISERZC4S6LKM6WMFJPZQ4MYNJDZ2VNBNMBA67RA22AA';

function mainnetEnv(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    X402_NETWORK: 'mainnet',
    PAYMENTS_ENABLED: 'true',
    PUBLIC_BASE_URL: 'https://x402.pipeforge.tech',
    X402_ASSET_ID: '31566704',
    X402_PAY_TO: freshMainnetReceiver,
    X402_PRICE_USD: '$0.02',
    X402_FACILITATOR_URL: 'https://facilitator.goplausible.xyz',
    X402_CHALLENGE_TAG: 'x402-global-challenge',
    ...overrides,
  };
}

describe('deployment configuration', () => {
  it('binds to IPv4 loopback by default', () => {
    expect(loadConfig({}).listenHost).toBe('127.0.0.1');
  });

  it('refuses an all-interface bind', () => {
    expect(() => loadConfig({ LISTEN_HOST: '0.0.0.0' })).toThrow('LISTEN_HOST must be 127.0.0.1');
  });

  it('normalizes the configured canonical public HTTPS origin', () => {
    expect(loadConfig({ PUBLIC_BASE_URL: 'https://x402.pipeforge.tech/' }).publicBaseUrl).toBe('https://x402.pipeforge.tech');
  });

  it('requires a canonical public base URL when payments are enabled', () => {
    expect(() => loadConfig({ PAYMENTS_ENABLED: 'true' })).toThrow('PUBLIC_BASE_URL is required when payments are enabled');
  });

  it.each([
    'http://x402.pipeforge.tech',
    'https://user:password@x402.pipeforge.tech',
    'https://x402.pipeforge.tech/base',
    'https://x402.pipeforge.tech/?query=value',
    'https://x402.pipeforge.tech/#fragment',
  ])('rejects unsafe or non-origin public base URL %s', value => {
    expect(() => loadConfig({ PUBLIC_BASE_URL: value })).toThrow('PUBLIC_BASE_URL must be an HTTPS origin');
  });

  it('accepts a complete, separated MainNet resource-server configuration', () => {
    const result = loadMainnetConfig(mainnetEnv());
    expect(result).toMatchObject({
      network: 'mainnet',
      asset: '31566704',
      payTo: freshMainnetReceiver,
      price: '$0.02',
      challengeTag: 'x402-global-challenge',
    });
  });

  it('requires MainNet and enabled payments in the activation preflight', () => {
    expect(() => loadMainnetConfig({ X402_NETWORK: 'testnet' })).toThrow('X402_NETWORK=mainnet');
    expect(() => loadMainnetConfig(mainnetEnv({ PAYMENTS_ENABLED: 'false' }))).toThrow('PAYMENTS_ENABLED=true');
  });

  it.each([
    ['X402_ASSET_ID', '10458941', 'USDC ASA 31566704'],
    ['X402_PAY_TO', '2UXLRFM6JLSAJWBT5QQOOYTVLJECMKMA7B6PLXIPKKOJ4LUW2XIN6EL3RY', 'fresh address'],
    ['PUBLIC_BASE_URL', 'http://localhost', 'HTTPS for MainNet'],
    ['X402_CHALLENGE_TAG', '', 'x402-global-challenge'],
  ])('rejects unsafe MainNet %s values', (name, value, message) => {
    expect(() => loadConfig(mainnetEnv({ [name]: value }))).toThrow(message);
  });

  it('requires an explicitly configured MainNet asset and price', () => {
    expect(() => loadConfig(mainnetEnv({ X402_ASSET_ID: undefined }))).toThrow('X402_ASSET_ID must be explicitly configured');
    expect(() => loadConfig(mainnetEnv({ X402_PRICE_USD: undefined }))).toThrow('X402_PRICE_USD must be explicitly configured');
  });

  it.each(['AVM_MNEMONIC_FILE', 'AVM_PRIVATE_KEY', 'X402_PAYER_MNEMONIC', 'X402_PAYER_PRIVATE_KEY']) (
    'rejects payer credential variable %s on a MainNet resource server',
    name => {
      expect(() => loadConfig(mainnetEnv({ [name]: 'must-not-be-present' }))).toThrow(`${name} must not exist`);
    },
  );

  it('performs checksum validation on the MainNet receiver', () => {
    expect(() => loadConfig(mainnetEnv({
      X402_PAY_TO: 'A7NMWS3NT3IUDMLVO26ULGXGIIOUQ3ND2TXSER6EBGRZNOBOUIQXHIBGDA',
    }))).toThrow('X402_PAY_TO must be a valid Algorand address');
  });

  it.each(['', '$0', '0.02', '$0.0000001', '$01.00'])('rejects invalid explicit prices %s', value => {
    expect(() => loadConfig(mainnetEnv({ X402_PRICE_USD: value }))).toThrow();
  });
});
