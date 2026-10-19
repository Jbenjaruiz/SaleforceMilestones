import { useState } from 'react';
import { formatDate } from '../utils/format.js';
import { DelayBadge, ProgressBar, StatusBadge } from './Badges.jsx';
import Icon from './Icon.jsx';
import { EmptyState } from './States.jsx';
import TaskList from './TaskList.jsx';

/**
 * `actions` agrupa lo que el usuario puede hacer según sus permisos; las funciones ausentes ocultan su botón:
 * onAddTask / onEditMilestone / onDeleteMilestone / onOpenActivity y las de cada tarea (ver TaskList).
 */
function MilestoneRow({ row, open, onToggle, actions }) {
  const panelId = `tasks-${row.id}`;
  const empty = row.status === 'no_tasks';

  return (
    <>
      <tr className={open ? 'is-open' : undefined}>
        <td data-label="Código" className="cell-id">{row.code}</td>
        <td data-label="Hito" className="cell-name">
          <strong>{row.name}</strong>
          {row.description && <span className="cell-desc">{row.description}</span>}
        </td>
        <td data-label="Estado"><StatusBadge status={row.status} /></td>
        <td data-label="Avance"><ProgressBar value={row.progress} label={`Avance de ${row.code}`} /></td>
        <td data-label="Inicio" className="cell-date">{formatDate(row.startDate)}</td>
        <td data-label="Fecha estimada" className="cell-date">{formatDate(row.estimatedDate)}</td>
        <td data-label="Fecha real" className="cell-date">{formatDate(row.actualDate)}</td>
        <td data-label="Retraso"><DelayBadge days={row.delayDays} empty={empty} /></td>
        <td data-label="Tareas" className="cell-action">
          <button type="button" className="toggle" aria-expanded={open} aria-controls={panelId} onClick={onToggle}>
            <Icon name="chevron" />
            {open ? 'Ocultar' : 'Ver'} tareas ({row.completedCount}/{row.taskCount})
          </button>
        </td>
      </tr>
      {open && (
        <tr className="detail">
          <td colSpan={9}>
            <div className="detail__toolbar">
              {actions.onAddTask && <button type="button" className="button button--small" onClick={() => actions.onAddTask(row)}><Icon name="plus" />Agregar tarea</button>}
              {actions.onOpenMilestoneActivity && <button type="button" className="button button--small button--ghost" onClick={() => actions.onOpenMilestoneActivity(row)}><Icon name="comment" />Comentarios del hito</button>}
              {actions.onEditMilestone && <button type="button" className="button button--small button--ghost" onClick={() => actions.onEditMilestone(row)}><Icon name="edit" />Editar hito</button>}
              {actions.onDeleteMilestone && <button type="button" className="button button--small button--ghost button--danger-text" onClick={() => actions.onDeleteMilestone(row)}><Icon name="trash" />Eliminar hito</button>}
            </div>
            <TaskList tasks={row.tasks} id={panelId} actions={actions.task} />
          </td>
        </tr>
      )}
    </>
  );
}

export default function MilestoneTable({ rows, total, actions = {} }) {
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
              <th scope="col">Código</th><th scope="col">Hito</th><th scope="col">Estado</th><th scope="col">Avance</th>
              <th scope="col">Inicio</th><th scope="col">Fecha estimada</th><th scope="col">Fecha real</th>
              <th scope="col">Retraso</th><th scope="col"><span className="sr-only">Tareas</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => <MilestoneRow key={row.id} row={row} open={openIds.has(row.id)} onToggle={() => toggle(row.id)} actions={actions} />)}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <EmptyState>{total === 0 ? 'Este proyecto todavía no tiene hitos.' : 'Ningún hito coincide con los filtros seleccionados.'}</EmptyState>}
      <p className="table-foot">Mostrando {rows.length} de {total} hitos. Los indicadores superiores siempre consideran el proyecto completo.</p>
    </div>
  );
}
