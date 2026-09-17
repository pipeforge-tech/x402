# TestNet validation evidence

Validated on 2026-09-17 against the GoPlausible hosted facilitator and the
Algorand TestNet indexer.

- Payer: `ADBNOSHDDGCDA4TOJSWM6LTZFIWOMGAZVCR75CY6OKI2K2JFVYMW3U6SLY`
- Receiver: `2UXLRFM6JLSAJWBT5QQOOYTVLJECMKMA7B6PLXIPKKOJ4LUW2XIN6EL3RY`
- Asset: TestNet USDC ASA `10458941`
- Amount: `20000` micro-USDC (`0.02` USDC)
- Transaction: `XN4DU4SZEZKEKZ6FIOCITUJRGTZZEPXFTGPQG4KB3GNFF3WA5KQA`
- Confirmed round: `67394993`
- Receiver balance before: `0`
- Receiver balance after: `20000`
- GoPlausible settlement result: `success: true`
- Final resource response: HTTP `200` with the requested `example.com`
  infrastructure inspection

The unpaid response contained valid x402 v2 TestNet USDC requirements, Bazaar
discovery metadata, and the `x402-global-challenge` tag. The resource and
merchant catalogs did not contain the localhost resource after settlement.
Public Bazaar visibility remains gated on deployment to a stable public HTTPS
URL and a settlement against that URL.
