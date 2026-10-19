import { EmptyState } from './States.jsx';

function completionBadge(completed) {
  if (completed === true) return { className: 'badge--done', label: 'Completada' };
  if (completed === false) return { className: 'badge--pending', label: 'Pendiente' };
  return { className: 'badge--invalid', label: 'Dato inválido' };
}

export default function TaskList({ tasks, id }) {
  if (!tasks.length) return <EmptyState>Este hito todavía no tiene tareas registradas.</EmptyState>;

  return (
    <ul className="tasks" id={id}>
      {tasks.map((task) => {
        const badge = completionBadge(task.completed);
        return (
          <li className="task" key={task.id}>
            <div className="task__main">
              <p className="task__name"><span className="task__id">{task.id}</span> {task.name}</p>
              {task.notes && <p className="task__notes">{task.notes}</p>}
              {task.source && <p className="task__source">Fuente: {task.source}</p>}
            </div>
            <div className="task__meta">
              <span className={`badge ${badge.className}`}>{badge.label}</span>
              {task.type && <span className="tag tag--type">{task.type}</span>}
              {task.changeControls.map((code) => <span className="tag tag--cc" key={code}>{code}</span>)}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
