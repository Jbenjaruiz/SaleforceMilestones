import { useState } from 'react';
import { api } from '../api/client.js';
import { ConfirmDialog, Field, FormActions, FormError, useSubmit } from '../components/Forms.jsx';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/States.jsx';
import { useResource } from '../hooks/useResource.js';

function RoleForm({ role, onSaved, onClose }) {
  const [values, setValues] = useState({ name: role?.name ?? '', description: role?.description ?? '' });
  const { busy, error, submit } = useSubmit(async () => {
    const body = { name: values.name.trim(), description: values.description.trim() };
    await (role ? api.patch(`/roles/${role.id}`, body) : api.post('/roles', body));
    await onSaved();
    onClose();
  });

  return (
    <Modal title={role ? `Editar el rol ${role.name}` : 'Nuevo rol'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Nombre del rol"><input value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} required maxLength={100} /></Field>
        <Field label="Descripción (opcional)"><input value={values.description} onChange={(e) => setValues({ ...values, description: e.target.value })} maxLength={255} /></Field>
        <p className="muted"><small>El rol no da permisos sobre los proyectos: eso se asigna a cada usuario, proyecto por proyecto, en la pantalla de Usuarios.</small></p>
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
          <h2>Roles</h2>
          <p>El rol <strong>Administrator</strong> ve y puede todo. Los demás roles solo clasifican a los usuarios: lo que cada uno puede hacer se asigna proyecto por proyecto en <strong>Usuarios → Editar</strong>.</p>
        </div>
        <button type="button" className="button" onClick={() => setModal({ type: 'form' })}><Icon name="plus" />Nuevo rol</button>
      </div>

      <div className="card">
        <div className="table-scroll">
          <table className="table">
            <caption className="sr-only">Roles</caption>
            <thead><tr><th scope="col">Rol</th><th scope="col">Usuarios</th><th scope="col"><span className="sr-only">Acciones</span></th></tr></thead>
            <tbody>
              {roles.data.map((role) => (
                <tr key={role.id}>
                  <td data-label="Rol" className="cell-name">
                    <strong>{role.name}</strong> {role.isProtected && <span className="badge badge--active">Protegido</span>}
                    {role.description && <span className="cell-desc">{role.description}</span>}
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
