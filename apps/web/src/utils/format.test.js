import { describe, expect, it } from 'vitest';
import { formatBytes, formatDate, formatDays, formatPercent } from './format.js';

describe('formatDate', () => {
  it('muestra el día calendario sin desplazarlo por la zona horaria', () => {
    expect(formatDate('2026-10-19')).toBe('19 oct 2026');
    expect(formatDate('2027-01-01')).toBe('01 ene 2027');
  });

  it('usa un guion para lo que no tiene fecha', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate('')).toBe('—');
  });
});

describe('formatPercent', () => {
  it('usa un decimal como máximo y N/D cuando no hay dato', () => {
    expect(formatPercent(33.333)).toBe('33,3 %');
    expect(formatPercent(50)).toBe('50 %');
    expect(formatPercent(0)).toBe('0 %');
    expect(formatPercent(null)).toBe('N/D');
  });
});

describe('formatDays / formatBytes', () => {
  it('concuerda el singular y el plural', () => {
    expect(formatDays(1)).toBe('1 día');
    expect(formatDays(3)).toBe('3 días');
  });

  it('abrevia tamaños', () => {
    expect(formatBytes(900)).toBe('900 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
  });
});
