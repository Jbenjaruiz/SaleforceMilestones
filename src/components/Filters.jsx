import { STATUSES } from '../utils/dashboard.js';

const DELAY_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'late', label: 'Retrasados' },
  { value: 'onTime', label: 'Dentro del plazo' },
  { value: 'unknown', label: 'Sin datos' },
];

export default function Filters({ filters, onChange }) {
  return (
    <div className="filters">
      <label className="field">
        <span>Estado del hito</span>
        <select value={filters.status} onChange={(event) => onChange({ ...filters, status: event.target.value })}>
          <option value="all">Todos los estados</option>
          {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
      </label>
      <fieldset className="segmented">
        <legend>Situación de retraso</legend>
        {DELAY_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={filters.delay === option.value}
            onClick={() => onChange({ ...filters, delay: option.value })}
          >
            {option.label}
          </button>
        ))}
      </fieldset>
    </div>
  );
}
