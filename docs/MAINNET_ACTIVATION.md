# Future MainNet activation and rollback runbook

This runbook is deliberately stopped before signing. It may be executed only in
a later task with explicit authorization to switch the service to MainNet. A
separate explicit authorization is required after unpaid verification before
exactly one MainNet payment may be signed and submitted.

## Preconditions

1. Pin the validated release commit and preserve the currently active TestNet
   release ID plus a protected copy of its environment.
2. Verify the fresh MainNet receiver public address from two operator-controlled
   sources. Confirm it is not either documented TestNet account.
3. Read the receiver from a MainNet indexer. Confirm at least 0.2 ALGO remains,
   ASA `31566704` is opted in, and its baseline USDC balance is recorded.
4. Independently verify the fresh validation payer on the operator workstation.
   Confirm its signer derives the recorded public address, it is opted in to ASA
   `31566704`, and it holds only the approved ALGO and USDC balances. Do not copy
   its signer or credential-file path to the server.
5. Re-verify MainNet USDC ASA `31566704` using the current Algorand/Circle
   sources and a MainNet indexer. Check name, unit, decimals, creator/identity,
   and asset ID rather than relying only on a ticker.
6. Fetch `https://facilitator.goplausible.xyz/supported`. Confirm x402 version 2,
   scheme `exact`, the live Algorand MainNet identifier, and the advertised fee
   payer. Resolve any difference from `docs/MAINNET_PREPARATION.md` before
   proceeding.
7. Create a protected server environment from
   `deploy/environment.mainnet.example`. Supply only the fresh receiver public
   address and explicitly approved price. Confirm no payer/mnemonic/private-key
   variable is present.
8. Run tests, ESLint, type checking, and the production build against the exact
   release. Run `pnpm preflight:mainnet` with the protected environment loaded;
   it prints only public configuration and must report
   `ready-for-unpaid-mainnet-activation-check`.

## Authorized configuration switch

Only after explicit authorization to activate MainNet:

1. Install the protected MainNet environment using the existing root-managed
   deployment procedure. Do not change Caddy, Cloudflare, SonicWall, SSH, or
   sudoers.
2. Restart only `x402-infra-inspector.service` using the command approved for
   that host. No privileged command is executed by this preparation runbook.
3. Verify `/health` reports `mainnet` and the application remains bound only to
   `127.0.0.1:4021` behind Caddy.
4. Make an unsigned public request to:
   `https://x402.pipeforge.tech/api/v1/inspect?host=example.com`.
   Require HTTP `402`; do not attach any payment header.
5. Independently base64-decode `PAYMENT-REQUIRED` on the operator workstation.
   Verify all of the following exactly:
   - x402 version `2`;
   - scheme `exact`;
   - the currently supported Algorand MainNet network identifier;
   - MainNet USDC ASA `31566704`;
   - the explicitly approved atomic amount;
   - the fresh MainNet receiver address;
   - canonical resource URL
     `https://x402.pipeforge.tech/api/v1/inspect?host=example.com`;
   - Bazaar input/output metadata and schema;
   - `extra.tag = "x402-global-challenge"`; and
   - the currently advertised GoPlausible fee payer, if supplied.
6. Compare the decoded requirement with the protected environment and the
   receiver/indexer records. Save the unpaid response as deployment evidence.
7. **Stop before constructing or signing a payment.** MainNet activation of the
   unpaid 402 does not authorize spending.
8. Request new, explicit authorization for exactly one payment specifying the
   endpoint, payer, receiver, ASA `31566704`, atomic amount, maximum total spend,
   and time window. Without that authorization, roll back or leave the unpaid
   MainNet endpoint as directed; never sign or submit.

## Rollback to the validated TestNet state

1. Restore the protected TestNet environment matching
   `deploy/environment.testnet.example`, including `X402_NETWORK=testnet`, ASA
   `10458941`, the validated TestNet receiver, `$0.02`, GoPlausible URL,
   `https://x402.pipeforge.tech`, and `x402-global-challenge`.
2. Point the deployment's `current` symlink back to the previously recorded
   validated TestNet release commit if the application release was changed.
3. Restart only `x402-infra-inspector.service` through the approved privileged
   operator procedure.
4. Verify `/health` reports `testnet`.
5. Fetch the public inspection endpoint without a payment and require HTTP 402.
   Decode it and verify TestNet full-genesis-hash network, ASA `10458941`, amount
   `20000`, validated TestNet receiver, canonical HTTPS URL, Bazaar metadata,
   and `x402-global-challenge`.
6. Do not make a rollback payment. Leave Caddy, Cloudflare, SonicWall, SSH, and
   sudoers unchanged.
