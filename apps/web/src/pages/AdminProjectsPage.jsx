import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { describeIssue } from '../api/importIssues.js';
import { ConfirmDialog, Field, FormActions, FormError, useSubmit } from '../components/Forms.jsx';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/States.jsx';
import { useResource } from '../hooks/useResource.js';
import { formatDateTime } from '../utils/format.js';

function ProjectForm({ project, onSaved, onClose }) {
  const [values, setValues] = useState({ name: project?.name ?? '', description: project?.description ?? '' });
  const { busy, error, submit } = useSubmit(async () => {
    const body = { name: values.name.trim(), description: values.description.trim() };
    await (project ? api.patch(`/projects/${project.id}`, body) : api.post('/projects', body));
    await onSaved();
    onClose();
  });

  return (
    <Modal title={project ? 'Editar proyecto' : 'Nuevo proyecto'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Nombre" hint="Por ejemplo, la revisión del documento de cambios: «CC-001 Rev. 3 (8 oct 2026)».">
          <input value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} required maxLength={200} />
        </Field>
        <Field label="Descripción (opcional)"><textarea value={values.description} onChange={(e) => setValues({ ...values, description: e.target.value })} rows={3} maxLength={1000} /></Field>
        <p className="muted"><small>Un proyecto no tiene fecha de vencimiento y puede convivir con otros activos.</small></p>
        <FormError message={error} />
        <FormActions busy={busy} submitLabel="Guardar proyecto" onCancel={onClose} />
      </form>
    </Modal>
  );
}

