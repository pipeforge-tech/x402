import { readFile, stat } from 'node:fs/promises';
import { seedFromMnemonic } from '@algorandfoundation/algokit-utils/algo25';
import { ed25519SigningKeyFromWrappedSecret, type WrappedEd25519Seed } from '@algorandfoundation/algokit-utils/crypto';
import { x402Client, x402HTTPClient } from '@x402/fetch';
import type { Network, PaymentRequired } from '@x402/core/types';
import { ExactAvmScheme, getTransactionId, toClientAvmSigner } from '@x402/avm';

const resourceUrl = 'https://x402.pipeforge.tech/api/v1/inspect?host=example.com';
const network = 'algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=' as Network;
const asset = '31566704';
const amount = '20000';
const payer = 'TGRD7KGVCHPFWBONY7ZNN2NFRD75CQOVYISL6WOJV3MKO6T3FVBR3LAZGE';
const receiver = '6Q7MNZLDJUMRHPPQIV3XPKGWONZQQG4GSFLQMUGG2PDZJHIOCZKVDC3OAU';
const challengeTag = 'x402-global-challenge';
const facilitatorUrl = 'https://facilitator.goplausible.xyz';
const mnemonicFile = '/run/user/1000/x402-infra-inspector-mainnet/payer.mnemonic';

type AccountState = {
  address: string;
  amount: number;
  minBalance: number;
  usdc: number;
  frozen: boolean;
  round: number;
};

async function json(url: string): Promise<unknown> {
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`Read-only preflight request failed with HTTP ${response.status}: ${url}`);
  return response.json();
}

async function accountState(address: string): Promise<AccountState> {
  const value = await json(`https://mainnet-api.algonode.cloud/v2/accounts/${address}`) as {
    address: string;
    amount: number;
    'min-balance': number;
    round: number;
    assets?: Array<{ amount: number; 'asset-id': number; 'is-frozen': boolean }>;
  };
  const holding = value.assets?.find(item => item['asset-id'] === Number(asset));
  if (value.address !== address || !holding) throw new Error(`Account ${address} is not opted into USDC ASA ${asset}`);
  return {
    address,
    amount: value.amount,
    minBalance: value['min-balance'],
    usdc: holding.amount,
    frozen: holding['is-frozen'],
    round: value.round,
  };
}

function assertPaymentRequired(required: PaymentRequired): void {
  if (required.x402Version !== 2) throw new Error(`Unexpected x402 version ${required.x402Version}`);
  if (required.resource.url !== resourceUrl) throw new Error(`Unexpected resource URL ${required.resource.url}`);
  if (!required.extensions?.bazaar) throw new Error('Bazaar metadata is missing');
  const accepted = required.accepts.find(item =>
    item.scheme === 'exact' &&
    item.network === network &&
    item.asset === asset &&
    item.amount === amount &&
    item.payTo === receiver &&
    item.extra?.tag === challengeTag,
  );
  if (!accepted) throw new Error('Live payment requirement differs from the authorized values');
}

async function signerFromExternalMnemonic() {
  const metadata = await stat(mnemonicFile);
  if (!metadata.isFile() || metadata.uid !== 1000 || (metadata.mode & 0o077) !== 0) {
    throw new Error('MainNet mnemonic file must be a UID 1000 owner-only regular file');
  }
  const seed = seedFromMnemonic((await readFile(mnemonicFile, 'utf8')).trim());
  const seedCopy = new Uint8Array(seed);
  const wrappedSeed: WrappedEd25519Seed = {
    unwrapEd25519Seed: async () => seed,
    wrapEd25519Seed: async () => undefined,
  };
  const signingKey = await ed25519SigningKeyFromWrappedSecret(wrappedSeed);
  return toClientAvmSigner(Buffer.concat([
    Buffer.from(seedCopy),
    Buffer.from(signingKey.ed25519Pubkey),
  ]).toString('base64'));
}

async function main(): Promise<void> {
  const supported = await json(`${facilitatorUrl}/supported`) as {
    kinds?: Array<{ x402Version: number; scheme: string; network: string }>;
  };
  if (!supported.kinds?.some(item => item.x402Version === 2 && item.scheme === 'exact' && item.network === network)) {
    throw new Error('GoPlausible no longer supports the authorized MainNet identifier');
  }

  const [payerBefore, receiverBefore] = await Promise.all([
    accountState(payer),
    accountState(receiver),
  ]);
  if (payerBefore.frozen || receiverBefore.frozen) throw new Error('A MainNet USDC holding is frozen');
  if (payerBefore.usdc < Number(amount)) throw new Error(`Payer has only ${payerBefore.usdc} micro-USDC`);
  if (receiverBefore.usdc !== 0) throw new Error(`Receiver pre-payment balance is ${receiverBefore.usdc}, expected 0`);

  const signer = await signerFromExternalMnemonic();
  if (signer.address !== payer) throw new Error(`Derived payer ${signer.address} does not match the authorized payer`);

  const client = new x402Client().register(network, new ExactAvmScheme(signer));
  const httpClient = new x402HTTPClient(client);
  const unpaid = await fetch(resourceUrl);
  if (unpaid.status !== 402) throw new Error(`Expected live HTTP 402, received ${unpaid.status}`);
  const required = httpClient.getPaymentRequiredResponse(name => unpaid.headers.get(name), await unpaid.clone().json());
  assertPaymentRequired(required);

  // This is the sole signing operation. There is intentionally no retry or
  // recovery path after payload creation or submission.
  const paymentPayload = await client.createPaymentPayload(required);
  const avmPayload = paymentPayload.payload as { paymentGroup: string[]; paymentIndex: number };
  const transactionId = getTransactionId(Buffer.from(avmPayload.paymentGroup[avmPayload.paymentIndex], 'base64'));
  const paymentHeaders = httpClient.encodePaymentSignatureHeader(paymentPayload);

  const paid = await fetch(resourceUrl, { headers: paymentHeaders });
  const settlement = httpClient.getPaymentSettleResponse(name => paid.headers.get(name));
  const body = await paid.json() as Record<string, unknown>;
  const inspectionValid =
    body.target === 'example.com' &&
    typeof body.timestamp === 'string' &&
    typeof body.dns === 'object' && body.dns !== null &&
    typeof body.http === 'object' && body.http !== null &&
    typeof body.tls === 'object' && body.tls !== null &&
    typeof body.security_headers === 'object' && body.security_headers !== null;

  console.log(JSON.stringify({
    payment_attempts: 1,
    payer_address_verified: true,
    facilitator_supported: true,
    unpaid_requirement_verified: true,
    bazaar_metadata_present: true,
    challenge_attribution: challengeTag,
    pre_payment: { payer: payerBefore, receiver: receiverBefore },
    transaction_id: transactionId,
    settlement,
    final_http_status: paid.status,
    inspection_valid: inspectionValid,
  }, null, 2));

  if (paid.status !== 200 || !inspectionValid || !settlement.success || settlement.transaction !== transactionId) {
    throw new Error(`One-shot payment response failed validation; transaction ${transactionId} requires investigation`);
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
