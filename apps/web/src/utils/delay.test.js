import { describe, expect, it } from 'vitest';
import { delayDays, delayStatus } from './delay.js';

const day = (year, month, d) => ({ year, month, day: d });
const TODAY = day(2026, 10, 18);

describe('delayDays — hito no finalizado', () => {
  it('cuenta los días transcurridos desde el vencimiento', () => {
    expect(delayDays({ status: 'En curso', estimated: day(2026, 10, 8) }, TODAY)).toBe(10);
    expect(delayDays({ status: 'Pendiente', estimated: day(2026, 10, 17) }, TODAY)).toBe(1);
  });

  it('es cero si vence hoy o en el futuro', () => {
    expect(delayDays({ status: 'Pendiente', estimated: TODAY }, TODAY)).toBe(0);
    expect(delayDays({ status: 'Pendiente', estimated: day(2026, 12, 1) }, TODAY)).toBe(0);
  });

  it('ignora una fecha real registrada por error', () => {
    expect(delayDays({ status: 'En curso', estimated: day(2026, 10, 8), completed: day(2026, 10, 9) }, TODAY)).toBe(10);
  });
});

describe('delayDays — hito finalizado', () => {
  it('compara la fecha real con la estimada', () => {
    expect(delayDays({ status: 'Finalizado', estimated: day(2026, 9, 1), completed: day(2026, 9, 4) }, TODAY)).toBe(3);
  });

  it('no da retraso negativo si se entregó antes', () => {
    expect(delayDays({ status: 'Finalizado', estimated: day(2026, 9, 10), completed: day(2026, 9, 1) }, TODAY)).toBe(0);
  });

  it('no usa la fecha actual para un hito ya finalizado', () => {
    expect(delayDays({ status: 'Finalizado', estimated: day(2026, 9, 1), completed: day(2026, 9, 1) }, TODAY)).toBe(0);
  });

  it('no se puede calcular sin fecha real', () => {
    expect(delayDays({ status: 'Finalizado', estimated: day(2026, 9, 1), completed: null }, TODAY)).toBeNull();
  });
});

describe('delayDays — datos incompletos', () => {
  it('devuelve null sin fecha estimada', () => {
    expect(delayDays({ status: 'Pendiente', estimated: null }, TODAY)).toBeNull();
    expect(delayDays({ status: 'Finalizado', estimated: null, completed: TODAY }, TODAY)).toBeNull();
  });
});

describe('delayStatus', () => {
  it('clasifica según los días calculados', () => {
    expect(delayStatus(5)).toBe('late');
    expect(delayStatus(0)).toBe('onTime');
    expect(delayStatus(null)).toBe('unknown');
  });
});
