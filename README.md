# x402 Infrastructure Inspector

**A live, pay-per-request infrastructure report for humans and autonomous agents, settled in USDC on Algorand MainNet through x402.**

[Try the public endpoint](https://x402.pipeforge.tech/api/v1/inspect?host=example.com) · [MainNet transaction](https://allo.info/tx/XJ7NRFF46DKSLMOZGXZV3QTAKCAGELYUZMBF7P4IIKUVKNEERFIQ) · [Bazaar resource](https://facilitator.goplausible.xyz/dashboard/resources/15cfe43756ea272e) · [GoPlausible merchant](https://facilitator.goplausible.xyz/dashboard/merchants/849069d9cc31ff3f)

The API inspects a public hostname and returns a bounded JSON report covering DNS, HTTP(S), redirects, latency, TLS, and common security headers. A request costs **0.02 USDC** (`20000` micro-USDC) and needs no account, API key, subscription, or billing relationship.

This is a Standard Entry in the 2026 Algorand Global x402 Challenge. Public TestNet and MainNet flows have both been validated end to end. The MainNet evidence baseline is commit `01d7c62c2845d663d13896d1ce384c07bde2804a` and transaction `XJ7NRFF46DKSLMOZGXZV3QTAKCAGELYUZMBF7P4IIKUVKNEERFIQ`.

## Why this is useful

An agent often needs to understand an unfamiliar host before relying on it: does it resolve, answer over HTTPS, redirect elsewhere, present a valid certificate, and advertise basic browser security headers? This endpoint packages those checks into one predictable, machine-readable purchase. x402 makes the small one-off transaction practical: the caller pays only for the report it needs, while the service receives final USDC settlement without accounts or API-key issuance.

## Live API

### `GET /api/v1/inspect?host=example.com`

The paid response contains:

- DNS A, AAAA, MX, and NS records
- HTTPS/HTTP reachability, status, final URL, redirects, and latency
- TLS presence, validity, issuer, subject, expiry, and negotiated protocol
- HSTS, CSP, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy presence

Call the endpoint without payment to retrieve its machine-readable x402 offer:

```bash
curl -i 'https://x402.pipeforge.tech/api/v1/inspect?host=example.com'
```

The live response is HTTP `402 Payment Required` and advertises:

```text
x402Version: 2
scheme: exact
network: algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=
asset: 31566704
amount: 20000
payTo: 6Q7MNZLDJUMRHPPQIV3XPKGWONZQQG4GSFLQMUGG2PDZJHIOCZKVDC3OAU
resource: https://x402.pipeforge.tech/api/v1/inspect?host=example.com
extra.tag: x402-global-challenge
extensions.bazaar: present
```

No payment is made by this command. A compatible x402 client reads the `PAYMENT-REQUIRED` header, signs the exact Algorand asset transfer, and repeats the request with the payment payload. This repository intentionally does not publish a reusable MainNet payer credential or an automatic payment command.

### `GET /health`

Free health, version, network, and uptime metadata:

```bash
curl 'https://x402.pipeforge.tech/health'
```

## Architecture

```text
x402 client
    |
    | HTTPS request / HTTP 402 / paid retry
    v
Caddy reverse proxy
    |
    v
Hono resource server --------> GoPlausible facilitator
    |                              |
    | public payTo only            | verify + settle
    v                              v
bounded inspector             Algorand MainNet
    |
    +--> DNS
    +--> HTTP(S), redirects, latency
    +--> TLS certificate and protocol
    +--> response security headers
```

The Hono middleware constructs the x402 offer with the Algorand MainNet genesis-hash network identifier, the `exact` AVM scheme, USDC ASA `31566704`, Bazaar discovery metadata, and the `x402-global-challenge` attribution tag. The resource server stores only the public receiver address. Payer signing material is neither needed nor accepted by the production configuration.

Key implementation files:

- [`src/app.ts`](src/app.ts) — x402 middleware, GoPlausible integration, Bazaar metadata, and routes
- [`src/config.ts`](src/config.ts) — fail-closed MainNet configuration and credential rejection
- [`src/target.ts`](src/target.ts) — target parsing and blocked IP ranges
- [`src/resolver.ts`](src/resolver.ts) — public-address-only DNS resolution
- [`src/network.ts`](src/network.ts) — pinned outbound sockets, redirect checks, and bounded probes
- [`docs/PUBLIC_MAINNET_VALIDATION.md`](docs/PUBLIC_MAINNET_VALIDATION.md) — durable MainNet validation record
- [`docs/CHALLENGE_SUBMISSION_AUDIT.md`](docs/CHALLENGE_SUBMISSION_AUDIT.md) — requirement-by-requirement closeout audit

## Security model

The service treats every requested hostname and every redirect as untrusted.

- Input is a hostname or literal IP, never a general URL, user-info URL, or arbitrary scheme.
- Localhost, single-label/internal names, private, loopback, link-local, carrier-grade NAT, documentation, multicast, unspecified, and reserved ranges are rejected for IPv4 and IPv6.
- The entire hostname is rejected if any resolved address is non-public.
- Every redirect is parsed, limited to HTTP(S) on port 80 or 443, re-resolved, and re-validated.
- Each outbound socket is pinned to a previously validated address, limiting DNS-rebinding opportunities between validation and connection.
- Probes have short timeouts and a redirect limit. HTTP response bodies are not downloaded; the stream is closed after status and headers are read.
- The API does not scan ports or CIDRs, send UDP probes, test credentials, exploit vulnerabilities, or expose raw internal errors.

### Credential separation

The production resource server has no payer key. It contains only the public `payTo` address and rejects known payer credential environment variables when MainNet payments are enabled. The one authorized validation payer used an owner-only mnemonic file external to this repository and external to the production host. The mnemonic was not printed, logged, committed, copied to the server, or placed in an environment file.

## MainNet settlement evidence

| Field | Validated value |
| --- | --- |
| Public resource | `https://x402.pipeforge.tech/api/v1/inspect?host=example.com` |
| Network | `algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=` |
| Asset | MainNet USDC ASA `31566704` |
| Amount | `20000` micro-USDC (`0.02` USDC) |
| Receiver | `6Q7MNZLDJUMRHPPQIV3XPKGWONZQQG4GSFLQMUGG2PDZJHIOCZKVDC3OAU` |
| Transaction | [`XJ7NRFF46DKSLMOZGXZV3QTAKCAGELYUZMBF7P4IIKUVKNEERFIQ`](https://allo.info/tx/XJ7NRFF46DKSLMOZGXZV3QTAKCAGELYUZMBF7P4IIKUVKNEERFIQ) |
| Confirmed round | `65142030` |
| Payer USDC | `1000000` before → `980000` after |
| Receiver USDC | `0` before → `20000` after |
| Settlement | GoPlausible success; final resource response HTTP `200` |

The public Algorand indexer record is also available as [raw JSON](https://mainnet-idx.algonode.cloud/v2/transactions/XJ7NRFF46DKSLMOZGXZV3QTAKCAGELYUZMBF7P4IIKUVKNEERFIQ). It independently identifies the sender, receiver, ASA, amount, genesis hash, and confirmed round. See the [full evidence record](docs/PUBLIC_MAINNET_VALIDATION.md) for preflight, balance, response, and no-retry details.

## Bazaar and challenge discovery

GoPlausible currently catalogs the endpoint as resource `15cfe43756ea272e` and merchant `849069d9cc31ff3f`:

- [Resource catalog entry](https://facilitator.goplausible.xyz/dashboard/resources/15cfe43756ea272e) — method, description, input schema, output example, TestNet/MainNet accepts, and two successful settlements
- [Merchant catalog entry](https://facilitator.goplausible.xyz/dashboard/merchants/849069d9cc31ff3f) — MainNet receiver, Bazaar status, and challenge status
- [Challenge-filtered resource evidence](https://facilitator.goplausible.xyz/data/leaderboards?range=all&env=mainnet&src=x402-global-challenge&cat=resources&limit=25&offset=0&q=pipeforge)
- [Challenge-filtered merchant evidence](https://facilitator.goplausible.xyz/data/leaderboards?range=all&env=mainnet&src=x402-global-challenge&cat=merchants&limit=25&offset=0&group=merchant&q=6Q7MNZLD)

The live unpaid 402 independently carries `extra.tag = "x402-global-challenge"` and a populated `extensions.bazaar` object.

## Local setup and verification

Requires Node.js 22+ and pnpm 11.

```bash
pnpm install --frozen-lockfile
cp .env.example .env
pnpm test
pnpm lint
pnpm typecheck
pnpm build
pnpm dev
```

Payments are disabled in the development template. With that default, use:

```bash
curl 'http://127.0.0.1:4021/health'
curl 'http://127.0.0.1:4021/api/v1/inspect?host=example.com'
```

For a resource-server-only MainNet preflight, supply public values without any payer credential:

```bash
PUBLIC_BASE_URL=https://x402.pipeforge.tech \
X402_NETWORK=mainnet \
X402_ASSET_ID=31566704 \
PAYMENTS_ENABLED=true \
X402_PAY_TO=6Q7MNZLDJUMRHPPQIV3XPKGWONZQQG4GSFLQMUGG2PDZJHIOCZKVDC3OAU \
X402_PRICE_USD='$0.02' \
X402_FACILITATOR_URL=https://facilitator.goplausible.xyz \
X402_CHALLENGE_TAG=x402-global-challenge \
pnpm preflight:mainnet
```

This preflight validates configuration only. It does not construct, sign, submit, or settle a payment. Production operations are documented in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md), [`docs/PUBLIC_HTTPS.md`](docs/PUBLIC_HTTPS.md), and [`docs/MAINNET_ACTIVATION.md`](docs/MAINNET_ACTIVATION.md).

## Validation history

- [Public TestNet validation](docs/PUBLIC_TESTNET_VALIDATION.md): transaction `OHMTPWPLVJWCIZ4CUYUILAUJHAUXI45XMSHVBGLN2MZ44UMYYT5A`, round `67404046`
- [Public MainNet validation](docs/PUBLIC_MAINNET_VALIDATION.md): transaction `XJ7NRFF46DKSLMOZGXZV3QTAKCAGELYUZMBF7P4IIKUVKNEERFIQ`, round `65142030`
- [Submission audit](docs/CHALLENGE_SUBMISSION_AUDIT.md): current PASS / MISSING-EVIDENCE status and external closeout actions
- [Copy-ready submission text](docs/SUBMISSION.md): project description, usefulness, architecture, evidence, and final checklist

## License

[MIT](LICENSE)
