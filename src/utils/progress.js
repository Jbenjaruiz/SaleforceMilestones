/** Tarea completada en minúsculas y sin tildes; `null` si el valor no es Sí/No. */
export function parseCompleted(value) {
  const text = String(value ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (text === 'si') return true;
  if (text === 'no') return false;
  return null;
}

/**
 * Avance de un hito: tareas completadas entre tareas válidas, con el mismo peso
 * por tarea. Sin tareas válidas devuelve `null` (no disponible), nunca 0 ni 100.
 */
export function milestoneProgress(tasks) {
  const valid = tasks.filter((task) => task.completed !== null);
  if (!valid.length) return null;
  return (valid.filter((task) => task.completed).length / valid.length) * 100;
}

/**
 * Avance global: media simple de los hitos con avance disponible. Cada hito
 * pesa igual sin importar cuántas tareas tenga.
 */
export function overallProgress(progressValues) {
  const valid = progressValues.filter((value) => value !== null && Number.isFinite(value));
  if (!valid.length) return { value: null, included: 0 };
  return { value: valid.reduce((sum, value) => sum + value, 0) / valid.length, included: valid.length };
}

/** Un decimal como máximo, solo para mostrar; el cálculo conserva la precisión. */
export function formatPercent(value) {
  if (value === null || value === undefined) return 'N/D';
  return `${new Intl.NumberFormat('es', { maximumFractionDigits: 1 }).format(value)} %`;
}
