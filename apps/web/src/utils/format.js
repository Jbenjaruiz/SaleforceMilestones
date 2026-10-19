// Las fechas llegan de la API como días calendario «AAAA-MM-DD», sin hora ni zona horaria.

const dateFormatter = new Intl.DateTimeFormat('es', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
const dateTimeFormatter = new Intl.DateTimeFormat('es', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function formatDate(iso) {
  if (!iso) return '—';
  const [year, month, day] = iso.split('-').map(Number);
  return dateFormatter.format(new Date(Date.UTC(year, month - 1, day))).replace(/\./g, '');
}

/** Instantes con hora (comentarios, auditoría) llegan en UTC y se muestran en la hora local. */
export function formatDateTime(value) {
  if (!value) return '—';
  return dateTimeFormatter.format(new Date(value)).replace(/\./g, '');
}

/** Un decimal como máximo, solo para mostrar; el cálculo conserva la precisión. */
export function formatPercent(value) {
  if (value === null || value === undefined) return 'N/D';
  return `${new Intl.NumberFormat('es', { maximumFractionDigits: 1 }).format(value)} %`;
}

export const formatDays = (days) => `${days} ${days === 1 ? 'día' : 'días'}`;

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
