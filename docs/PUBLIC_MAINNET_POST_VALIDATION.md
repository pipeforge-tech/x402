# Public MainNet POST validation evidence

## Milestone

The paid `POST /api/v1/inspect` path was validated end to end on 2026-10-01
against:

`https://x402.pipeforge.tech/api/v1/inspect`

Exactly one payment attempt was authorized, signed, and submitted. The payer
contained no payment retry or recovery branch. The request body was:

```json
{ "host": "example.com" }
```

## Pre-payment verification

Immediately before signing, the one-shot payer re-read GoPlausible
`/supported`, both Algorand MainNet accounts, the locally derived payer address,
and the live unsigned POST challenge. It verified:

- x402 version `2` and scheme `exact`;
- the GoPlausible-compatible Algorand MainNet identifier;
- MainNet USDC ASA `31566704`;
- amount `20000` micro-USDC (`0.02` USDC);
- receiver `6Q7MNZLDJUMRHPPQIV3XPKGWONZQQG4GSFLQMUGG2PDZJHIOCZKVDC3OAU`;
- canonical resource URL `https://x402.pipeforge.tech/api/v1/inspect`;
- `x402-global-challenge` attribution;
- Bazaar input metadata describing method `POST`, body type `json`, and the
  exact example request body; and
- a local owner-only mnemonic that derived to the authorized payer
  `TGRD7KGVCHPFWBONY7ZNN2NFRD75CQOVYISL6WOJV3MKO6T3FVBR3LAZGE`.

The payer held `980000` micro-USDC and the receiver held `20000` micro-USDC
before payment. Neither holding was frozen.

## Settlement and paid response

GoPlausible returned settlement success and the paid POST returned HTTP `200`
with a valid infrastructure inspection containing the target, timestamp, DNS,
HTTP, TLS, and security-header categories.

- transaction ID:
  `JRSIKVFRYD47S6URN5MCOOB4UGG5OUOOUGRZ3OE6PQ4JIZ5DIUDA`
- confirmed round: `65567916`
- indexed confirmation time: `2026-10-01T11:35:30Z`
- indexed sender:
  `TGRD7KGVCHPFWBONY7ZNN2NFRD75CQOVYISL6WOJV3MKO6T3FVBR3LAZGE`
- indexed receiver:
  `6Q7MNZLDJUMRHPPQIV3XPKGWONZQQG4GSFLQMUGG2PDZJHIOCZKVDC3OAU`
- indexed asset: ASA `31566704`
- indexed amount: `20000` micro-USDC
- payer USDC: `980000` before to `960000` after
- receiver USDC: `20000` before to `40000` after

The one-shot payer calculated the transaction ID before submission, and the
facilitator settlement response and public AlgoNode indexer returned the same
ID. The exact payer decrease and receiver increase were both independently
re-read as `20000` micro-USDC.

## Bazaar observation

By `2026-10-01T11:36:45Z`, at most 75 seconds after on-chain confirmation, the
public GoPlausible Bazaar-filtered MainNet resource query returned resource
`15cfe43756ea272e` with:

- method `POST`;
- merchant `849069d9cc31ff3f` and the MainNet receiver;
- price `0.02` USDC;
- two MainNet settlements; and
- total MainNet volume `0.04` USDC.

GoPlausible reused the existing resource ID and changed its displayed method
from GET to POST rather than publishing a second resource row for the same API
path. Both GET and POST remain live and are independently described by their
unsigned Bazaar challenges and the well-known discovery manifest.

## Credential handling

The payer mnemonic remained in an owner-only local runtime file for this
one-shot operation. It was not printed, logged, committed, copied to the
resource server, or placed in an environment file. The temporary runtime copy
was removed immediately after the settlement and independent verification; the
password manager remains the source of record.
