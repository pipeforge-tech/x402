# MainNet preparation

Retrieved and verified on 2026-09-17. This document is preparation only. It
does not authorize creating or funding accounts, opting in to an asset, changing
the live service, signing a transaction, or submitting a payment.

## Verified current requirements

### x402 and Algorand payment requirement

- Protocol version: x402 v2.
- Scheme: `exact`.
- Verified MainNet USDC asset: Algorand ASA `31566704`, with 6 decimals.
- Amounts are expressed in the asset's atomic units. The planned `$0.02` price
  therefore becomes exactly `20000` micro-USDC in the payment requirement.
- The receiver must opt in to ASA `31566704` before it can receive USDC.
- Each payment payload must match the advertised network, amount, receiver, and
  asset. Each top-level transaction must be signed by its sender. The facilitator
  verifies/simulates the atomic group and submits it only during settlement.

### Current network-identifier compatibility

GoPlausible's live `/supported` response currently advertises MainNet as:

`algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=`

It advertises x402 version `2`, scheme `exact`, and fee payer:

`ZMFK2OI7ZBD2U27ISERZC4S6LKM6WMFJPZQ4MYNJDZ2VNBNMBA67RA22AA`

That full-genesis-hash identifier is the value produced by this application's
current integration (`algorand:${ALGORAND_MAINNET_GENESIS_HASH}`) and is the
identifier to verify in the unpaid MainNet 402 before activation.

There is an upstream transition to track: `@x402/avm` 2.26.0 also exports the
canonical truncated CAIP-2 constant
`algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73k`, normalizes the full form for
compatibility, and its README plus the current x402 Foundation Algorand scheme
spec use the truncated form. The live GoPlausible facilitator still advertises
the full form. Do not independently change this application to the truncated
form until the facilitator advertises/supports the same value and an unpaid
integration check passes.

### Facilitator

- Production URL: `https://facilitator.goplausible.xyz`.
- The same URL serves TestNet and MainNet.
- Its live `/supported` response includes Algorand MainNet and TestNet, x402 v2,
  and `exact` for both.
- The resource server requires only this public URL and its public receiver
  address. It does not need a facilitator key or payer key.

The facilitator's advertised fee payer is operational information, not a value
to pin in the environment template. It is injected into the 402 after the
resource server synchronizes current facilitator support and must be inspected
again immediately before activation.

### Bazaar and challenge

No MainNet-only Bazaar schema or extension setting was found. The payment
requirement's accepted network and asset change to MainNet; the existing Bazaar
HTTP input metadata and JSON output example/schema remain applicable. The
current x402 Bazaar documentation describes the extension as network-neutral.

For the Algorand Global x402 Challenge, the endpoint must be public HTTPS, use
MainNet USDC ASA `31566704`, settle through GoPlausible, retain the stable
MainNet `payTo` address, enable Bazaar discovery metadata, and include
`extra.tag = "x402-global-challenge"`. Competition attribution additionally
requires a later legitimate MainNet settlement and confirmation that the
resource appears in the Bazaar catalog. Neither is part of this preparation.

## Assumptions

- The operator-approved validation price remains `$0.02` (`20000` micro-USDC).
  The template intentionally forces the operator to enter the price rather than
  silently inheriting it.
- The public host remains `https://x402.pipeforge.tech`; no DNS, Cloudflare,
  SonicWall, or Caddy change is expected for a network-only application switch.
- The hosted GoPlausible facilitator remains the required production
  facilitator at activation time.
- A normal Ed25519 account with one ASA holding has a 0.2 ALGO minimum balance:
  0.1 ALGO base plus 0.1 ALGO for the USDC opt-in. Normal opt-in transactions
  additionally need the currently suggested fee (normally 0.001 ALGO).

## Unresolved questions and activation gates

1. The live facilitator's full-genesis-hash identifier differs from the
   truncated identifier now documented by the x402 Foundation specification.
   Re-query `/supported` and test the exact value before deployment; do not
   upgrade x402 packages as part of activation without a separate compatibility
   test.
2. The live `/supported` response currently reports an empty `extensions`
   array even though GoPlausible settlement accepted the existing TestNet
   Bazaar metadata. Confirm with an unpaid MainNet 402 that Bazaar metadata is
   present, then confirm catalog attribution only after a separately authorized
   settlement.
3. The fresh MainNet receiver and payer public addresses do not exist yet and
   must be supplied and independently verified by the operator.
4. The operator must explicitly approve the production price and the maximum
   USDC amount placed in the validation payer.
5. Facilitator availability, advertised fee payer, MainNet support, USDC asset
   identity, receiver opt-in, and payer balances must be rechecked immediately
   before activation because they are external state.

## Fresh-account operational model

Use two fresh, dedicated MainNet accounts. Do not reuse either TestNet account
or mnemonic.

### MainNet receiver

- Purpose: stable public `payTo` identity for this service and challenge.
- Secret custody: offline/hardware wallet or another operator-controlled secure
  wallet; never copied to `x40201`.
- Server material: public address only, in `X402_PAY_TO`.
- Required state: opted in to MainNet USDC ASA `31566704`.
- Protocol minimum after opt-in: 0.2 ALGO. Recommended operational funding:
  0.25 ALGO, leaving room for the opt-in transaction fee and verification.
- Required starting USDC: zero; opt-in creates a zero-balance holding.

### Controlled-validation MainNet payer

