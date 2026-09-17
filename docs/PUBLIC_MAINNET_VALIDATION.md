# Public MainNet validation evidence

## Milestone

The public end-to-end x402 MainNet validation completed on 2026-09-17 against:

`https://x402.pipeforge.tech/api/v1/inspect?host=example.com`

Exactly one payment attempt was authorized, signed, and submitted. The client
contained no retry or recovery branch, and no second payment was attempted.

## Immediate pre-payment verification

Immediately before signing, the client re-read GoPlausible `/supported`, both
accounts from Algorand MainNet algod, the payer credential's derived public
address, and the live unpaid HTTP 402.

- x402 version: `2`
- scheme: `exact`
- network:
  `algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=`
- asset: MainNet USDC ASA `31566704`
- amount: `20000` micro-USDC (`0.02` USDC)
- payer:
  `TGRD7KGVCHPFWBONY7ZNN2NFRD75CQOVYISL6WOJV3MKO6T3FVBR3LAZGE`
- receiver:
  `6Q7MNZLDJUMRHPPQIV3XPKGWONZQQG4GSFLQMUGG2PDZJHIOCZKVDC3OAU`
- canonical resource URL:
  `https://x402.pipeforge.tech/api/v1/inspect?host=example.com`
- challenge attribution: `x402-global-challenge`
- Bazaar discovery metadata: present
- GoPlausible MainNet support: x402 v2 `exact` present for the exact full-hash
  network identifier

The owner-only external Algo25 mnemonic derived exactly to the authorized payer.
Its contents were not printed, logged, committed, embedded in an environment,
or copied to `x40201`.

Immediate pre-payment balances at MainNet round `65142027` were:

- payer: `249000` microALGO and `1000000` micro-USDC
- receiver: `249000` microALGO and `0` micro-USDC

Both accounts were opted in to ASA `31566704`, and neither holding was frozen.

## Settlement and indexed transfer

GoPlausible returned settlement success and the paid resource response returned
HTTP `200` with a valid `example.com` infrastructure inspection.

- transaction ID:
  `XJ7NRFF46DKSLMOZGXZV3QTAKCAGELYUZMBF7P4IIKUVKNEERFIQ`
- confirmed round: `65142030`
- indexed genesis ID: `mainnet-v1.0`
- indexed sender:
  `TGRD7KGVCHPFWBONY7ZNN2NFRD75CQOVYISL6WOJV3MKO6T3FVBR3LAZGE`
- indexed receiver:
  `6Q7MNZLDJUMRHPPQIV3XPKGWONZQQG4GSFLQMUGG2PDZJHIOCZKVDC3OAU`
- indexed asset: ASA `31566704`
- indexed amount: `20000` micro-USDC
- payer USDC: `1000000` before, `980000` after
- receiver USDC: `0` before, `20000` after
- exact payer decrease: `20000` micro-USDC
- exact receiver increase: `20000` micro-USDC

AlgoNode MainNet algod and indexer independently agreed on both post-payment
balances at round `65142036`. The indexer independently returned the transaction
fields and confirmed round.

## Resource and metadata verification

The paid response was HTTP `200`. Its JSON inspection result contained the
expected target `example.com`, timestamp, DNS, HTTP, TLS, and security-header
categories.

A separate unsigned request after settlement returned HTTP `402` and reconfirmed
all of the following without making another payment:

- x402 version `2` and scheme `exact`
- the full-hash Algorand MainNet identifier
- MainNet USDC ASA `31566704`
- amount `20000`
- the authorized receiver
- the canonical public HTTPS resource URL
- `x402-global-challenge`
- Bazaar metadata present

No Cloudflare, Caddy, SonicWall, SSH, or sudoers configuration was altered. No
second MainNet payment was constructed, signed, or submitted.