function IssuesTable({ report }) {
  return (
    <div className="import-issues" role="region" aria-label="Problemas del archivo">
      <p className="form-error" role="alert">
        El archivo tiene {report.totalIssues} {report.totalIssues === 1 ? 'problema' : 'problemas'}. No se importó nada: corríjalos todos en el Excel y vuelva a subirlo.
        {report.truncated && ` Se muestran los primeros ${report.issues.length}.`}
      </p>
      <div className="table-scroll">
        <table className="table table--compact">
          <thead><tr><th scope="col">Fila</th><th scope="col">Columna</th><th scope="col">Problema</th></tr></thead>
          <tbody>
            {report.issues.map((issue, index) => (
              <tr key={`${issue.row}-${issue.column}-${issue.code}-${index}`}>
                <td data-label="Fila">{issue.row ?? '—'}</td>
                <td data-label="Columna">{issue.column ?? '—'}</td>
                <td data-label="Problema">{describeIssue(issue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Dos pasos: «Validar archivo» solo revisa; «Importar» guarda, y solo se ofrece si la validación salió limpia. */
function ImportModal({ project, onImported, onClose }) {
  const [file, setFile] = useState(null);
  const [report, setReport] = useState(null);
  const [done, setDone] = useState(null);

  const send = async (dryRun) => {
    const form = new FormData();
    form.append('file', file);
    try {
      return await api.upload(`/projects/${project.id}/import${dryRun ? '?dryRun=true' : ''}`, form);
    } catch (error) {
      if (error.status === 422 && error.data?.issues) return error.data; // el informe de errores no es una falla de red
      throw error;
    }
  };

  const validate = useSubmit(async () => { setReport(await send(true)); });
  const run = useSubmit(async () => {
    const result = await send(false);
    if (!result.valid) { setReport(result); return; }
    setDone(result.summary);
    await onImported();
  });

  const choose = (event) => { setFile(event.target.files[0] ?? null); setReport(null); };

  return (
    <Modal title={`Importar a «${project.name}»`} onClose={onClose} wide>
      {done ? (
        <div className="form">
          <p role="status">Se importaron <strong>{done.milestones} hitos</strong> y <strong>{done.tasks} tareas</strong>.</p>
          <div className="form-actions">
            <Link className="button button--ghost" to="/" onClick={onClose}>Ver el tablero</Link>
            <button type="button" className="button" onClick={onClose}>Listo</button>
          </div>
        </div>
      ) : (
        <div className="form">
          <p className="muted">Cargue un Excel con la plantilla (una fila por tarea). La importación es todo o nada: si algo falla, no se guarda nada.</p>
          <Field label="Archivo de Excel (.xlsx)">
            <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={choose} />
          </Field>
          <FormError message={validate.error || run.error} />
          {report && !report.valid && <IssuesTable report={report} />}
          {report?.valid && (
            <p role="status" className="import-ok">
              <Icon name="check" /> El archivo es válido: se crearán <strong>{report.summary.milestones} hitos</strong> y <strong>{report.summary.tasks} tareas</strong>.
            </p>
          )}
          <div className="form-actions">
            <button type="button" className="button button--ghost" onClick={onClose}>Cancelar</button>
            <button type="button" className="button button--ghost" disabled={!file || validate.busy || run.busy} onClick={validate.submit}>{validate.busy ? 'Validando…' : 'Validar archivo'}</button>
            <button type="button" className="button" disabled={!report?.valid || run.busy} onClick={run.submit}>{run.busy ? 'Importando…' : 'Importar'}</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

async function downloadTemplate(setError) {
  try {
    const url = URL.createObjectURL(await api.blob('/imports/template'));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plantilla-importacion.xlsx';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    setError(error.message);
  }
}

const fetchProjects = () => api.get('/projects?includeArchived=true');

export default function AdminProjectsPage() {
  const projects = useResource(fetchProjects, 'projects');
  const [modal, setModal] = useState(null);
  const [error, setError] = useState('');
  const close = () => setModal(null);

  if (projects.status === 'loading') return <main className="container main"><LoadingState>Cargando proyectos…</LoadingState></main>;
  if (projects.status === 'error' && !projects.data) return <main className="container main"><ErrorState message={projects.error} onRetry={projects.reload} /></main>;

  return (
    <main className="container main">
      <div className="section-head">
        <div>
          <h2>Proyectos</h2>
          <p>Archivar un proyecto lo oculta del selector sin borrar nada; solo los administradores lo ven y pueden reactivarlo.</p>
        </div>
        <div className="section-head__end">
          <button type="button" className="button button--ghost" onClick={() => downloadTemplate(setError)}><Icon name="download" />Descargar plantilla</button>
          <button type="button" className="button" onClick={() => setModal({ type: 'form' })}><Icon name="plus" />Nuevo proyecto</button>
        </div>
      </div>
      <FormError message={error} />

      <div className="card">
        <div className="table-scroll">
          <table className="table">
            <caption className="sr-only">Proyectos, incluidos los archivados</caption>
            <thead><tr><th scope="col">Proyecto</th><th scope="col">Estado</th><th scope="col">Creado</th><th scope="col"><span className="sr-only">Acciones</span></th></tr></thead>
            <tbody>
              {projects.data.map((project) => (
                <tr key={project.id}>
                  <td data-label="Proyecto" className="cell-name"><strong>{project.name}</strong>{project.description && <span className="cell-desc">{project.description}</span>}</td>
                  <td data-label="Estado"><span className={`badge badge--${project.isArchived ? 'muted' : 'done'}`}>{project.isArchived ? 'Archivado' : 'Activo'}</span></td>
                  <td data-label="Creado" className="cell-date">{formatDateTime(project.createdAt)}</td>
                  <td data-label="Acciones" className="cell-action">
                    {!project.isArchived && (
                      <>
                        <button type="button" className="button button--small button--ghost" onClick={() => setModal({ type: 'import', project })} aria-label={`Importar un Excel a ${project.name}`}><Icon name="upload" />Importar</button>
                        <button type="button" className="button button--small button--ghost" onClick={() => setModal({ type: 'form', project })} aria-label={`Editar ${project.name}`}><Icon name="edit" />Editar</button>
                      </>
                    )}
                    <button type="button" className="button button--small button--ghost" onClick={() => setModal({ type: 'archive', project })} aria-label={`${project.isArchived ? 'Reactivar' : 'Archivar'} ${project.name}`}>
                      <Icon name="archive" />{project.isArchived ? 'Reactivar' : 'Archivar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {projects.data.length === 0 && <EmptyState>Todavía no hay proyectos. Cree el primero para empezar.</EmptyState>}
      </div>

      {modal?.type === 'form' && <ProjectForm project={modal.project} onSaved={projects.refresh} onClose={close} />}
      {modal?.type === 'import' && <ImportModal project={modal.project} onImported={projects.refresh} onClose={close} />}
      {modal?.type === 'archive' && (
        <ConfirmDialog
          title={modal.project.isArchived ? 'Reactivar proyecto' : 'Archivar proyecto'}
          confirmLabel={modal.project.isArchived ? 'Reactivar' : 'Archivar'}
          onClose={close}
          onConfirm={async () => { await api.post(`/projects/${modal.project.id}/${modal.project.isArchived ? 'unarchive' : 'archive'}`); await projects.refresh(); }}
        >
          <p>
            {modal.project.isArchived
              ? <>El proyecto <strong>{modal.project.name}</strong> volverá a aparecer en el selector para todos y podrá editarse.</>
              : <>El proyecto <strong>{modal.project.name}</strong> dejará de aparecer en el selector y no podrá editarse. No se borra nada; podrá reactivarlo cuando quiera.</>}
          </p>
        </ConfirmDialog>
      )}
    </main>
  );
}
