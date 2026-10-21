import { formatDate } from '../utils/format.js';
import { DelayBadge, StatusBadge } from './Badges.jsx';
import Icon from './Icon.jsx';
import { EmptyState } from './States.jsx';

/**
 * `actions` es opcional; cada función aparece solo si el usuario tiene el permiso correspondiente:
 * onToggle (modificar), onValidation (modificar), onEdit (modificar), onDelete (eliminar) y onOpenActivity (ver).
 */
export default function TaskList({ tasks, id, actions = {} }) {
  if (!tasks.length) return <EmptyState>Este hito todavía no tiene tareas.</EmptyState>;

  return (
    <ul className="tasks" id={id}>
      {tasks.map((task) => (
        <li className={`task${task.isCompleted ? ' task--done' : ''}`} key={task.id}>
          {actions.onToggle ? (
            <button
              type="button"
              className="check"
              aria-pressed={task.isCompleted}
              aria-label={task.isCompleted ? `Reabrir la tarea «${task.name}»` : `Marcar «${task.name}» como finalizada`}
              title={task.isCompleted ? 'Reabrir la tarea' : 'Marcar como finalizada'}
              disabled={actions.busyTaskId === task.id}
              onClick={() => actions.onToggle(task)}
            >
              <Icon name="check" />
            </button>
          ) : (
            <span className={`check check--static${task.isCompleted ? ' is-on' : ''}`} aria-hidden="true"><Icon name="check" /></span>
          )}

          <div className="task__main">
            <p className="task__name">{task.name}</p>
            <p className="task__dates">
              <span>Inicio <strong>{formatDate(task.startDate)}</strong></span>
              <span>Estimada <strong>{formatDate(task.estimatedDate)}</strong></span>
              {task.actualDate && <span>Entregada <strong>{formatDate(task.actualDate)}</strong></span>}
              <span>Responsable <strong>{task.responsible || 'Sin asignar'}</strong></span>
            </p>
          </div>

          <div className="task__meta">
            <StatusBadge status={task.status} />
            {task.readyForValidation && !task.isCompleted && <span className="badge badge--validation">Validación del cliente</span>}
            <DelayBadge days={task.delayDays} />
          </div>

          <div className="task__actions">
            {actions.onOpenActivity && (
              <button type="button" className="icon-button" onClick={() => actions.onOpenActivity(task)} aria-label={`Comentarios y adjuntos de «${task.name}»`} title="Comentarios y adjuntos">
                <Icon name="comment" />
              </button>
            )}
            {actions.onValidation && !task.isCompleted && (
              <button
                type="button"
                className={`icon-button${task.readyForValidation ? ' is-on' : ''}`}
                aria-pressed={task.readyForValidation}
                aria-label={task.readyForValidation ? `Quitar «${task.name}» de la validación del cliente` : `Marcar «${task.name}» como lista para la validación del cliente`}
                title={task.readyForValidation ? 'Quitar de la validación del cliente' : 'Lista para la validación del cliente'}
                disabled={actions.busyTaskId === task.id}
                onClick={() => actions.onValidation(task)}
              >
                <Icon name="validate" />
              </button>
            )}
            {actions.onEdit && (
              <button type="button" className="icon-button" onClick={() => actions.onEdit(task)} aria-label={`Editar la tarea «${task.name}»`} title="Editar">
                <Icon name="edit" />
              </button>
            )}
            {actions.onDelete && (
              <button type="button" className="icon-button icon-button--danger" onClick={() => actions.onDelete(task)} aria-label={`Eliminar la tarea «${task.name}»`} title="Eliminar">
                <Icon name="trash" />
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
