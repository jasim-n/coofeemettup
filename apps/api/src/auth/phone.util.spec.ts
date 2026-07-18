import { normalizePhone } from './phone.util';

describe('normalizePhone', () => {
  it('normalizes local 03xx form', () => {
    expect(normalizePhone('03001234567')).toBe('+923001234567');
  });

  it('normalizes +92 form with spaces', () => {
    expect(normalizePhone('+92 300 1234567')).toBe('+923001234567');
  });

  it('normalizes 92 prefix form', () => {
    expect(normalizePhone('923001234567')).toBe('+923001234567');
  });

  it('normalizes bare 3xx form', () => {
    expect(normalizePhone('3001234567')).toBe('+923001234567');
  });

  it('rejects non-PK / malformed numbers', () => {
    expect(() => normalizePhone('12345')).toThrow();
    expect(() => normalizePhone('0300123')).toThrow();
  });
});
