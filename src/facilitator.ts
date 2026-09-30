import type { FacilitatorClient } from '@x402/core/server';
import type {
  Network,
  PaymentPayload,
  PaymentRequirements,
  SettleResponse,
  SupportedResponse,
  VerifyResponse,
} from '@x402/core/types';
import {
  ALGORAND_MAINNET_CAIP2,
  ALGORAND_MAINNET_GENESIS_HASH,
  ALGORAND_TESTNET_CAIP2,
  ALGORAND_TESTNET_GENESIS_HASH,
} from '@x402/avm';

const networkAliases: ReadonlyArray<readonly [canonical: Network, legacy: Network]> = [
  [ALGORAND_MAINNET_CAIP2 as Network, `algorand:${ALGORAND_MAINNET_GENESIS_HASH}` as Network],
  [ALGORAND_TESTNET_CAIP2 as Network, `algorand:${ALGORAND_TESTNET_GENESIS_HASH}` as Network],
];

/**
 * GoPlausible still advertises Algorand's legacy full-genesis identifiers while
 * the x402 specification requires the truncated CAIP-2 identifiers. Expose both
 * to clients and translate only at the facilitator boundary so either spelling
 * selects the same Algorand network and settlement path.
 */
export class AlgorandNetworkCompatibilityFacilitator implements FacilitatorClient {
  private delegateNetworks = new Set<Network>();

  constructor(private readonly delegate: FacilitatorClient) {}

  private delegateNetwork(network: Network): Network {
    if (this.delegateNetworks.has(network)) return network;
    const pair = networkAliases.find(([canonical, legacy]) => network === canonical || network === legacy);
    if (!pair) return network;
    const equivalent = pair[0] === network ? pair[1] : pair[0];
    if (this.delegateNetworks.has(equivalent)) return equivalent;
    // Before getSupported() has completed, retain GoPlausible's current legacy default.
    return pair[1];
  }

  private delegateRequirements(requirements: PaymentRequirements): PaymentRequirements {
    const network = this.delegateNetwork(requirements.network);
    return network === requirements.network ? requirements : { ...requirements, network };
  }

  private delegatePayload(payload: PaymentPayload): PaymentPayload {
    const accepted = this.delegateRequirements(payload.accepted);
    return accepted === payload.accepted ? payload : { ...payload, accepted };
  }

  async getSupported(): Promise<SupportedResponse> {
    const supported = await this.delegate.getSupported();
    this.delegateNetworks = new Set(supported.kinds.map(kind => kind.network));
    const advertised = new Set(this.delegateNetworks);
    const aliases = supported.kinds.flatMap(kind => {
      const pair = networkAliases.find(([canonical, legacy]) => kind.network === canonical || kind.network === legacy);
      if (!pair) return [];
      const alias = pair[0] === kind.network ? pair[1] : pair[0];
      if (advertised.has(alias)) return [];
      return [{ ...kind, network: alias }];
    });
    return { ...supported, kinds: [...supported.kinds, ...aliases] };
  }

  verify(paymentPayload: PaymentPayload, paymentRequirements: PaymentRequirements): Promise<VerifyResponse> {
    return this.delegate.verify(
      this.delegatePayload(paymentPayload),
      this.delegateRequirements(paymentRequirements),
    );
  }

  async settle(paymentPayload: PaymentPayload, paymentRequirements: PaymentRequirements): Promise<SettleResponse> {
    const result = await this.delegate.settle(
      this.delegatePayload(paymentPayload),
      this.delegateRequirements(paymentRequirements),
    );
    if (paymentRequirements.network === this.delegateNetwork(paymentRequirements.network)) return result;
    return { ...result, network: paymentRequirements.network };
  }
}
