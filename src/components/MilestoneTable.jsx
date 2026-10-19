import { useState } from 'react';
import { formatDay } from '../utils/dates.js';
import Icon from './Icon.jsx';
import { DelayBadge, ProgressBar, StatusBadge } from './Badges.jsx';
import { EmptyState } from './States.jsx';
import TaskList from './TaskList.jsx';

function MilestoneRow({ row, open, onToggle }) {
  const panelId = `tasks-${row.id}`;
  return (
    <>
      <tr className={open ? 'is-open' : undefined}>
        <td data-label="ID" className="cell-id">{row.id}</td>
        <td data-label="Hito" className="cell-name">
          <strong>{row.name}</strong>
          {row.description && <span className="cell-desc">{row.description}</span>}
          {row.warnings.length > 0 && (
            <span className="row-warning" title={row.warnings.join(' ')}>
              <Icon name="alert" />{row.warnings.length} {row.warnings.length === 1 ? 'aviso' : 'avisos'}
            </span>
          )}
        </td>
        <td data-label="Responsable">{row.owner || <span className="muted">Por confirmar</span>}</td>
        <td data-label="Estado"><StatusBadge status={row.status} /></td>
        <td data-label="Avance"><ProgressBar value={row.progress} label={`Avance de ${row.name}`} /></td>
        <td data-label="Fecha estimada" className="cell-date">{formatDay(row.estimated)}</td>
        <td data-label="Fecha real" className="cell-date">{formatDay(row.completed)}</td>
        <td data-label="Retraso"><DelayBadge days={row.delay} status={row.delayStatus} /></td>
        <td data-label="Tareas" className="cell-action">
          <button type="button" className="toggle" aria-expanded={open} aria-controls={panelId} onClick={onToggle}>
            <Icon name="chevron" />
            {open ? 'Ocultar' : 'Ver'} tareas ({row.tasksDone}/{row.tasks.length})
          </button>
        </td>
      </tr>
      {open && (
        <tr className="detail">
          <td colSpan={9}>
            {row.notes && <p className="detail__notes"><strong>Observaciones del hito:</strong> {row.notes}</p>}
            {row.warnings.length > 0 && (
              <ul className="detail__warnings">
                {row.warnings.map((warning) => <li key={warning}><Icon name="alert" />{warning}</li>)}
              </ul>
            )}
            <TaskList tasks={row.tasks} id={panelId} />
          </td>
        </tr>
      )}
    </>
  );
}

export default function MilestoneTable({ rows, total }) {
  const [openIds, setOpenIds] = useState(() => new Set());
  const toggle = (id) => setOpenIds((current) => {
    const next = new Set(current);
    if (!next.delete(id)) next.add(id);
    return next;
  });

  return (
    <div className="card">
      <div className="table-scroll">
        <table className="table">
          <caption className="sr-only">Hitos del proyecto con su avance y fechas</caption>
          <thead>
            <tr>
              <th scope="col">ID</th><th scope="col">Hito</th><th scope="col">Responsable</th><th scope="col">Estado</th>
              <th scope="col">Avance</th><th scope="col">Fecha estimada</th><th scope="col">Fecha real</th>
              <th scope="col">Retraso</th><th scope="col"><span className="sr-only">Tareas</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => <MilestoneRow key={row.id} row={row} open={openIds.has(row.id)} onToggle={() => toggle(row.id)} />)}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <EmptyState>Ningún hito coincide con los filtros seleccionados.</EmptyState>}
      <p className="table-foot">Mostrando {rows.length} de {total} hitos. Los indicadores superiores siempre consideran el proyecto completo.</p>
    </div>
  );
}
