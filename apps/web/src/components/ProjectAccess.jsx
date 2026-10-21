import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useResource } from '../hooks/useResource.js';
import { LoadingState } from './States.jsx';

const fetchAccess = (userId) => Promise.all([api.get('/projects'), api.get(`/users/${userId}/projects`)]).then(([projects, assignments]) => ({ projects, assignments }));

const NONE = { assigned: false, create: false, update: false, delete: false };

/** Convierte las asignaciones guardadas en el estado editable: una fila por proyecto activo. */
function buildRows({ projects, assignments }) {
  const byProject = new Map(assignments.map((assignment) => [assignment.projectId, assignment]));
  return projects.map((project) => {
    const saved = byProject.get(project.id);
    return { projectId: project.id, name: project.name, ...(saved ? { assigned: true, create: saved.create, update: saved.update, delete: saved.delete } : NONE) };
  });
}

/** Lo que se envía a la API: solo las filas asignadas. «Ver» va implícito en la asignación. */
export const toAssignments = (rows) => rows.filter((row) => row.assigned).map(({ projectId, create, update, delete: remove }) => ({ projectId, create, update, delete: remove }));

const COLUMNS = [
  { key: 'create', label: 'Crear', title: 'Crear hitos, tareas y comentarios' },
  { key: 'update', label: 'Modificar', title: 'Editar hitos y tareas, marcar tareas y adjuntar archivos a tareas' },
  { key: 'delete', label: 'Eliminar', title: 'Eliminar hitos y tareas' },
];

/**
 * Qué proyectos ve el usuario y qué puede hacer en cada uno. «Ver» es lo mismo que tener el proyecto asignado.
 * Notifica cada cambio con `onChange(rows)`; el formulario padre decide cuándo guardar.
 */
export default function ProjectAccess({ userId, onChange, onLoadedChange }) {
  const access = useResource(fetchAccess, userId);
  const [rows, setRows] = useState(null);
  const archived = access.data?.assignments.filter((assignment) => assignment.isArchived) ?? [];

  useEffect(() => {
    if (!access.data) return;
    const initial = buildRows(access.data);
    setRows(initial);
    onChange(initial);
    onLoadedChange?.(true);
    // Solo al terminar de cargar: los cambios posteriores los hace el usuario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access.data]);

  const update = (projectId, patch) => {
    const next = rows.map((row) => (row.projectId === projectId ? { ...row, ...patch } : row));
    setRows(next);
    onChange(next);
  };

  if (access.status === 'loading' || (access.status === 'ready' && !rows)) return <LoadingState>Cargando proyectos…</LoadingState>;
  if (access.status === 'error') return <p className="form-error" role="alert">{access.error}</p>;

  return (
    <fieldset className="access">
      <legend>Acceso a proyectos</legend>
      {rows.length === 0 ? (
        <p className="muted">Todavía no hay proyectos activos que asignar.</p>
      ) : (
        <div className="table-scroll">
          <table className="table table--compact access__table">
            <caption className="sr-only">Proyectos asignados y permisos en cada uno</caption>
            <thead>
              <tr>
                <th scope="col">Proyecto</th><th scope="col">Asignado</th>
                <th scope="col" title="Ver el proyecto: siempre incluido al asignarlo">Ver</th>
                {COLUMNS.map((column) => <th scope="col" key={column.key} title={column.title}>{column.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.projectId}>
                  <td data-label="Proyecto" className="cell-name"><strong>{row.name}</strong></td>
                  <td data-label="Asignado">
                    <input type="checkbox" checked={row.assigned} aria-label={`Asignar «${row.name}»`} onChange={(event) => update(row.projectId, event.target.checked ? { assigned: true } : NONE)} />
                  </td>
                  <td data-label="Ver"><input type="checkbox" checked={row.assigned} disabled aria-label={`Ver «${row.name}»`} /></td>
                  {COLUMNS.map((column) => (
                    <td data-label={column.label} key={column.key}>
                      <input type="checkbox" checked={row[column.key]} disabled={!row.assigned} aria-label={`${column.label} en «${row.name}»`} onChange={(event) => update(row.projectId, { [column.key]: event.target.checked })} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {archived.length > 0 && (
        <p className="muted"><small>Tiene {archived.length} {archived.length === 1 ? 'proyecto archivado asignado' : 'proyectos archivados asignados'} ({archived.map((a) => a.projectName).join(', ')}); se conservan y vuelven a funcionar si se reactivan.</small></p>
      )}
      <p className="muted"><small>Sin proyectos asignados, el usuario no ve ninguno. Un usuario que no es administrador solo puede trabajar en los proyectos asignados, con los permisos marcados aquí.</small></p>
    </fieldset>
  );
}
