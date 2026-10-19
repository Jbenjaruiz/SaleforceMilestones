// Las fechas se manejan como días calendario (año, mes, día) sin hora ni zona
// horaria, para que el retraso no cambie según el equipo que abre la página.

const MS_PER_DAY = 86_400_000;
const EXCEL_EPOCH = Date.UTC(1899, 11, 30);

function isValidYmd(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  const probe = new Date(Date.UTC(year, month - 1, day));
  return probe.getUTCFullYear() === year && probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day;
}

/**
 * Convierte el valor de una celda en un día calendario `{ year, month, day }`.
 * Acepta números de serie de Excel, objetos Date, `AAAA-MM-DD` y `DD/MM/AAAA`.
 * Devuelve `null` si el valor está vacío y `undefined` si no es una fecha válida.
 */
export function parseCalendarDay(value) {
  if (value === null || value === undefined || value === '') return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return undefined;
    return { year: value.getFullYear(), month: value.getMonth() + 1, day: value.getDate() };
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 1) return undefined;
    const date = new Date(EXCEL_EPOCH + Math.floor(value) * MS_PER_DAY);
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
  }

  const text = String(value).trim();
  if (!text) return null;

  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/.exec(text);
  if (match) {
    const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
    return isValidYmd(year, month, day) ? { year, month, day } : undefined;
  }

  match = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(text);
  if (match) {
    const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
    return isValidYmd(year, month, day) ? { year, month, day } : undefined;
  }

  return undefined;
}

/** Día calendario de hoy según el reloj del equipo. */
export function todayCalendarDay(now = new Date()) {
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

function toDayNumber({ year, month, day }) {
  return Math.round(Date.UTC(year, month - 1, day) / MS_PER_DAY);
}

/** Días calendario entre dos días: positivo si `to` es posterior a `from`. */
export function diffInDays(from, to) {
  return toDayNumber(to) - toDayNumber(from);
}

export function toIsoDate({ year, month, day }) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const formatter = new Intl.DateTimeFormat('es', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

export function formatDay(day) {
  if (!day) return '—';
  return formatter.format(new Date(Date.UTC(day.year, day.month - 1, day.day))).replace(/\./g, '');
}
