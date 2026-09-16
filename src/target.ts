import { isIP } from 'node:net';
import { domainToASCII } from 'node:url';
import { InspectionError } from './errors.js';

const blockedNames = new Set(['localhost', 'localhost.localdomain', 'metadata.google.internal']);

const ipv4Blocks: Array<[number, number]> = [
  [ipv4Number('0.0.0.0'), 8],
  [ipv4Number('10.0.0.0'), 8],
  [ipv4Number('100.64.0.0'), 10],
  [ipv4Number('127.0.0.0'), 8],
  [ipv4Number('169.254.0.0'), 16],
  [ipv4Number('172.16.0.0'), 12],
  [ipv4Number('192.0.0.0'), 24],
  [ipv4Number('192.0.2.0'), 24],
  [ipv4Number('192.88.99.0'), 24],
  [ipv4Number('192.168.0.0'), 16],
  [ipv4Number('198.18.0.0'), 15],
  [ipv4Number('198.51.100.0'), 24],
  [ipv4Number('203.0.113.0'), 24],
  [ipv4Number('224.0.0.0'), 4],
  [ipv4Number('240.0.0.0'), 4],
];

const ipv6Blocks: Array<[bigint, number]> = [
  [0n, 128],
  [1n, 128],
  [ipv6Number('100::'), 64],
  [ipv6Number('2001::'), 23],
  [ipv6Number('2001:db8::'), 32],
  [ipv6Number('fc00::'), 7],
  [ipv6Number('fe80::'), 10],
  [ipv6Number('ff00::'), 8],
];

function ipv4Number(address: string): number {
  return address.split('.').reduce((value, octet) => (value * 256 + Number(octet)) >>> 0, 0);
}

function expandIpv6(address: string): number[] {
  const normalized = address.toLowerCase().split('%')[0];
  const [leftRaw, rightRaw] = normalized.split('::');
  const convert = (part: string): string[] => {
    if (!part) return [];
    const pieces = part.split(':');
    const last = pieces.at(-1);
    if (last && isIP(last) === 4) {
      const value = ipv4Number(last);
      pieces.splice(-1, 1, ((value >>> 16) & 0xffff).toString(16), (value & 0xffff).toString(16));
    }
    return pieces;
  };
  const left = convert(leftRaw ?? '');
  const right = convert(rightRaw ?? '');
  const zeros = 8 - left.length - right.length;
  if (zeros < 0 || (!normalized.includes('::') && zeros !== 0)) throw new Error('Invalid IPv6');
  return [...left, ...Array(zeros).fill('0'), ...right].map(part => Number.parseInt(part, 16));
}

function ipv6Number(address: string): bigint {
  return expandIpv6(address).reduce((value, part) => (value << 16n) | BigInt(part), 0n);
}

function inIpv4Block(address: number, base: number, prefix: number): boolean {
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (address & mask) >>> 0 === (base & mask) >>> 0;
}

function inIpv6Block(address: bigint, base: bigint, prefix: number): boolean {
  const shift = BigInt(128 - prefix);
  return address >> shift === base >> shift;
}

export function isPublicAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const value = ipv4Number(address);
    return !ipv4Blocks.some(([base, prefix]) => inIpv4Block(value, base, prefix));
  }
  if (version === 6) {
    const lower = address.toLowerCase();
    if (lower.startsWith('::ffff:')) {
      const mapped = lower.slice(7);
      if (isIP(mapped) === 4) return isPublicAddress(mapped);
    }
    const value = ipv6Number(address);
    return !ipv6Blocks.some(([base, prefix]) => inIpv6Block(value, base, prefix));
  }
  return false;
}

export function normalizeTarget(input: string): string {
  const candidate = input.trim().replace(/\.$/, '').toLowerCase();
  if (!candidate || candidate.length > 253 || candidate.includes('://') || /[\s/@?#\\]/.test(candidate)) {
    throw new InspectionError('INVALID_TARGET', 'Target must be a hostname or IP address');
  }
  if (isIP(candidate)) {
    if (!isPublicAddress(candidate)) throw new InspectionError('FORBIDDEN_TARGET', 'Target is not a public address');
    return candidate;
  }

  const ascii = domainToASCII(candidate);
  if (!ascii || !ascii.includes('.') || blockedNames.has(ascii)) {
    throw new InspectionError('FORBIDDEN_TARGET', 'Only public Internet hostnames are allowed');
  }
  const labels = ascii.split('.');
  if (labels.some(label => !label || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))) {
    throw new InspectionError('INVALID_TARGET', 'Target is not a valid hostname');
  }
  return ascii;
}
