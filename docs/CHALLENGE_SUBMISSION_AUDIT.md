# Algorand Global x402 Challenge submission audit

- Audit date: **2026-09-17**
- Evidence baseline: commit `01d7c62c2845d663d13896d1ce384c07bde2804a`
- MainNet transaction: `XJ7NRFF46DKSLMOZGXZV3QTAKCAGELYUZMBF7P4IIKUVKNEERFIQ`
- Public repository: <https://github.com/pipeforge-tech/x402>
- Validated baseline tag: [`x402-challenge-2026-mainnet-validated`](https://github.com/pipeforge-tech/x402/tree/x402-challenge-2026-mainnet-validated), an annotated tag that resolves to commit `e15d88ab29fcf036374847a00353d47e5a1ff303`

This audit compares the repository and live public service with the current Algorand Foundation [challenge page](https://algorand.co/global-x402-challenge), [submission guide](https://algorand.co/blog/the-x402-global-challenge-is-live-how-to-build-submit-your-entry), [leaderboard troubleshooting guide](https://algorand.co/blog/is-your-x402-endpoint-showing-up-in-the-facilitator-leaderboard-how-to-troubleshoot-if-not), and [Official Rules](https://algorand.co/hubfs/x402%20competition%20Official%20Rules.pdf).

`PASS` means exact repository or public evidence was observed. `MISSING-EVIDENCE` means the requirement may have been completed but this checkout and the public evidence checked do not prove it. `OPERATOR-ATTESTATION` covers personal/legal facts that cannot be established from source code. `ONGOING` is a requirement whose measurement period has not ended.

## Technical qualification

| Status | Requirement | Evidence |
| --- | --- | --- |
| PASS | A paid x402 API endpoint on Algorand | [`src/app.ts`](../src/app.ts) registers `ExactAvmScheme`, GoPlausible, and `paymentMiddleware`; the live [public endpoint](https://x402.pipeforge.tech/api/v1/inspect?host=example.com) returns x402 v2. |
| PASS | A real, useful service | [`src/inspector.ts`](../src/inspector.ts) returns DNS, HTTP, TLS, latency, redirect, and security-header results. [`README.md`](../README.md) explains the agent use case. |
| PASS | Unpaid requests return HTTP 402 | A fresh unsigned request on 2026-09-17 returned HTTP `402` with `PAYMENT-REQUIRED`; the decoded values are recorded in [`docs/PUBLIC_MAINNET_VALIDATION.md`](PUBLIC_MAINNET_VALIDATION.md). |
| PASS | Complete TestNet flow before MainNet | [`docs/PUBLIC_TESTNET_VALIDATION.md`](PUBLIC_TESTNET_VALIDATION.md) records public TestNet 402 → payment → GoPlausible settlement → HTTP 200, transaction `OHMTPWPLVJWCIZ4CUYUILAUJHAUXI45XMSHVBGLN2MZ44UMYYT5A`, round `67404046`. |
| PASS | TestNet uses the required network, USDC ASA `10458941`, and GoPlausible | Exact values and facilitator result appear in [`docs/PUBLIC_TESTNET_VALIDATION.md`](PUBLIC_TESTNET_VALIDATION.md); defaults are guarded in [`src/config.ts`](../src/config.ts). |
| PASS | MainNet network and USDC ASA `31566704` | [`src/app.ts`](../src/app.ts) derives the full genesis-hash identifier; [`src/config.ts`](../src/config.ts) rejects a different MainNet asset; the live 402 advertises `algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=` and `31566704`. A fresh [`/supported`](https://facilitator.goplausible.xyz/supported) query on 2026-09-17 still returned x402 v2 `exact` for that same identifier, so no facilitator/network drift was observed. |
| PASS | Public, non-localhost HTTPS endpoint | [`https://x402.pipeforge.tech/api/v1/inspect?host=example.com`](https://x402.pipeforge.tech/api/v1/inspect?host=example.com) is publicly reachable over HTTPS and returns HTTP 402 when unsigned. [`docs/PUBLIC_TESTNET_VALIDATION.md`](PUBLIC_TESTNET_VALIDATION.md) records the trusted public TLS check. |
| PASS | MainNet receiver is opted into USDC and remains the stable `payTo` | Receiver `6Q7MNZLDJUMRHPPQIV3XPKGWONZQQG4GSFLQMUGG2PDZJHIOCZKVDC3OAU` received ASA `31566704` in the [indexed transaction](https://mainnet-idx.algonode.cloud/v2/transactions/XJ7NRFF46DKSLMOZGXZV3QTAKCAGELYUZMBF7P4IIKUVKNEERFIQ). The same address appears in the live 402, [`docs/PUBLIC_MAINNET_VALIDATION.md`](PUBLIC_MAINNET_VALIDATION.md), and the GoPlausible merchant account list. |
| PASS | GoPlausible hosted facilitator, not a local/alternate facilitator | [`src/app.ts`](../src/app.ts) uses `HTTPFacilitatorClient`; [`src/config.ts`](../src/config.ts) and the deployed environment use `https://facilitator.goplausible.xyz`; settlement success is recorded in [`docs/PUBLIC_MAINNET_VALIDATION.md`](PUBLIC_MAINNET_VALIDATION.md). |
| PASS | Bazaar discovery enabled with concrete metadata | [`src/app.ts`](../src/app.ts) registers the Bazaar extension and declares the `host` input, JSON output example, MIME type, and concrete route description. The exact [resource catalog record](https://facilitator.goplausible.xyz/dashboard/resources/15cfe43756ea272e) exposes those fields. |
| PASS | Required `x402-global-challenge` attribution | [`src/app.ts`](../src/app.ts) places the configured tag in `extra`; [`src/config.ts`](../src/config.ts) requires the exact tag on MainNet; the live 402 carries it; the [merchant record](https://facilitator.goplausible.xyz/dashboard/merchants/849069d9cc31ff3f) reports `challenge: true`. |
| PASS | One real MainNet payment, paid response, and USDC receipt | [`docs/PUBLIC_MAINNET_VALIDATION.md`](PUBLIC_MAINNET_VALIDATION.md) records one attempt, GoPlausible success, HTTP `200`, and a valid report. Payer USDC decreased `1000000 → 980000`; receiver USDC increased `0 → 20000`. |
| PASS | Public MainNet transaction evidence | [AlgoNode indexer JSON](https://mainnet-idx.algonode.cloud/v2/transactions/XJ7NRFF46DKSLMOZGXZV3QTAKCAGELYUZMBF7P4IIKUVKNEERFIQ) and [Allo explorer](https://allo.info/tx/XJ7NRFF46DKSLMOZGXZV3QTAKCAGELYUZMBF7P4IIKUVKNEERFIQ) show transaction `XJ7NR...RFIQ`, round `65142030`, sender `TGRD7...ZGE`, receiver `6Q7M...OAU`, ASA `31566704`, amount `20000`, and MainNet genesis hash. |
| PASS | Resource appears in Bazaar | GoPlausible [resource `15cfe43756ea272e`](https://facilitator.goplausible.xyz/dashboard/resources/15cfe43756ea272e) lists the route, both Algorand networks, price, discovery schema, and two settlements. A Bazaar-filtered MainNet [resource query](https://facilitator.goplausible.xyz/data/leaderboards?range=all&env=mainnet&src=bazaar&cat=resources&limit=25&offset=0&q=pipeforge) returns the route. |
| PASS | Merchant appears in the merchant catalog | GoPlausible [merchant `849069d9cc31ff3f`](https://facilitator.goplausible.xyz/dashboard/merchants/849069d9cc31ff3f) includes the TestNet and MainNet accounts, the resource, `bazaar: true`, and `challenge: true`. |
| PASS | Resource and merchant appear under the challenge filter | The [challenge-filtered resource query](https://facilitator.goplausible.xyz/data/leaderboards?range=all&env=mainnet&src=x402-global-challenge&cat=resources&limit=25&offset=0&q=pipeforge) returns one `$0.02` MainNet settlement. The matching [merchant query](https://facilitator.goplausible.xyz/data/leaderboards?range=all&env=mainnet&src=x402-global-challenge&cat=merchants&limit=25&offset=0&group=merchant&q=6Q7MNZLD) returns the receiver with `bazaar: true` and `challenge: true`. |

## Repository and submission closeout

| Status | Requirement | Evidence or missing evidence |
| --- | --- | --- |
| PASS | Public GitHub repository containing the relevant Algorand code | Anonymous `git ls-remote` verification on 2026-09-17 succeeded for [`pipeforge-tech/x402`](https://github.com/pipeforge-tech/x402). Public `HEAD` resolved to `e15d88ab29fcf036374847a00353d47e5a1ff303`. The repository contains the Algorand/x402 integration in [`src/app.ts`](../src/app.ts), [`src/config.ts`](../src/config.ts), and `package.json`. |
| PASS | Immutable public submission baseline | Anonymous verification found annotated tag [`x402-challenge-2026-mainnet-validated`](https://github.com/pipeforge-tech/x402/tree/x402-challenge-2026-mainnet-validated), tag object `4e84d3b6b68280591ada73a87eeccdd074c5db9e`, peeling to commit `e15d88ab29fcf036374847a00353d47e5a1ff303`. |
| MISSING-EVIDENCE | Submit the GitHub repository to Electric Capital | No Electric Capital mutation, issue, or pull-request URL is present in the repository. Record the resulting public URL after submission to [`electric-capital/open-dev-data`](https://github.com/electric-capital/open-dev-data). |
| MISSING-EVIDENCE | Challenge registration completed | No registration confirmation is present. The Official Rules state that initial registration closed at **11:45 p.m. EST on 2026-09-01**. The operator must retain the confirmation email or form receipt. If initial registration was not completed, this is a qualification blocker that documentation changes cannot fix. |
| MISSING-EVIDENCE | Final project information submitted | No confirmation or submission ID is present. The Official Rules state **11:45 p.m. EST on 2026-09-29**; the public guide says September 30. Use the earlier September 29 deadline and retain the confirmation. The rules say the link is emailed to eligible registered entrants; the current guide also links a [public submission form](https://fjtqz.share-eu1.hsforms.com/2VnFVCiF_Sg26XP85Jxz_bA). |
| ONGOING | Continue driving real, non-artificial usage through early October | One legitimate MainNet settlement is challenge-attributed. Sustained usage is not yet evidenced. Do not use self-payment loops, retries, wash transactions, or synthetic volume; the rules permit exclusion of manipulated activity. |
| MISSING-EVIDENCE | Top-50 status at the final review window | At audit time the challenge-filtered queries return rank `1` within the filtered result, but leaderboard rank is mutable and the final measurement window is unannounced. Capture the final public result when the Administrator reviews it. |

## Official Rules items requiring operator attestation

These cannot be proven by repository inspection and should be confirmed by the entrant before submission:

- `OPERATOR-ATTESTATION` — every entrant satisfies age, jurisdiction, sanctions, legal-participation, professional-obligation, and English-proficiency requirements.
- `OPERATOR-ATTESTATION` — each person participates on only one team and the team submits only one project.
- `OPERATOR-ATTESTATION` — the entrant accepts the Official Rules and provides accurate, complete requested profile information and consent.
- `OPERATOR-ATTESTATION` — the entrant owns or has permission to use all submitted code, content, names, likenesses, and third-party materials.
- `OPERATOR-ATTESTATION` — the submission complies with applicable law and contains no prohibited, infringing, deceptive, discriminatory, offensive, or malicious content.

Repository evidence supporting those attestations includes English-language documentation, the [MIT license](../LICENSE), a lockfile, bounded network behavior, and no wallet secret committed in tracked files. This is evidence, not a legal determination.

## Judging criteria readiness

The Official Rules weight four criteria equally:

| Criterion | Readiness | Evidence |
| --- | --- | --- |
| Volume and real activity | Partial / ongoing | One legitimate challenge-attributed MainNet settlement is publicly visible. More genuine third-party usage must come from actual users, not self-payment. |
| Use-case quality | PASS | The paid operation is the product itself: a bounded infrastructure report, rather than x402 added as a secondary feature. See [`README.md`](../README.md) and [`src/inspector.ts`](../src/inspector.ts). |
| Sustained potential | PASS for narrative; usage ongoing | Accountless pay-per-report access suits agents, CI checks, due diligence, and workflow automation. Copy-ready narrative is in [`docs/SUBMISSION.md`](SUBMISSION.md). |
| Innovation | PASS for narrative | The service combines agent-native micropayment with defensive DNS/HTTP/TLS inspection and strict SSRF boundaries. Implementation evidence is in [`src/target.ts`](../src/target.ts), [`src/resolver.ts`](../src/resolver.ts), and [`src/network.ts`](../src/network.ts). |

## Recommended discovery polish

The guide recommends, but does not state as a technical qualification gate, enriched website metadata, logo, title, description, agentic files, and well-known structures. GoPlausible currently reports `site: null`, `agent: []`, and `logo: null`. This is a **non-blocking presentation gap**. It should be handled only as a separately approved website/content task; no payment architecture change is required.

## Closeout decision

**The validated payment architecture meets the documented technical qualification requirements. Do not change it for submission closeout.** Remaining work is external and evidentiary:

1. Confirm the entrant registered before the September 1 rules deadline.
2. Submit the public repository to Electric Capital and retain the public evidence URL.
3. Submit the final project information by the earlier September 29 deadline and retain confirmation.
4. Seek genuine usage and capture the final leaderboard position without making self-payments or automated retries.

No additional MainNet payment is needed to cure any repository documentation gap.
