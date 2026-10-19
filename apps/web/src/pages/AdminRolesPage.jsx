import { useState } from 'react';
import { api } from '../api/client.js';
import { ConfirmDialog, Field, FormActions, FormError, useSubmit } from '../components/Forms.jsx';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/States.jsx';
import { useResource } from '../hooks/useResource.js';

const PERMISSIONS = [
  { code: 'read', label: 'Ver', hint: 'Consultar proyectos, hitos, tareas, comentarios y adjuntos.' },
  { code: 'create', label: 'Crear', hint: 'Crear hitos, tareas, comentarios y adjuntos.' },
  { code: 'update', label: 'Modificar', hint: 'Editar hitos y tareas, marcar tareas y adjuntar archivos a tareas.' },
  { code: 'delete', label: 'Eliminar', hint: 'Eliminar hitos y tareas (con sus comentarios y adjuntos).' },
];
const LABEL = Object.fromEntries(PERMISSIONS.map((permission) => [permission.code, permission.label]));

function RoleForm({ role, onSaved, onClose }) {
  const [values, setValues] = useState({ name: role?.name ?? '', description: role?.description ?? '', permissions: role?.permissions ?? ['read'] });
  const toggle = (code) => setValues((current) => ({
    ...current,
    permissions: current.permissions.includes(code) ? current.permissions.filter((item) => item !== code) : [...current.permissions, code],
  }));
  const { busy, error, submit } = useSubmit(async () => {
    const body = { name: values.name.trim(), description: values.description.trim(), permissions: values.permissions };
    await (role ? api.patch(`/roles/${role.id}`, body) : api.post('/roles', body));
    await onSaved();
    onClose();
  });

  return (
    <Modal title={role ? `Editar el rol ${role.name}` : 'Nuevo rol'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Nombre del rol"><input value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} required maxLength={100} /></Field>
        <Field label="Descripción (opcional)"><input value={values.description} onChange={(e) => setValues({ ...values, description: e.target.value })} maxLength={255} /></Field>
        <fieldset className="permissions">
          <legend>Permisos</legend>
          {PERMISSIONS.map((permission) => (
            <label className="check-row" key={permission.code}>
              <input type="checkbox" checked={values.permissions.includes(permission.code)} onChange={() => toggle(permission.code)} />
              <span><strong>{permission.label}</strong> <small className="muted">{permission.hint}</small></span>
            </label>
          ))}
        </fieldset>
        <p className="muted"><small>Las acciones valen para todo el sistema. Gestionar usuarios, roles, proyectos e importaciones es solo del rol Administrator.</small></p>
        <FormError message={error} />
        <FormActions busy={busy} submitLabel="Guardar rol" onCancel={onClose} />
      </form>
    </Modal>
  );
}

export default function AdminRolesPage() {
  const roles = useResource(() => api.get('/roles'), 'roles');
  const [modal, setModal] = useState(null);
  const close = () => setModal(null);

  if (roles.status === 'loading') return <main className="container main"><LoadingState>Cargando roles…</LoadingState></main>;
  if (roles.status === 'error' && !roles.data) return <main className="container main"><ErrorState message={roles.error} onRetry={roles.reload} /></main>;

  return (
    <main className="container main">
      <div className="section-head">
        <div>
          <h2>Roles y permisos</h2>
          <p>Cada rol agrupa las acciones Ver, Crear, Modificar y Eliminar. Un usuario tiene un solo rol.</p>
        </div>
        <button type="button" className="button" onClick={() => setModal({ type: 'form' })}><Icon name="plus" />Nuevo rol</button>
      </div>

      <div className="card">
        <div className="table-scroll">
          <table className="table">
            <caption className="sr-only">Roles y sus permisos</caption>
            <thead><tr><th scope="col">Rol</th><th scope="col">Permisos</th><th scope="col">Usuarios</th><th scope="col"><span className="sr-only">Acciones</span></th></tr></thead>
            <tbody>
              {roles.data.map((role) => (
                <tr key={role.id}>
                  <td data-label="Rol" className="cell-name">
                    <strong>{role.name}</strong> {role.isProtected && <span className="badge badge--active">Protegido</span>}
                    {role.description && <span className="cell-desc">{role.description}</span>}
                  </td>
                  <td data-label="Permisos">
                    {role.isProtected ? <span className="muted">Todos (siempre)</span> : (role.permissions.length === 0 ? <span className="muted">Ninguno</span> : role.permissions.map((code) => <span className="tag tag--cc" key={code}>{LABEL[code]}</span>))}
                  </td>
                  <td data-label="Usuarios">{role.userCount}</td>
                  <td data-label="Acciones" className="cell-action">
                    {role.isProtected ? <span className="muted">No se puede modificar</span> : (
                      <>
                        <button type="button" className="button button--small button--ghost" onClick={() => setModal({ type: 'form', role })} aria-label={`Editar el rol ${role.name}`}><Icon name="edit" />Editar</button>
                        <button type="button" className="button button--small button--ghost button--danger-text" onClick={() => setModal({ type: 'delete', role })} aria-label={`Eliminar el rol ${role.name}`}><Icon name="trash" />Eliminar</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {roles.data.length === 0 && <EmptyState>No hay roles.</EmptyState>}
      </div>

      {modal?.type === 'form' && <RoleForm role={modal.role} onSaved={roles.refresh} onClose={close} />}
      {modal?.type === 'delete' && (
        <ConfirmDialog title="Eliminar rol" confirmLabel="Eliminar rol" onClose={close} onConfirm={async () => { await api.delete(`/roles/${modal.role.id}`); await roles.refresh(); }}>
          <p>Se eliminará el rol <strong>{modal.role.name}</strong>. {modal.role.userCount > 0 ? `Todavía tiene ${modal.role.userCount} usuarios: reasígnelos antes.` : 'Esta acción no se puede deshacer.'}</p>
        </ConfirmDialog>
      )}
    </main>
  );
}
