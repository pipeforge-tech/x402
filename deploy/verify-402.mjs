/* global fetch, Buffer, console, process, URL */

const expected = {
  network: 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=',
  asset: '10458941',
  amount: '20000',
  payTo: '2UXLRFM6JLSAJWBT5QQOOYTVLJECMKMA7B6PLXIPKKOJ4LUW2XIN6EL3RY',
  tag: 'x402-global-challenge',
};

const baseUrl = new URL(process.env.VERIFY_BASE_URL ?? 'http://127.0.0.1:4021');
if (!['http:', 'https:'].includes(baseUrl.protocol)) throw new Error('VERIFY_BASE_URL must use HTTP or HTTPS');
const endpoint = new URL('/api/v1/inspect?host=example.com', baseUrl);
const response = await fetch(endpoint);
if (response.status !== 402) throw new Error(`Expected 402, received ${response.status}`);
const encoded = response.headers.get('payment-required');
if (!encoded) throw new Error('Missing PAYMENT-REQUIRED header');
const requirement = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
const accepted = requirement.accepts?.find(item =>
  item.scheme === 'exact' &&
  item.network === expected.network &&
  item.asset === expected.asset &&
  item.amount === expected.amount &&
  item.payTo === expected.payTo &&
  item.extra?.tag === expected.tag,
);
if (requirement.x402Version !== 2 || !accepted) throw new Error('Unexpected x402 payment requirement');
if (!requirement.extensions?.bazaar) throw new Error('Missing Bazaar discovery metadata');
console.log(JSON.stringify({
  endpoint: endpoint.toString(),
  status: response.status,
  x402Version: requirement.x402Version,
  scheme: accepted.scheme,
  network: accepted.network,
  asset: accepted.asset,
  amount: accepted.amount,
  payTo: accepted.payTo,
  tag: accepted.extra.tag,
  bazaar: true,
}, null, 2));
