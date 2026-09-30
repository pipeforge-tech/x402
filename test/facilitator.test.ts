import { describe, expect, it, vi } from 'vitest';
import type { FacilitatorClient } from '@x402/core/server';
import type { Network, PaymentPayload, PaymentRequirements } from '@x402/core/types';
import { AlgorandNetworkCompatibilityFacilitator } from '../src/facilitator.js';

const legacyMainnet = 'algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=' as Network;
const canonicalMainnet = 'algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73k' as Network;

function requirement(network: Network): PaymentRequirements {
  return {
    scheme: 'exact',
    network,
    asset: '31566704',
    amount: '20000',
    payTo: 'ZMFK2OI7ZBD2U27ISERZC4S6LKM6WMFJPZQ4MYNJDZ2VNBNMBA67RA22AA',
    maxTimeoutSeconds: 300,
    extra: {},
  };
}

describe('Algorand network compatibility facilitator', () => {
  it('adds the canonical alias and translates it only at the facilitator boundary', async () => {
    const delegate: FacilitatorClient = {
      getSupported: vi.fn(async () => ({
        kinds: [{ x402Version: 2, scheme: 'exact', network: legacyMainnet }],
        extensions: [],
        signers: {},
      })),
      verify: vi.fn(async () => ({ isValid: true })),
      settle: vi.fn(async () => ({ success: true, transaction: 'TXID', network: legacyMainnet })),
    };
    const facilitator = new AlgorandNetworkCompatibilityFacilitator(delegate);
    const canonicalRequirement = requirement(canonicalMainnet);
    const payload: PaymentPayload = {
      x402Version: 2,
      accepted: canonicalRequirement,
      payload: { paymentGroup: [], paymentIndex: 0 },
    };

    const supported = await facilitator.getSupported();
    expect(supported.kinds.map(kind => kind.network)).toEqual([legacyMainnet, canonicalMainnet]);

    await facilitator.verify(payload, canonicalRequirement);
    expect(delegate.verify).toHaveBeenCalledWith(
      expect.objectContaining({ accepted: expect.objectContaining({ network: legacyMainnet }) }),
      expect.objectContaining({ network: legacyMainnet }),
    );

    const settled = await facilitator.settle(payload, canonicalRequirement);
    expect(delegate.settle).toHaveBeenCalledWith(
      expect.objectContaining({ accepted: expect.objectContaining({ network: legacyMainnet }) }),
      expect.objectContaining({ network: legacyMainnet }),
    );
    expect(settled.network).toBe(canonicalMainnet);
  });
});
