import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import ActivityModal from '../components/Activity.jsx';
import AlertsPanel from '../components/AlertsPanel.jsx';
import Filters, { filterMilestones } from '../components/Filters.jsx';
import { ConfirmDialog, MilestoneForm, TaskForm } from '../components/Forms.jsx';
import Icon from '../components/Icon.jsx';
import KpiCards from '../components/KpiCards.jsx';
import MilestoneTable from '../components/MilestoneTable.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/States.jsx';
import { useResource } from '../hooks/useResource.js';
import { formatDate } from '../utils/format.js';

const PROJECT_KEY = 'seguimiento.project';
const readStoredProject = () => { try { return localStorage.getItem(PROJECT_KEY); } catch { return null; } };
const storeProject = (id) => { try { localStorage.setItem(PROJECT_KEY, id); } catch { /* preferencia local: no es esencial */ } };

const fetchProjects = () => api.get('/projects');
const fetchDashboard = (projectId) => api.get(`/projects/${projectId}/dashboard`);

export default function DashboardPage() {
  const { user } = useAuth();
  const projects = useResource(fetchProjects, 'projects');
  const [selected, setSelected] = useState(readStoredProject);
  const [filters, setFilters] = useState({ status: 'all', delay: 'all' });
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState('');
  const [busyTaskId, setBusyTaskId] = useState(null);

  // Si el proyecto recordado ya no existe (o se archivó), se usa el primero de la lista.
  const projectId = useMemo(() => {
    const list = projects.data ?? [];
    return list.some((project) => project.id === selected) ? selected : list[0]?.id ?? null;
  }, [projects.data, selected]);
  useEffect(() => { if (projectId) storeProject(projectId); }, [projectId]);

  const dashboard = useResource(fetchDashboard, projectId);
  const data = dashboard.data;
  // Lo que el usuario puede hacer lo decide la asignación de este proyecto (el administrador puede todo).
  const perms = data?.permissions ?? {};
  const visible = useMemo(() => (data ? filterMilestones(data.milestones, filters) : []), [data, filters]);
  const closeModal = useCallback(() => setModal(null), []);

  /**
   * Ejecuta un cambio y recarga el tablero sin parpadeo. Si la API lo rechaza, el error se propaga al formulario
   * que lo pidió; con `notify` se muestra además sobre el tablero (acciones sin formulario, como el botón de check).
   */
  const mutate = async (action, { notify = false } = {}) => {
    setNotice('');
    try {
      await action();
    } catch (error) {
      if (notify) setNotice(error.message);
      throw error;
    } finally {
      await dashboard.refresh();
    }
  };

  const toggleTask = async (task) => {
    setBusyTaskId(task.id);
    try { await mutate(() => api.put(`/tasks/${task.id}/completion`, { completed: !task.isCompleted }), { notify: true }); } catch { /* el aviso ya se mostró */ } finally { setBusyTaskId(null); }
  };

  const toggleValidation = async (task) => {
    setBusyTaskId(task.id);
    try { await mutate(() => api.put(`/tasks/${task.id}/validation`, { ready: !task.readyForValidation }), { notify: true }); } catch { /* el aviso ya se mostró */ } finally { setBusyTaskId(null); }
  };

  const actions = {
    onOpenMilestoneActivity: (milestone) => setModal({ type: 'activity', target: { type: 'milestone', id: milestone.id, title: `${milestone.code} · ${milestone.name}` } }),
    ...(perms.create && { onAddTask: (milestone) => setModal({ type: 'task', milestone }) }),
    ...(perms.update && { onEditMilestone: (milestone) => setModal({ type: 'milestone', milestone }) }),
    ...(perms.delete && { onDeleteMilestone: (milestone) => setModal({ type: 'delete-milestone', milestone }) }),
    task: {
      busyTaskId,
      onOpenActivity: (task) => setModal({ type: 'activity', target: { type: 'task', id: task.id, title: task.name } }),
      ...(perms.update && {
        onToggle: toggleTask,
        onValidation: toggleValidation,
        onEdit: (task) => setModal({ type: 'task', task, milestone: data.milestones.find((m) => m.id === task.milestoneId) }),
      }),
      ...(perms.delete && { onDelete: (task) => setModal({ type: 'delete-task', task }) }),
    },
  };

  if (projects.status === 'loading') return <main className="container main"><LoadingState>Cargando proyectos…</LoadingState></main>;
  if (projects.status === 'error') return <main className="container main"><ErrorState message={projects.error} onRetry={projects.reload} /></main>;

  if (!projectId) {
    return (
      <main className="container main">
        <EmptyState>
          {user.isAdmin
            ? <><p>Todavía no hay proyectos disponibles.</p><p><Link to="/admin/projects">Cree el primer proyecto</Link> para empezar.</p></>
            : <><p>No tiene proyectos asignados.</p><p>Solicite a un administrador que le asigne los proyectos en los que debe trabajar.</p></>}
        </EmptyState>
      </main>
    );
  }

  return (
    <main className="container main">
      <div className="toolbar">
        <label className="field">
          <span>Proyecto</span>
          <select value={projectId} onChange={(event) => { setSelected(event.target.value); setFilters({ status: 'all', delay: 'all' }); }}>
            {projects.data.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </label>
        <div className="toolbar__end">
          {data && <p className="muted toolbar__date">Datos calculados al {formatDate(data.today)}</p>}
          <button type="button" className="button button--ghost" onClick={dashboard.refresh} disabled={dashboard.status === 'loading' || dashboard.status === 'refreshing'}>
            <Icon name="refresh" />
            {dashboard.status === 'refreshing' ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>
      </div>

      {notice && <p className="form-error" role="alert">{notice}</p>}
      {dashboard.status === 'error' && !data && <ErrorState message={dashboard.error} onRetry={dashboard.reload} />}
      {dashboard.status === 'loading' && <LoadingState>Cargando el tablero…</LoadingState>}

      {data && (
        <>
          <AlertsPanel alerts={data.alerts} />
          <KpiCards summary={data.summary} />
          <section aria-labelledby="hitos-title">
            <div className="section-head">
              <div>
                <h2 id="hitos-title">{data.project.name}</h2>
                <p>{data.project.description || 'Seleccione «Ver tareas» para consultar el detalle de cada hito.'}</p>
              </div>
              <div className="section-head__end">
                <Filters filters={filters} onChange={setFilters} />
                {perms.create && <button type="button" className="button" onClick={() => setModal({ type: 'milestone' })}><Icon name="plus" />Nuevo hito</button>}
              </div>
            </div>
            <MilestoneTable rows={visible} total={data.milestones.length} actions={actions} />
          </section>
        </>
      )}

      {modal?.type === 'milestone' && (
        <MilestoneForm
          milestone={modal.milestone}
          onClose={closeModal}
          onSave={(values) => mutate(() => (modal.milestone ? api.patch(`/milestones/${modal.milestone.id}`, values) : api.post(`/projects/${projectId}/milestones`, values)))}
        />
      )}
      {modal?.type === 'task' && (
        <TaskForm
          milestone={modal.milestone}
          task={modal.task}
          onClose={closeModal}
          onSave={(values) => mutate(() => (modal.task ? api.patch(`/tasks/${modal.task.id}`, values) : api.post(`/milestones/${modal.milestone.id}/tasks`, values)))}
        />
      )}
      {modal?.type === 'activity' && <ActivityModal target={modal.target} permissions={perms} onClose={closeModal} />}
      {modal?.type === 'delete-milestone' && (
        <ConfirmDialog title="Eliminar hito" confirmLabel="Eliminar hito" onClose={closeModal} onConfirm={() => mutate(() => api.delete(`/milestones/${modal.milestone.id}`))}>
          <p>Se eliminará el hito <strong>{modal.milestone.code}</strong> junto con sus <strong>{modal.milestone.taskCount} tareas</strong>, sus comentarios y adjuntos. Esta acción no se puede deshacer.</p>
        </ConfirmDialog>
      )}
      {modal?.type === 'delete-task' && (
        <ConfirmDialog title="Eliminar tarea" confirmLabel="Eliminar tarea" onClose={closeModal} onConfirm={() => mutate(() => api.delete(`/tasks/${modal.task.id}`))}>
          <p>Se eliminará la tarea <strong>«{modal.task.name}»</strong> con sus comentarios y adjuntos. Esta acción no se puede deshacer.</p>
        </ConfirmDialog>
      )}
    </main>
  );
}
