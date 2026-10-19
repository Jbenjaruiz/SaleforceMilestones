import { dateOnly } from './transformers';

describe('dateOnly', () => {
  it('turns a driver Date (UTC midnight) into the calendar day', () => {
    expect(dateOnly.from(new Date('2026-10-19T00:00:00.000Z'))).toBe('2026-10-19');
  });

  it('keeps strings as calendar days and passes null through', () => {
    expect(dateOnly.from('2026-10-19T00:00:00')).toBe('2026-10-19');
    expect(dateOnly.from(null)).toBeNull();
    expect(dateOnly.to(undefined)).toBeNull();
    expect(dateOnly.to('2026-10-19')).toBe('2026-10-19');
  });
});
