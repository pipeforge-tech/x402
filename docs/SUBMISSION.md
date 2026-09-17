# Challenge submission copy

## Project name

x402 Infrastructure Inspector

## Entry type

Standard Entry — one paid endpoint offering one atomic service.

## Submission-ready description

x402 Infrastructure Inspector is an accountless, pay-per-request API that gives humans and autonomous agents a bounded infrastructure report for a public Internet hostname. For 0.02 USDC, a caller receives machine-readable DNS records, HTTP(S) reachability and status, redirect behavior, latency, TLS certificate validity and metadata, and the presence of common browser security headers.

The payment is the product's native access control, not a secondary feature. An unsigned request receives an x402 v2 HTTP 402 offer. The offer uses the Algorand `exact` scheme, MainNet USDC ASA `31566704`, Bazaar discovery metadata, and the `x402-global-challenge` attribution tag. GoPlausible verifies and settles the payment on Algorand MainNet, after which the resource server returns the JSON inspection report.

The service is designed for agentic and automated workflows that need a fast first-pass view of an unfamiliar host without creating an account, provisioning an API key, or purchasing a subscription. It is useful for pre-integration checks, workflow triage, CI/CD context, domain due diligence, and agent decision-making.

Safety is part of the product. Inputs are restricted to hostnames and literal IPs. Private, loopback, link-local, reserved, documentation, multicast, and other non-public address ranges are rejected. Every resolved address and redirect is revalidated; outbound sockets are pinned to validated addresses to reduce DNS-rebinding risk. Requests are limited to HTTP(S) ports 80/443, short timeouts, bounded redirects, and header-only processing.

The public TestNet and MainNet flows were validated end to end. The MainNet validation settled exactly 20,000 micro-USDC in transaction `XJ7NRFF46DKSLMOZGXZV3QTAKCAGELYUZMBF7P4IIKUVKNEERFIQ`, confirmed in round `65142030`. GoPlausible returned settlement success, the paid endpoint returned HTTP 200 with a valid report, and indexed balances showed the payer decrease and receiver increase by exactly 20,000 micro-USDC. The endpoint and merchant are visible in both Bazaar and the `x402-global-challenge` filtered leaderboard.

## Concise “why this is useful”

Agents need infrastructure context before trusting or integrating with an unfamiliar host. This API turns DNS, HTTP, TLS, redirect, latency, and security-header checks into one safe, machine-readable purchase. x402 removes accounts, API keys, subscriptions, and minimum commitments, so an agent can pay exactly when a report is useful.

## Public links

- Endpoint: <https://x402.pipeforge.tech/api/v1/inspect?host=example.com>
- Health: <https://x402.pipeforge.tech/health>
- MainNet transaction: <https://allo.info/tx/XJ7NRFF46DKSLMOZGXZV3QTAKCAGELYUZMBF7P4IIKUVKNEERFIQ>
- Raw indexed transaction: <https://mainnet-idx.algonode.cloud/v2/transactions/XJ7NRFF46DKSLMOZGXZV3QTAKCAGELYUZMBF7P4IIKUVKNEERFIQ>
- Bazaar resource: <https://facilitator.goplausible.xyz/dashboard/resources/15cfe43756ea272e>
- GoPlausible merchant: <https://facilitator.goplausible.xyz/dashboard/merchants/849069d9cc31ff3f>
- Challenge-filtered resource: <https://facilitator.goplausible.xyz/data/leaderboards?range=all&env=mainnet&src=x402-global-challenge&cat=resources&limit=25&offset=0&q=pipeforge>
- Challenge-filtered merchant: <https://facilitator.goplausible.xyz/data/leaderboards?range=all&env=mainnet&src=x402-global-challenge&cat=merchants&limit=25&offset=0&group=merchant&q=6Q7MNZLD>
- Public repository: <https://github.com/pipeforge-tech/x402>
- Validated baseline tag: <https://github.com/pipeforge-tech/x402/tree/x402-challenge-2026-mainnet-validated> (`e15d88ab29fcf036374847a00353d47e5a1ff303`)
- Electric Capital submission: **MISSING — add the public mutation/PR URL**
- Challenge submission form: <https://fjtqz.share-eu1.hsforms.com/2VnFVCiF_Sg26XP85Jxz_bA>

## Verified technical facts

```text
x402 version: 2
scheme: exact
network: algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=
asset: MainNet USDC ASA 31566704
price: 20000 micro-USDC (0.02 USDC)
receiver: 6Q7MNZLDJUMRHPPQIV3XPKGWONZQQG4GSFLQMUGG2PDZJHIOCZKVDC3OAU
facilitator: https://facilitator.goplausible.xyz
challenge tag: x402-global-challenge
Bazaar: enabled and publicly indexed
```

## Final verification checklist

Technical evidence:

- [x] Public HTTPS endpoint returns an unsigned HTTP 402.
- [x] Live offer uses x402 v2, `exact`, the full Algorand MainNet identifier, ASA `31566704`, and `20000` micro-USDC.
- [x] Live offer uses the validated receiver and canonical resource URL.
- [x] Bazaar metadata and `x402-global-challenge` attribution are present.
- [x] Public TestNet end-to-end validation is documented.
- [x] Exactly one authorized MainNet validation payment is documented.
- [x] Transaction sender, receiver, ASA, amount, network, and round are independently indexed.
- [x] GoPlausible settlement, final HTTP 200, valid result, and exact balance movement are documented.
- [x] Bazaar resource and merchant records are public.
- [x] Challenge-filtered resource and merchant queries contain the entry.
- [x] Security, SSRF controls, and credential separation are documented.
- [x] Tests (`65`), lint, type checking, production build, and the public-only MainNet preflight pass at closeout.

External submission:

- [ ] Confirm and retain evidence of initial challenge registration before the Official Rules deadline.
- [x] Public GitHub repository is anonymously accessible at <https://github.com/pipeforge-tech/x402>.
- [x] Annotated baseline tag `x402-challenge-2026-mainnet-validated` resolves to commit `e15d88ab29fcf036374847a00353d47e5a1ff303`.
- [x] Public repository URL and baseline tag are recorded in the submission materials.
- [ ] Submit the repository to Electric Capital; retain the public mutation/PR URL.
- [ ] Complete the emailed final-project-information form by **2026-09-29 11:45 p.m. EST** (the earlier of the rules and public-guide dates).
- [ ] Retain submission confirmation and any entry ID.
- [ ] Re-check the live endpoint, Bazaar records, challenge-filtered leaderboard, and repository immediately before submitting.
- [ ] Confirm operator eligibility, ownership, permissions, and Official Rules attestations.
- [ ] Capture the final leaderboard status during the review window.

Do not create another payment merely to complete this checklist. Genuine future customer usage is distinct from repeat validation or self-payment.
