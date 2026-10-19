import { formatPercent } from '../utils/progress.js';

const STATUS_CLASS = { Pendiente: 'pending', 'En curso': 'active', Finalizado: 'done' };

export function StatusBadge({ status }) {
  return <span className={`badge badge--${STATUS_CLASS[status] ?? 'invalid'}`}>{status || 'Sin estado'}</span>;
}

export function DelayBadge({ days, status }) {
  if (status === 'unknown') return <span className="badge badge--muted" title="Falta una fecha para calcular el retraso">No calculable</span>;
  if (status === 'late') return <span className="badge badge--late">{days} {days === 1 ? 'día' : 'días'}</span>;
  return <span className="badge badge--ontime">En plazo</span>;
}

export function ProgressBar({ value, label }) {
  const known = value !== null;
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
