import { describe, expect, it } from 'vitest';
import { diffInDays, formatDay, parseCalendarDay, toIsoDate } from './dates.js';

describe('parseCalendarDay', () => {
  it('interpreta números de serie de Excel', () => {
    expect(parseCalendarDay(46313)).toEqual({ year: 2026, month: 10, day: 18 });
    expect(parseCalendarDay(46313.75)).toEqual({ year: 2026, month: 10, day: 18 });
  });

  it('acepta AAAA-MM-DD y DD/MM/AAAA', () => {
    expect(parseCalendarDay('2026-10-18')).toEqual({ year: 2026, month: 10, day: 18 });
    expect(parseCalendarDay('2026-10-18T23:30:00Z')).toEqual({ year: 2026, month: 10, day: 18 });
    expect(parseCalendarDay('18/10/2026')).toEqual({ year: 2026, month: 10, day: 18 });
  });

  it('distingue vacío (null) de inválido (undefined)', () => {
    expect(parseCalendarDay('')).toBeNull();
    expect(parseCalendarDay('   ')).toBeNull();
    expect(parseCalendarDay(null)).toBeNull();
    expect(parseCalendarDay('31/02/2026')).toBeUndefined();
    expect(parseCalendarDay('pronto')).toBeUndefined();
    expect(parseCalendarDay(new Date('x'))).toBeUndefined();
  });
});

describe('diffInDays', () => {
  it('cuenta días calendario sin depender de la hora', () => {
    expect(diffInDays({ year: 2026, month: 10, day: 1 }, { year: 2026, month: 10, day: 18 })).toBe(17);
    expect(diffInDays({ year: 2026, month: 10, day: 18 }, { year: 2026, month: 10, day: 1 })).toBe(-17);
  });

  it('atraviesa fines de mes, de año y años bisiestos', () => {
    expect(diffInDays({ year: 2026, month: 12, day: 31 }, { year: 2027, month: 1, day: 1 })).toBe(1);
    expect(diffInDays({ year: 2028, month: 2, day: 28 }, { year: 2028, month: 3, day: 1 })).toBe(2);
  });
});

describe('formato', () => {
  it('formatea ISO y fecha legible', () => {
    expect(toIsoDate({ year: 2026, month: 3, day: 5 })).toBe('2026-03-05');
    expect(formatDay({ year: 2026, month: 10, day: 18 })).toMatch(/18 oct 2026/);
    expect(formatDay(null)).toBe('—');
  });
});
