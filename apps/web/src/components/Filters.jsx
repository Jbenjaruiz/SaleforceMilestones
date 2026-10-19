import { STATUS_LABELS } from './Badges.jsx';

const DELAY_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'late', label: 'Retrasados' },
  { value: 'onTime', label: 'En plazo' },
];

/** Los filtros solo acotan la tabla; los indicadores siempre cubren el proyecto completo. */
export function filterMilestones(milestones, { status, delay }) {
  return milestones.filter((milestone) => {
    if (status !== 'all' && milestone.status !== status) return false;
    if (delay === 'late') return milestone.delayDays > 0;
    if (delay === 'onTime') return milestone.status !== 'no_tasks' && milestone.delayDays === 0;
    return true;
  });
}

export default function Filters({ filters, onChange }) {
  return (
    <div className="filters">
      <label className="field">
        <span>Estado del hito</span>
        <select value={filters.status} onChange={(event) => onChange({ ...filters, status: event.target.value })}>
          <option value="all">Todos los estados</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
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
