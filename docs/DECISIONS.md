# Decisions

## 2026-09-16 — Hono and Node.js

Use Node.js/TypeScript with Hono. This is the current Algorand tutorial path,
keeps the HTTP layer small, and integrates directly with `@x402/hono`.

## 2026-09-16 — Inspection and payment separation

The inspection engine has no payment dependencies. Payment middleware is added
only at the HTTP composition layer and can be disabled for local engine work.

## 2026-09-16 — SSRF control model

Normalize a hostname or literal IP, resolve it before every connection, reject
any non-public result, and pin the outbound socket to an already validated IP.
Repeat validation for every redirect. Restrict protocols to HTTP/HTTPS and ports
to 80/443, with short timeouts and a redirect cap.

## 2026-09-16 — Hosted facilitator

Use GoPlausible's hosted facilitator as required by the challenge. Do not run a
facilitator or store receiver private keys in the resource server.
