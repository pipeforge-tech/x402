# x402 Infrastructure Inspector

A small machine-consumable API that performs bounded infrastructure checks on a
public Internet hostname. The production endpoint is sold per request through
x402, settled in USDC on Algorand through the GoPlausible facilitator.

## Why x402

Autonomous software can buy a DNS, HTTP, TLS, redirect, latency, and security
header report without creating an account, managing an API key, buying a
subscription, or establishing a traditional billing relationship.

## Architecture

```text
caller -> HTTPS -> Hono/x402 middleware -> GoPlausible facilitator
                         |
                         v
                bounded inspector -> public DNS/HTTP/HTTPS only
```

The inspector and payment integration are separate. The receiving server uses
only a public `payTo` address. Payer keys belong in a separate test client and
are never required by this server.

## API

### `GET /health`

Free health, version, network, and uptime metadata.

### `GET /api/v1/inspect?host=example.com`

Returns DNS A/AAAA/MX/NS records, HTTP reachability/status/redirects/latency,
TLS validity/issuer/subject/expiry/protocol, and common security-header presence.
With payments enabled, an unpaid request first receives an x402 `402 Payment
Required` response.

## Security controls

- Accepts only a hostname or literal IP, never a general URL or arbitrary scheme.
- Rejects localhost, single-label/internal names, private, loopback, link-local,
  multicast, unspecified, documentation, carrier-grade NAT, and reserved ranges.
- Rejects the whole hostname if any resolved address is non-public.
- Re-resolves and re-validates every redirect destination.
- Pins each socket to a validated address to limit DNS rebinding.
- Allows only HTTP/HTTPS on ports 80/443, five redirects by default, short
  timeouts, and header-only response processing (the response stream is closed
  immediately without downloading bodies).
- Does not scan ports, CIDRs, UDP services, credentials, or vulnerabilities.

## Development

Requires Node.js 22+ and pnpm.

```bash
cp .env.example .env
pnpm install
pnpm test
pnpm typecheck
pnpm build
pnpm dev
```

Payments are disabled by default so the inspection engine can be developed
without a wallet. Set `PAYMENTS_ENABLED=true` only after configuring the public
TestNet receiver address in `X402_PAY_TO`. Never place a mnemonic or private key
in the resource-server environment.

### Isolated TestNet payer

`pnpm client:testnet` first validates the unpaid 402 without using a key. A
payment is attempted only when `CONFIRM_TESTNET_PAYMENT=yes` and
`AVM_MNEMONIC_FILE` points to an owner-only (`0600`) file outside this
repository. The client verifies that the signer derives the expected payer
address and prints the derived public address before creating a payment. It
will not sign or submit unless `CONFIRM_TESTNET_PAYMENT=yes`. Never put a mnemonic in `.env`, a command
argument, source control, or chat.

## TestNet and production

TestNet is the mandatory first payment gate. The receiver and separate payer
accounts must be funded with TestNet ALGO, opted into TestNet USDC, and the payer
must hold test USDC. The hosted facilitator URL is unchanged for MainNet.

Before production, re-verify all values against [the current challenge notes](docs/CHALLENGE.md),
switch to `X402_NETWORK=mainnet`, use the stable MainNet receiver opted into USDC,
and deploy behind public HTTPS. Do not authorize or perform a MainNet payment
without explicit operator approval.

## Challenge

This project is being prepared for the 2026 Algorand Global x402 Challenge. Its
payment configuration includes Bazaar discovery metadata and the required
`x402-global-challenge` attribution tag.

## License

MIT
