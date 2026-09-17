# Public TestNet validation evidence

## Milestone

The public end-to-end x402 TestNet milestone was completed on 2026-09-17.
The paid validation used the public endpoint:

`https://x402.pipeforge.tech/api/v1/inspect?host=example.com`

The deployed application release contained the canonical public-resource URL fix
from commit `50faf06f01e2841fdc7b78438d8812449321fd7b`. The separate payer
preflight hardening was completed in commit
`59555a3d55d20816560c290f82a385dbdceaae07` and remained external to the
resource server.

## Unpaid payment requirement

The initial public request returned HTTP `402`. Its `PAYMENT-REQUIRED` value
decoded to:

- x402 version: `2`
- scheme: `exact`
- network: Algorand TestNet,
  `algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=`
- asset: TestNet USDC ASA `10458941`
- exact amount: `20000` micro-USDC (`0.02` USDC)
- payer public address:
  `ADBNOSHDDGCDA4TOJSWM6LTZFIWOMGAZVCR75CY6OKI2K2JFVYMW3U6SLY`
- receiver public address:
  `2UXLRFM6JLSAJWBT5QQOOYTVLJECMKMA7B6PLXIPKKOJ4LUW2XIN6EL3RY`
- canonical resource URL:
  `https://x402.pipeforge.tech/api/v1/inspect?host=example.com`
- challenge attribution: `x402-global-challenge`
- Bazaar discovery metadata: present, including HTTP input metadata, JSON output
  example, and input/output schema

The inspection output represented the target, timestamp, DNS records (IPv4,
IPv6, MX, and nameservers), HTTP reachability, status, final URL, redirect count,
latency, TLS presence/validity/issuer/subject/expiry/protocol, and security-header
presence (HSTS, CSP, X-Content-Type-Options, Referrer-Policy, and
Permissions-Policy).

## Settlement and indexed transfer

GoPlausible settlement succeeded and the paid retry returned final HTTP `200`
with the requested inspection result.

- transaction ID:
  `OHMTPWPLVJWCIZ4CUYUILAUJHAUXI45XMSHVBGLN2MZ44UMYYT5A`
- confirmed round: `67404046`
- indexed sender:
  `ADBNOSHDDGCDA4TOJSWM6LTZFIWOMGAZVCR75CY6OKI2K2JFVYMW3U6SLY`
- indexed receiver:
  `2UXLRFM6JLSAJWBT5QQOOYTVLJECMKMA7B6PLXIPKKOJ4LUW2XIN6EL3RY`
- indexed asset: ASA `10458941`
- indexed amount: `20000` micro-USDC
- payer USDC balance: `4,980,000` before, `4,960,000` after
- receiver USDC balance: `20,000` before, `40,000` after
- exact observed balance movement: `20,000` micro-USDC

The transaction fields and confirmed round were independently re-read from the
public AlgoNode TestNet indexer on 2026-09-17.

## Public TLS and architecture

An unpaid recheck on 2026-09-17 completed a trusted TLS 1.3 handshake, matched
the certificate subject alternative name for `x402.pipeforge.tech`, and returned
HTTP/2 `402` from Caddy. The certificate was issued by Let's Encrypt and passed
certificate verification.

The deployed server architecture is:

```text
Internet HTTPS
  -> Caddy on TCP 80/443
  -> application on 127.0.0.1:4021
```

The application is not directly exposed on port 4021.

## Credential isolation and verification

The payer signing credential stayed only in the existing owner-only external
credential file on the development workstation. No mnemonic, private key,
signing credential, or credential-file content was printed, committed, or copied
to `x40201`. The resource server held only the public receiver address.

Final verification after the public TestNet payment completed successfully:

- tests: `47` passed
- ESLint: passed
- TypeScript type checking: passed
- production build: passed

No MainNet wallet was created or funded, no MainNet opt-in occurred, no MainNet
transaction was signed or submitted, and no MainNet action occurred during this
milestone.

