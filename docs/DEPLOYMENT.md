# Private Debian deployment

## Architecture

The private deployment runs commit-pinned release directories on `x40201`:

```text
local Git commit
  -> git archive
  -> /opt/x402-infra-inspector/releases/<commit>
  -> /opt/x402-infra-inspector/current (symlink)
  -> systemd: x402-infra-inspector.service
  -> Node.js on 127.0.0.1:4021
```

The public TestNet deployment adds Caddy in front of the unchanged loopback
listener. See `docs/PUBLIC_HTTPS.md` for the staged DNS, NAT/firewall, TLS,
validation, and rollback procedure.

## Requirements

- Debian 12 amd64
- Node.js 22 or newer
- pnpm 11.19.0
- Git and curl
- system user/group `x402-inspector` with `/usr/sbin/nologin`

No payer mnemonic, signing key, wallet seed, or SSH private key belongs on the
resource server. The application needs only its public receiver address.

## Filesystem layout

- `/opt/x402-infra-inspector/releases/<commit>` — immutable release source/build
- `/opt/x402-infra-inspector/current` — active-release symlink
- `/etc/x402-infra-inspector/environment` — root-managed runtime configuration
- `/etc/systemd/system/x402-infra-inspector.service` — service definition

Release directories are owned by deployment user `grizz` and group
`x402-inspector`; the releases parent is setgid so the service receives read and
traverse access. The service account has no shell and no write requirement.

## Environment

Copy `deploy/environment.testnet.example` to
`/etc/x402-infra-inspector/environment`, owned by `root:x402-inspector` with mode
`0640`. `LISTEN_HOST` is intentionally restricted by application validation to
`127.0.0.1`.

The TestNet resource configuration is receiver
`2UXLRFM6JLSAJWBT5QQOOYTVLJECMKMA7B6PLXIPKKOJ4LUW2XIN6EL3RY`, USDC ASA
`10458941`, price `$0.02` (`20000` micro-USDC), GoPlausible facilitator, and
challenge tag `x402-global-challenge`.

## Build and activate a release

From a clean local checkout, archive an exact commit and extract it into a new
release directory. On the VM:

```bash
cd /opt/x402-infra-inspector/releases/<commit>
pnpm install --frozen-lockfile
pnpm test
pnpm lint
pnpm typecheck
pnpm build
ln -sfn releases/<commit> /opt/x402-infra-inspector/current
sudo systemctl restart x402-infra-inspector.service
```

Never copy the local `.env`, `/run/user/*/x402-infra-inspector`, or any payer
client credential to the VM.

## Service operations

```bash
sudo systemctl enable --now x402-infra-inspector.service
systemctl status x402-infra-inspector.service --no-pager
journalctl -u x402-infra-inspector.service --no-pager -n 100
sudo systemctl restart x402-infra-inspector.service
```

The unit starts after `network-online.target`, restarts on failure, runs as the
non-login service account, has no Linux capabilities, and applies systemd
sandboxing. Logs are written to journald.

## Private validation

```bash
curl --fail --silent --show-error http://127.0.0.1:4021/health
node /opt/x402-infra-inspector/current/deploy/verify-402.mjs
ss -lntp | grep ':4021'
```

The first request must return HTTP 200. The verifier makes only an unpaid
request and must report HTTP 402 with the expected TestNet values, Bazaar
metadata, and challenge tag. It never signs or pays.

For public HTTPS validation, set `VERIFY_BASE_URL` explicitly:

```bash
VERIFY_BASE_URL=https://x402.pipeforge.tech \
  node /opt/x402-infra-inspector/current/deploy/verify-402.mjs
```

Security regression tests are part of `pnpm test` and cover localhost, RFC1918,
link-local, metadata, reserved IPv4/IPv6, mixed public/private DNS answers,
forbidden redirects, and redirect limits. Outbound sockets remain pinned to
validated DNS results and only HTTP(S) ports 80/443 are permitted.

## Rollback

Point `current` to the prior commit and restart:

```bash
ln -sfn releases/<previous-commit> /opt/x402-infra-inspector/current
sudo systemctl restart x402-infra-inspector.service
curl --fail --silent --show-error http://127.0.0.1:4021/health
```

Do not delete the previous release until the new release has passed private and
public validation.
