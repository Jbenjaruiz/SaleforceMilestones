import { diffInDays } from './dates.js';

export const FINISHED = 'Finalizado';

/**
 * Días de retraso de un hito, en días calendario.
 *
 * - Finalizado: max(0, fecha real − fecha estimada).
 * - No finalizado: días desde el vencimiento si hoy supera la fecha estimada, 0 si no.
 *
 * Devuelve `null` cuando falta un dato para calcularlo (sin fecha estimada, o
 * finalizado sin fecha real). La fecha de corte del Excel no interviene.
 */
export function delayDays({ status, estimated, completed }, today) {
  if (!estimated) return null;
  if (status === FINISHED) {
    if (!completed) return null;
    return Math.max(0, diffInDays(estimated, completed));
  }
  return Math.max(0, diffInDays(estimated, today));
}

/** `late`, `onTime` o `unknown` según los días de retraso calculados. */
export function delayStatus(days) {
  if (days === null) return 'unknown';
  return days > 0 ? 'late' : 'onTime';
}
