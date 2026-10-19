import { parseTrustProxy } from './trust-proxy';

describe('parseTrustProxy', () => {
  it('is off when empty or 0', () => {
    expect(parseTrustProxy(undefined)).toBe(false);
    expect(parseTrustProxy('')).toBe(false);
    expect(parseTrustProxy('0')).toBe(false);
  });

  it('returns the number of trusted proxies', () => {
    expect(parseTrustProxy('1')).toBe(1);
    expect(parseTrustProxy(' 2 ')).toBe(2);
  });

  it('refuses "true" and anything that would trust arbitrary headers', () => {
    for (const bad of ['true', 'yes', '-1', '1.5', 'loopback', '6']) {
      expect(() => parseTrustProxy(bad)).toThrow(/TRUST_PROXY/);
    }
  });
});
