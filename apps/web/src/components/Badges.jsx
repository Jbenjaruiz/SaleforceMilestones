import { formatDays, formatPercent } from '../utils/format.js';

const STATUS = {
  completed: { className: 'done', label: 'Finalizado' },
  in_progress: { className: 'active', label: 'En curso' },
  pending: { className: 'pending', label: 'Pendiente' },
  no_tasks: { className: 'muted', label: 'Sin tareas' },
};

export const STATUS_LABELS = Object.fromEntries(Object.entries(STATUS).map(([key, value]) => [key, value.label]));

export function StatusBadge({ status }) {
  const { className, label } = STATUS[status] ?? STATUS.pending;
  return <span className={`badge badge--${className}`}>{label}</span>;
}

/** Los días de retraso ya vienen calculados por la API. */
export function DelayBadge({ days, empty = false }) {
  if (empty) return <span className="muted">—</span>;
  if (days > 0) return <span className="badge badge--late">{formatDays(days)}</span>;
  return <span className="badge badge--ontime">En plazo</span>;
}

export function ProgressBar({ value, label }) {
  const known = value !== null && value !== undefined;
  return (
    <div className="progress">
      <span className="progress__value">{formatPercent(value)}</span>
      <div
        className="progress__track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={known ? Math.round(value) : undefined}
        aria-valuetext={known ? formatPercent(value) : 'No disponible'}
      >
        <span className="progress__bar" style={{ width: known ? `${value}%` : 0 }} />
      </div>
    </div>
  );
}
