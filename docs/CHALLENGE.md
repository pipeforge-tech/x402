# 2026 Algorand Global x402 Challenge requirements

Verified on 2026-09-16 against the current Algorand Foundation challenge guide,
Algorand Developer Portal tutorial, the official x402 Algorand scheme specification,
and GoPlausible's x402 documentation.

## Required production state

- Validate the complete payment flow on Algorand TestNet first.
- Run the production endpoint publicly over HTTPS on Algorand MainNet.
- Settle through `https://facilitator.goplausible.xyz`.
- Accept Algorand USDC: TestNet ASA `10458941`; MainNet ASA `31566704`.
- Use the network constants exported by `@x402/avm` rather than copying identifiers.
- Keep one stable MainNet `payTo` address for this project and root domain. The
  address must be opted in to MainNet USDC.
- Enable the Bazaar resource-server discovery extension and declare useful route
  input/output metadata.
- Add `extra.tag = "x402-global-challenge"` to the accepted payment configuration.
- Complete one legitimate MainNet payment, receive the paid response, and verify
  the USDC receipt and public transaction ID.
- Verify the resource and merchant catalog entries plus challenge-filtered
  leaderboard attribution after settlement.
- Publish the relevant source repository and submit it to Electric Capital.
- Submit the challenge entry by 2026-09-30.

## Current integration pattern

The current TypeScript resource-server pattern uses Hono with `@x402/core`,
`@x402/hono`, `@x402/avm`, and `@x402-avm/extensions`. Register
`ExactAvmScheme` on an `x402ResourceServer`, register the Bazaar extension once,
and protect the route with `paymentMiddleware`. The resource server needs only
the public receiver address; payer signing material belongs in a separate test
client.

## Sources

- <https://algorand.co/blog/the-x402-global-challenge-is-live-how-to-build-submit-your-entry>
- <https://dev.algorand.co/resources/x402-on-algorand/>
- <https://github.com/algorandfoundation/x402-demo/tree/main/x402-basic-tutorial>
- <https://github.com/x402-foundation/x402/blob/main/specs/schemes/exact/scheme_exact_algo.md>
- <https://github.com/GoPlausible/.github/blob/main/profile/algorand-x402-documentation/README.md>

Re-verify network identifiers, asset IDs, facilitator behavior, package APIs, and
submission rules immediately before MainNet conversion.
