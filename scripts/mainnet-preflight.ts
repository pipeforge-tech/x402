import { loadMainnetConfig } from '../src/config.js';

const config = loadMainnetConfig();

console.log(JSON.stringify({
  status: 'ready-for-unpaid-mainnet-activation-check',
  network: config.network,
  publicBaseUrl: config.publicBaseUrl,
  asset: config.asset,
  price: config.price,
  payTo: config.payTo,
  facilitatorUrl: config.facilitatorUrl,
  challengeTag: config.challengeTag,
  payerCredentialPresent: false,
}, null, 2));