- Purpose: exactly one later, separately authorized validation payment.
- Secret custody: owner-only external credential or hardware wallet on the
  operator workstation. Never store the secret, mnemonic, private key, or
  credential-file path on `x40201` or in this repository.
- Required state: opted in to MainNet USDC ASA `31566704`.
- Protocol minimum after opt-in: 0.2 ALGO. Recommended operational funding:
  0.25 ALGO. Although the current facilitator advertises fee sponsorship, this
  buffer permits setup and independent checks without relying on sponsorship.
- Minimum USDC for one `$0.02` validation: 0.02 USDC. Recommended controlled
  funding: 0.03 USDC (30,000 micro-USDC), unless the operator approves a
  different price. Do not place unrelated funds in this account.

## Operator instructions for later account creation and funding

These steps require a future operator action; none were performed here.

1. On an operator-controlled workstation or hardware wallet, select Algorand
   **MainNet** and create two new accounts named for their roles: receiver and
   controlled-validation payer. Do not display or paste either mnemonic into a
   terminal, chat, issue, or repository.
2. Back up each recovery secret using the wallet's secure offline procedure.
   Record only the two public addresses in the operational worksheet.
3. Independently compare each displayed address on two trusted views. Confirm
   neither address equals either TestNet address recorded in
   `PUBLIC_TESTNET_VALIDATION.md`.
4. Fund each new account with 0.25 ALGO from an operator-approved MainNet
   source. Confirm the network is MainNet and the full destination address
   before authorizing each transfer.
5. In the wallet, opt each account in to **USDC ASA 31566704**. Verify the asset
   ID, the `USDC` name, 6 decimals, and Circle identity using current official
   sources; do not select a similarly named asset.
6. Confirm both accounts show an ASA `31566704` holding and remain at or above
   the 0.2 ALGO post-opt-in minimum balance.
7. Fund only the payer with the operator-approved controlled USDC amount (0.03
   USDC recommended for a `$0.02` validation). Leave the receiver at zero USDC
   so later receipt is unambiguous.
8. From a read-only MainNet indexer/explorer, verify each public address, its ALGO
   balance, ASA `31566704` opt-in, and USDC balance. Save transaction IDs for the
   funding and opt-in operations in the private operator record.
9. Put only the receiver public address and approved price into a protected copy
   of `deploy/environment.mainnet.example`. Do not add any payer field.
10. Keep the payer signer external. Before a later payment, derive and compare
    its public address locally, fetch/decode the unpaid 402, and stop before
    signing until a new authorization explicitly permits exactly one payment.

## MainNet preflight implemented in code

When payments are enabled with `X402_NETWORK=mainnet`, startup now refuses:

- a missing or non-HTTPS `PUBLIC_BASE_URL`;
- a missing `X402_ASSET_ID` or any asset other than `31566704`;
- a missing, checksum-invalid, or known TestNet `X402_PAY_TO`;
- a missing, zero, negative, malformed, or over-precision `X402_PRICE_USD`;
- a challenge tag other than `x402-global-challenge`; or
- known payer credential variables (`AVM_MNEMONIC_FILE`, `AVM_PRIVATE_KEY`,
  `X402_PAYER_MNEMONIC`, or `X402_PAYER_PRIVATE_KEY`) in the resource-server
  environment.

The application contains no MainNet payer, signing, or transaction-submission
path. `deploy/environment.mainnet.example` contains operator placeholders only.
Run `pnpm preflight:mainnet` inside the protected MainNet environment before any
activation; it refuses TestNet, disabled payments, unsafe values, or payer
credential variables and prints only public configuration.

## Sources

All sources were retrieved on 2026-09-17.

- x402 Foundation, Algorand `exact` scheme and current CAIP-2 form:
  <https://github.com/x402-foundation/x402/blob/main/specs/schemes/exact/scheme_exact_algo.md>
- x402 Foundation, protocol v2:
  <https://github.com/x402-foundation/x402/blob/main/specs/x402-specification-v2.md>
- x402 Foundation, Bazaar discovery extension:
  <https://github.com/x402-foundation/x402/blob/main/docs/extensions/bazaar.mdx>
- GoPlausible, current Algorand x402 documentation, constants, package changes,
  and hosted facilitator configuration:
  <https://github.com/GoPlausible/.github/blob/main/profile/algorand-x402-documentation/README.md>
- GoPlausible live facilitator support response:
  <https://facilitator.goplausible.xyz/supported>
- Algorand Developer Portal, USDC MainNet ASA `31566704` example:
  <https://tutorials.dev.algorand.co/1-basics/1-introduction/6-assets/>
- Algorand Developer Portal, ASA opt-in and 0.1 ALGO per-asset minimum:
  <https://dev.algorand.co/concepts/assets/overview/>
- Algorand Developer Portal, base 0.1 ALGO account minimum:
  <https://dev.algorand.co/concepts/accounts/overview/>
- Algorand Developer Portal, transaction fees:
  <https://dev.algorand.co/concepts/transactions/fees/>
- Circle, supported chains and currencies (Algorand USDC support):
  <https://developers.circle.com/circle-mint/supported-chains-and-currencies>
- Algorand Foundation, Global x402 Challenge MainNet, facilitator, Bazaar, and
  attribution requirements:
  <https://algorand.co/blog/the-x402-global-challenge-is-live-how-to-build-submit-your-entry>
