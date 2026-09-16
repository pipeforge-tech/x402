import { describe, expect, it } from 'vitest';
import { InspectionError } from '../src/errors.js';
import { isPublicAddress, normalizeTarget } from '../src/target.js';

describe('target safety', () => {
  it.each([
    '127.0.0.1', '10.0.0.1', '172.16.0.1', '192.168.1.1', '169.254.169.254',
    '0.0.0.0', '100.64.0.1', '224.0.0.1', '::1', '::', 'fc00::1', 'fe80::1',
    'ff02::1', '::ffff:127.0.0.1', '::ffff:7f00:1', '64:ff9b::7f00:1',
    '192.0.2.1', '2001:db8::1', '2002:7f00:1::',
  ])('rejects non-public address %s', address => {
    expect(isPublicAddress(address)).toBe(false);
    expect(() => normalizeTarget(address)).toThrowError(InspectionError);
  });

  it.each(['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111'])('allows public address %s', address => {
    expect(isPublicAddress(address)).toBe(true);
  });

  it.each(['localhost', 'printer', 'http://example.com', 'example.com:8443', 'user@example.com', 'bad_label.example'])(
    'rejects invalid or internal target %s',
    target => {
      expect(() => normalizeTarget(target)).toThrowError(InspectionError);
    },
  );

  it('normalizes a valid public hostname', () => {
    expect(normalizeTarget('ExAmPlE.com.')).toBe('example.com');
  });
});
