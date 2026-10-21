import { useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { Field, FormActions, FormError, useSubmit } from '../components/Forms.jsx';
import ProjectAccess, { toAssignments } from '../components/ProjectAccess.jsx';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/States.jsx';
import { useResource } from '../hooks/useResource.js';
import { formatDateTime } from '../utils/format.js';

const MIN_PASSWORD = 7;

function CreateUserForm({ roles, onSaved, onClose }) {
  const [values, setValues] = useState({ email: '', fullName: '', password: '', roleId: roles[0]?.id ?? '' });
  const set = (key) => (event) => setValues((current) => ({ ...current, [key]: event.target.value }));
  const { busy, error, submit } = useSubmit(async () => {
    await api.post('/users', { ...values, email: values.email.trim(), fullName: values.fullName.trim() });
    await onSaved();
    onClose();
  });

  return (
    <Modal title="Nuevo usuario" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Nombre completo"><input value={values.fullName} onChange={set('fullName')} required maxLength={150} /></Field>
        <Field label="Correo"><input type="email" value={values.email} onChange={set('email')} required maxLength={255} autoComplete="off" /></Field>
        <Field label="Contraseña inicial" hint={`Mínimo ${MIN_PASSWORD} caracteres. Entréguesela al usuario por un medio seguro.`}>
          <input type="text" value={values.password} onChange={set('password')} required minLength={MIN_PASSWORD} maxLength={72} autoComplete="off" />
        </Field>
        <Field label="Rol">
          <select value={values.roleId} onChange={set('roleId')} required>
            {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
          </select>
        </Field>
        <FormError message={error} />
        <FormActions busy={busy} submitLabel="Crear usuario" onCancel={onClose} />
      </form>
    </Modal>
  );
}

function EditUserForm({ user, roles, isSelf, onSaved, onClose }) {
  const [values, setValues] = useState({ fullName: user.fullName, roleId: user.role.id, isActive: user.isActive });
  const [rows, setRows] = useState(null); // asignaciones de proyectos; `null` hasta que cargan
  const isAdminRole = roles.find((role) => role.id === values.roleId)?.isProtected;

  const { busy, error, submit } = useSubmit(async () => {
    await api.patch(`/users/${user.id}`, { fullName: values.fullName.trim(), roleId: values.roleId, isActive: values.isActive });
    // El administrador ve todo: no se le asignan proyectos. Para los demás se guarda la lista tal como quedó.
    if (!isAdminRole && rows) await api.put(`/users/${user.id}/projects`, { assignments: toAssignments(rows) });
    await onSaved();
    onClose();
  });

  return (
    <Modal title={`Editar a ${user.fullName}`} onClose={onClose} wide>
      <form className="form" onSubmit={submit}>
        <p className="muted">{user.email}</p>
        <Field label="Nombre completo"><input value={values.fullName} onChange={(e) => setValues({ ...values, fullName: e.target.value })} required maxLength={150} /></Field>
        <Field label="Rol">
          <select value={values.roleId} onChange={(e) => setValues({ ...values, roleId: e.target.value })}>
            {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
          </select>
        </Field>
        {isAdminRole ? (
          <p className="notice-inline" role="note">Los administradores ven y pueden trabajar en <strong>todos</strong> los proyectos: no necesitan asignación.</p>
        ) : (
          <ProjectAccess userId={user.id} onChange={setRows} />
        )}
        <label className="check-row">
          <input type="checkbox" checked={values.isActive} disabled={isSelf} onChange={(e) => setValues({ ...values, isActive: e.target.checked })} />
          <span>Cuenta activa {isSelf && <small className="muted">(no puede desactivar la suya)</small>}</span>
        </label>
        <FormError message={error} />
        <FormActions busy={busy || (!isAdminRole && !rows)} submitLabel="Guardar cambios" onCancel={onClose} />
      </form>
    </Modal>
  );
}

function PasswordForm({ user, onClose }) {
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const { busy, error, submit } = useSubmit(async () => {
    await api.post(`/users/${user.id}/password`, { password });
    setDone(true);
  });

  return (
    <Modal title={`Nueva contraseña para ${user.fullName}`} onClose={onClose}>
      {done ? (
        <div className="form">
          <p role="status">La contraseña se actualizó. Entréguesela a {user.fullName} por un medio seguro.</p>
          <div className="form-actions"><button type="button" className="button" onClick={onClose}>Listo</button></div>
        </div>
      ) : (
        <form className="form" onSubmit={submit}>
          <Field label="Nueva contraseña" hint={`Mínimo ${MIN_PASSWORD} caracteres. La anterior dejará de servir.`}>
            <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={MIN_PASSWORD} maxLength={72} autoComplete="off" />
          </Field>
          <FormError message={error} />
          <FormActions busy={busy} submitLabel="Cambiar contraseña" onCancel={onClose} />
        </form>
      )}
    </Modal>
  );
}

const fetchUsers = () => Promise.all([api.get('/users'), api.get('/roles')]).then(([users, roles]) => ({ users, roles }));

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const data = useResource(fetchUsers, 'users');
  const [modal, setModal] = useState(null);
  const close = () => setModal(null);

  if (data.status === 'loading') return <main className="container main"><LoadingState>Cargando usuarios…</LoadingState></main>;
  if (data.status === 'error' && !data.data) return <main className="container main"><ErrorState message={data.error} onRetry={data.reload} /></main>;
  const { users, roles } = data.data;

  return (
    <main className="container main">
      <div className="section-head">
        <div>
          <h2>Usuarios</h2>
          <p>Solo los administradores crean usuarios y manejan contraseñas. No hay registro ni recuperación automática.</p>
        </div>
        <button type="button" className="button" onClick={() => setModal({ type: 'create' })}><Icon name="plus" />Nuevo usuario</button>
      </div>

      <div className="card">
        <div className="table-scroll">
          <table className="table">
            <caption className="sr-only">Usuarios del sistema</caption>
            <thead><tr><th scope="col">Nombre</th><th scope="col">Correo</th><th scope="col">Rol</th><th scope="col">Estado</th><th scope="col">Último ingreso</th><th scope="col"><span className="sr-only">Acciones</span></th></tr></thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td data-label="Nombre" className="cell-name"><strong>{user.fullName}</strong></td>
                  <td data-label="Correo">{user.email}</td>
                  <td data-label="Rol">{user.role.name}</td>
                  <td data-label="Estado"><span className={`badge badge--${user.isActive ? 'done' : 'muted'}`}>{user.isActive ? 'Activo' : 'Inactivo'}</span></td>
                  <td data-label="Último ingreso" className="cell-date">{formatDateTime(user.lastLoginAt)}</td>
                  <td data-label="Acciones" className="cell-action">
                    <button type="button" className="button button--small button--ghost" onClick={() => setModal({ type: 'edit', user })} aria-label={`Editar a ${user.fullName}`}><Icon name="edit" />Editar</button>
                    <button type="button" className="button button--small button--ghost" onClick={() => setModal({ type: 'password', user })} aria-label={`Cambiar la contraseña de ${user.fullName}`}>Contraseña</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && <EmptyState>No hay usuarios.</EmptyState>}
      </div>

      {modal?.type === 'create' && <CreateUserForm roles={roles} onSaved={data.refresh} onClose={close} />}
      {modal?.type === 'edit' && <EditUserForm user={modal.user} roles={roles} isSelf={modal.user.id === me.id} onSaved={data.refresh} onClose={close} />}
      {modal?.type === 'password' && <PasswordForm user={modal.user} onClose={close} />}
    </main>
  );
}
