import { describe, expect, it } from 'vitest';
import { formatPercent, milestoneProgress, overallProgress, parseCompleted } from './progress.js';

const task = (completed) => ({ completed });

describe('parseCompleted', () => {
  it('acepta Sí/No sin importar tildes ni mayúsculas', () => {
    expect(parseCompleted('Sí')).toBe(true);
    expect(parseCompleted('si')).toBe(true);
    expect(parseCompleted(' SÍ ')).toBe(true);
    expect(parseCompleted('No')).toBe(false);
  });

  it('marca como inválido cualquier otro valor', () => {
    expect(parseCompleted('')).toBeNull();
    expect(parseCompleted('quizá')).toBeNull();
    expect(parseCompleted(undefined)).toBeNull();
  });
});

describe('milestoneProgress', () => {
  it('es el porcentaje de tareas completadas', () => {
    expect(milestoneProgress([task(true), task(false), task(false), task(false)])).toBe(25);
    expect(milestoneProgress([task(true), task(true)])).toBe(100);
    expect(milestoneProgress([task(false)])).toBe(0);
  });

  it('no está disponible sin tareas válidas (no es 0 ni 100)', () => {
    expect(milestoneProgress([])).toBeNull();
    expect(milestoneProgress([task(null)])).toBeNull();
  });

  it('ignora las tareas con dato inválido', () => {
    expect(milestoneProgress([task(true), task(null), task(false)])).toBe(50);
  });
});

describe('overallProgress', () => {
  it('promedia los hitos con el mismo peso, sin importar su número de tareas', () => {
    // Hito A: 1/1 tarea (100 %); hito B: 1/10 tareas (10 %). Media simple = 55 %.
    const a = milestoneProgress([task(true)]);
    const b = milestoneProgress([task(true), ...Array(9).fill(task(false))]);
    expect(overallProgress([a, b])).toEqual({ value: 55, included: 2 });
  });

  it('excluye los hitos sin avance y dice cuántos participan', () => {
    expect(overallProgress([100, null, 50])).toEqual({ value: 75, included: 2 });
  });

  it('no inventa un valor si ningún hito es válido', () => {
    expect(overallProgress([null, null])).toEqual({ value: null, included: 0 });
    expect(overallProgress([])).toEqual({ value: null, included: 0 });
  });

  it('conserva la precisión interna', () => {
    expect(overallProgress([100 / 3, 0]).value).toBeCloseTo(16.6667, 4);
  });
});

describe('formatPercent', () => {
  it('muestra un decimal como máximo', () => {
    expect(formatPercent(100 / 3)).toBe('33,3 %');
    expect(formatPercent(50)).toBe('50 %');
    expect(formatPercent(null)).toBe('N/D');
  });
});
