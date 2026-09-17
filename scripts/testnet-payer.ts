import { readFile, stat } from 'node:fs/promises';
import { config } from 'dotenv';
import { x402Client, wrapFetchWithPayment, x402HTTPClient } from '@x402/fetch';
import type { Network } from '@x402/core/types';
import { ALGORAND_TESTNET_GENESIS_HASH, ExactAvmScheme, toClientAvmSigner, USDC_TESTNET_ASA_ID } from '@x402/avm';
import { ed25519SigningKeyFromWrappedSecret, type WrappedEd25519Seed } from '@algorandfoundation/algokit-utils/crypto';
import { seedFromMnemonic } from '@algorandfoundation/algokit-utils/algo25';

config();

const expectedPayer = process.env.X402_EXPECTED_PAYER ?? 'ADBNOSHDDGCDA4TOJSWM6LTZFIWOMGAZVCR75CY6OKI2K2JFVYMW3U6SLY';
const expectedReceiver = process.env.X402_EXPECTED_RECEIVER ?? '2UXLRFM6JLSAJWBT5QQOOYTVLJECMKMA7B6PLXIPKKOJ4LUW2XIN6EL3RY';
const resourceUrl = process.env.X402_RESOURCE_URL ?? 'http://127.0.0.1:4021/api/v1/inspect?host=example.com';
const testnetNetwork = `algorand:${ALGORAND_TESTNET_GENESIS_HASH}` as Network;

async function signingKeyFromMnemonicFile(path: string): Promise<string> {
  const metadata = await stat(path);
  if (!metadata.isFile() || (metadata.mode & 0o077) !== 0) {
    throw new Error('Mnemonic file must be a regular file readable only by its owner (mode 0600)');
  }
  const mnemonic = (await readFile(path, 'utf8')).trim();
  const seed = seedFromMnemonic(mnemonic);
  const seedCopy = new Uint8Array(seed);
  const wrappedSeed: WrappedEd25519Seed = {
    unwrapEd25519Seed: async () => seed,
    wrapEd25519Seed: async () => undefined,
  };
  const signingKey = await ed25519SigningKeyFromWrappedSecret(wrappedSeed);
  return Buffer.concat([Buffer.from(seedCopy), Buffer.from(signingKey.ed25519Pubkey)]).toString('base64');
}

async function main(): Promise<void> {
  const initial = await fetch(resourceUrl);
  if (initial.status !== 402) throw new Error(`Expected HTTP 402, received ${initial.status}`);

  const parser = new x402HTTPClient(new x402Client());
  const required = parser.getPaymentRequiredResponse(name => initial.headers.get(name), await initial.clone().json());
  const accepted = required.accepts.find(item =>
    item.scheme === 'exact' &&
    item.network === testnetNetwork &&
    item.payTo === expectedReceiver &&
    item.asset === USDC_TESTNET_ASA_ID,
  );
  if (!accepted) throw new Error('402 does not contain the expected Algorand TestNet USDC payment requirement');
  if (accepted.amount !== '20000') throw new Error(`Expected 20000 micro-USDC, received ${accepted.amount}`);

  console.log(JSON.stringify({
    unpaid_status: initial.status,
    x402_version: required.x402Version,
    requirement: {
      scheme: accepted.scheme,
      network: accepted.network,
      asset: accepted.asset,
      amount: accepted.amount,
      pay_to: accepted.payTo,
      challenge_tag: accepted.extra?.tag,
      bazaar_discovery: Boolean(required.extensions),
    },
  }, null, 2));

  const mnemonicFile = process.env.AVM_MNEMONIC_FILE;
  if (!mnemonicFile) {
    if (process.env.CONFIRM_TESTNET_PAYMENT === 'yes') {
      throw new Error('AVM_MNEMONIC_FILE is required to sign a payment');
    }
    console.log('Credential not checked. Set AVM_MNEMONIC_FILE to verify the payer without paying.');
    return;
  }
  const signer = toClientAvmSigner(await signingKeyFromMnemonicFile(mnemonicFile));
  if (signer.address !== expectedPayer) {
    throw new Error(`Signing credential belongs to ${signer.address}, not the expected payer ${expectedPayer}`);
  }
  console.log(JSON.stringify({ credential_verified: true, derived_payer: signer.address }, null, 2));

  if (process.env.CONFIRM_TESTNET_PAYMENT !== 'yes') {
    console.log('Payment not attempted. Explicit confirmation is still required.');
    return;
  }

  const client = new x402Client().register(testnetNetwork, new ExactAvmScheme(signer));
  const paidResponse = await wrapFetchWithPayment(fetch, client)(resourceUrl);
  const settlement = paidResponse.ok
    ? new x402HTTPClient(client).getPaymentSettleResponse(name => paidResponse.headers.get(name))
    : null;
  const body = await paidResponse.json();
  console.log(JSON.stringify({ status: paidResponse.status, settlement, body }, null, 2));
  if (!paidResponse.ok) process.exitCode = 1;
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
