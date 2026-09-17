# Public HTTPS TestNet deployment

## Scope and invariants

The public endpoint is `https://x402.pipeforge.tech`. Caddy terminates TLS and
proxies to the resource server at `127.0.0.1:4021`. The resource server remains
on Algorand TestNet with TestNet USDC ASA `10458941`, receiver
`2UXLRFM6JLSAJWBT5QQOOYTVLJECMKMA7B6PLXIPKKOJ4LUW2XIN6EL3RY`, price `20000`
micro-USDC, the GoPlausible facilitator, Bazaar metadata, and
`x402-global-challenge` attribution.

Never place a payer mnemonic, wallet seed, signing key, or Cloudflare API token
on the resource server. Public validation in this runbook is unpaid and must
stop at HTTP 402. MainNet requires a separate deployment decision and is not a
continuation of this procedure.

## Architecture

```text
Internet
  -> Cloudflare authoritative DNS (A record; DNS-only during certificate setup)
  -> SonicWall WAN TCP 80/443
  -> x40201 192.168.40.10 TCP 80/443
  -> Caddy automatic HTTPS
  -> http://127.0.0.1:4021
  -> x402-infra-inspector.service
```

Do not publish an AAAA record unless routed public IPv6 and matching firewall
policy are deliberately configured and validated.

## Caddy installation and configuration

Debian 12 provides the `caddy` package. Install it, validate the repository
configuration, and then install that exact configuration:

```bash
sudo apt-get update
sudo apt-get install -y caddy
sudo install -o root -g caddy -m 0640 \
  /opt/x402-infra-inspector/current/deploy/Caddyfile /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
sudo systemctl enable caddy.service
```

Do not start Caddy until the DNS and SonicWall prerequisites below are ready.
Starting before public reachability exists causes ACME issuance attempts to
fail; repeated attempts may encounter CA rate limits.

## Cloudflare DNS prerequisite

Create exactly this record after confirming the current WAN address:

| Type | Name | Content | Proxy | TTL |
| --- | --- | --- | --- | --- |
| A | `x402` | `<current WAN IPv4>` | DNS only | Auto |

Remove conflicting A/AAAA records. Use DNS-only mode for initial Caddy ACME
issuance and validation. Cloudflare proxying is optional follow-up work; if it
is enabled later, use Full (strict) origin TLS and retest the complete 402
header and body through Cloudflare.

Verify from a public resolver:

```bash
dig @1.1.1.1 +short A x402.pipeforge.tech
dig @1.1.1.1 +short AAAA x402.pipeforge.tech
```

The A answer must be the current WAN IPv4 and the AAAA answer must be empty.

## SonicWall NAT and firewall prerequisite

Create a host/address object for `x40201` at `192.168.40.10`. Publish only TCP
80 and TCP 443 from the intended WAN address to the same ports on that host.
Create a WAN-to-VLAN40 access rule allowing only those two destination services
to the `x40201` address object, with logging enabled. Do not expose TCP 4021,
SSH, management interfaces, or any other service. Preserve the existing
outbound DNS and HTTPS access used for ACME and the GoPlausible facilitator.

If the firewall represents NAT and access rules separately, use:

| Setting | Value |
| --- | --- |
| Original source | Any |
| Translated source | Original |
| Original destination | WAN primary IP/address object |
| Translated destination | `x40201` / `192.168.40.10` |
| Original service | TCP 80 and TCP 443 only |
| Translated service | Original |
| Inbound interface | WAN |
| Outbound interface | PipeForge VLAN 40 |
| Access rule | WAN to VLAN40, allow only HTTP/HTTPS to `x40201`, logging on |

Restrict the source further only if ACME validation and intended public clients
will still be reachable. Hairpin NAT is optional and is not a substitute for
testing from an actually external network.

## Activation

After public DNS and the SonicWall rules are confirmed:

```bash
sudo systemctl start caddy.service
systemctl status caddy.service --no-pager
sudo journalctl -u caddy.service --no-pager -n 100
ss -lnt | grep -E ':(80|443)[[:space:]]'
```

Caddy should obtain and renew a publicly trusted certificate automatically.
The Node application must still listen only on `127.0.0.1:4021`.

## Public unpaid validation

Run these checks from outside the private network:

```bash
curl --fail --silent --show-error https://x402.pipeforge.tech/health
curl --silent --show-error --output /dev/null --write-out '%{http_code}\n' \
  'https://x402.pipeforge.tech/api/v1/inspect?host=example.com'
VERIFY_BASE_URL=https://x402.pipeforge.tech \
  node /opt/x402-infra-inspector/current/deploy/verify-402.mjs
```

Expected results are HTTP 200 for health and HTTP 402 for inspection. The
verifier must confirm x402 version 2, exact scheme, Algorand TestNet, ASA
`10458941`, amount `20000`, the configured receiver, Bazaar metadata, and the
challenge attribution. The verifier has no signing capability and makes no
payment.

Also confirm that TCP 4021 is not publicly reachable and review both services:

```bash
systemctl status caddy.service x402-infra-inspector.service --no-pager
sudo journalctl -u caddy.service -u x402-infra-inspector.service \
  --no-pager -n 200
```

## Rollback

To withdraw public access while leaving the private resource server intact:

1. Disable the SonicWall WAN-to-VLAN40 access rule and NAT policy.
2. Remove the public DNS record.
3. Stop Caddy with `sudo systemctl stop caddy.service`.
4. Confirm that `x402-infra-inspector.service` remains healthy on
   `127.0.0.1:4021`.

Do not delete Caddy certificate state during an ordinary rollback. Application
rollback remains the commit-pinned symlink procedure in `docs/DEPLOYMENT.md`.
