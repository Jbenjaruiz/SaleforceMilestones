import { diffInDays, isCalendarDay, todayIn } from './calendar';

describe('calendar helpers', () => {
  it('validates real calendar days only', () => {
    expect(isCalendarDay('2026-10-19')).toBe(true);
    expect(isCalendarDay('2028-02-29')).toBe(true);
    for (const bad of ['2026-02-30', '2026-13-01', '2026-10-19T00:00:00Z', '19/10/2026', '', null, 20261019]) {
      expect(isCalendarDay(bad)).toBe(false);
    }
  });

  it('counts whole days regardless of the time of day or DST', () => {
    expect(diffInDays('2026-10-19', '2026-10-22')).toBe(3);
    expect(diffInDays('2026-10-22', '2026-10-19')).toBe(-3);
    expect(diffInDays('2026-03-07', '2026-03-09')).toBe(2);
    expect(diffInDays('2026-12-31', '2027-01-01')).toBe(1);
  });

  it('resolves "today" in the configured time zone, not the server one', () => {
    const instant = new Date('2026-10-20T03:00:00Z'); // still the 19th in Guatemala (UTC-6)
    expect(todayIn('America/Guatemala', instant)).toBe('2026-10-19');
    expect(todayIn('UTC', instant)).toBe('2026-10-20');
  });
});
