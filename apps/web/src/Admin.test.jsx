import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';
import { describeIssue } from './api/importIssues.js';
import { ADMIN, dashboard, EDITOR, mockApi, signedInAs } from './test/mockApi.js';

const ROLES = [
  { id: 'r1', name: 'Administrator', description: 'Acceso total', isProtected: true, permissions: ['read', 'create', 'update', 'delete'], userCount: 1 },
  { id: 'r2', name: 'Editor', description: null, isProtected: false, permissions: ['read', 'create', 'update'], userCount: 2 },
  { id: 'r3', name: 'Reviewer', description: null, isProtected: false, permissions: ['read'], userCount: 0 },
];
const USERS = [
  { id: 'u-admin', email: 'admin@example.com', fullName: 'Ana Admin', isActive: true, role: { id: 'r1', name: 'Administrator' }, lastLoginAt: '2026-10-19T15:00:00Z', createdAt: '2026-10-01T00:00:00Z' },
  { id: 'u-ed', email: 'ed@example.com', fullName: 'Eva Editora', isActive: true, role: { id: 'r2', name: 'Editor' }, lastLoginAt: null, createdAt: '2026-10-02T00:00:00Z' },
];
const PROJECTS = [
  { id: 'p1', name: 'CC-001 Rev. 3', description: 'Cambios', isArchived: false, createdAt: '2026-10-01T10:00:00Z' },
  { id: 'p2', name: 'Proyecto viejo', description: null, isArchived: true, createdAt: '2026-09-01T10:00:00Z' },
];

beforeEach(() => { localStorage.clear(); });
afterEach(() => vi.unstubAllGlobals());

const admin = (hash, extra = {}) => {
  window.location.hash = hash;
  return mockApi({ ...signedInAs(ADMIN), 'GET /projects': PROJECTS.slice(0, 1), 'GET /projects/p1/dashboard': dashboard(), 'GET /users': USERS, 'GET /roles': ROLES, 'GET /projects?includeArchived=true': PROJECTS, ...extra });
};

describe('acceso a la administración', () => {
  it('un usuario que no es administrador vuelve al tablero', async () => {
    window.location.hash = '#/admin/users';
    mockApi({ ...signedInAs(EDITOR), 'GET /projects': PROJECTS.slice(0, 1), 'GET /projects/p1/dashboard': dashboard() });
    render(<App />);
    expect(await screen.findByText('Stock por bodega')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Usuarios' })).not.toBeInTheDocument();
  });
});

describe('usuarios', () => {
  it('lista los usuarios con su rol y estado', async () => {
    admin('#/admin/users');
    render(<App />);
    const row = (await screen.findByText('Eva Editora')).closest('tr');
    expect(within(row).getByText('ed@example.com')).toBeInTheDocument();
    expect(within(row).getByText('Editor')).toBeInTheDocument();
    expect(within(row).getByText('Activo')).toBeInTheDocument();
  });

  it('crea un usuario y muestra en español que el correo ya existe', async () => {
    const user = userEvent.setup();
    const api = admin('#/admin/users', { 'POST /users': { status: 409, data: { message: 'A user with this email already exists.' } } });
    render(<App />);
    await screen.findByText('Eva Editora');
    await user.click(screen.getByRole('button', { name: /Nuevo usuario/ }));
    const dialog = screen.getByRole('dialog', { name: 'Nuevo usuario' });
    await user.type(within(dialog).getByLabelText('Nombre completo'), 'Nuevo Usuario');
    await user.type(within(dialog).getByLabelText('Correo'), 'ed@example.com');
    await user.type(within(dialog).getByLabelText(/Contraseña inicial/), 'secreta-123');
    await user.selectOptions(within(dialog).getByLabelText('Rol'), 'r3');
    await user.click(within(dialog).getByRole('button', { name: 'Crear usuario' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Ya existe un usuario con ese correo.');
    expect(api.called('POST /users')[0].body).toEqual({ email: 'ed@example.com', fullName: 'Nuevo Usuario', password: 'secreta-123', roleId: 'r3' });

    api.set('POST /users', { id: 'nuevo' });
    await user.click(within(dialog).getByRole('button', { name: 'Crear usuario' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('edita rol y estado; no permite desactivar la cuenta propia', async () => {
    const user = userEvent.setup();
    const api = admin('#/admin/users', { 'PATCH /users/u-ed': USERS[1] });
    render(<App />);
    await screen.findByText('Eva Editora');

    await user.click(screen.getByRole('button', { name: 'Editar a Ana Admin' }));
    expect(within(screen.getByRole('dialog')).getByRole('checkbox', { name: /Cuenta activa/ })).toBeDisabled();
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));

    await user.click(screen.getByRole('button', { name: 'Editar a Eva Editora' }));
    const dialog = screen.getByRole('dialog');
    await user.selectOptions(within(dialog).getByLabelText('Rol'), 'r3');
    await user.click(within(dialog).getByRole('checkbox', { name: /Cuenta activa/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(api.called('PATCH /users/u-ed')).toHaveLength(1));
    expect(api.called('PATCH /users/u-ed')[0].body).toEqual({ fullName: 'Eva Editora', roleId: 'r3', isActive: false });
  });

  it('restablece la contraseña y recuerda entregarla por un medio seguro', async () => {
    const user = userEvent.setup();
    const api = admin('#/admin/users', { 'POST /users/u-ed/password': null });
    render(<App />);
    await screen.findByText('Eva Editora');
    await user.click(screen.getByRole('button', { name: 'Cambiar la contraseña de Eva Editora' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText(/Nueva contraseña/), 'otra-clave-1');
    await user.click(within(dialog).getByRole('button', { name: 'Cambiar contraseña' }));

    expect(await within(dialog).findByRole('status')).toHaveTextContent('La contraseña se actualizó');
    expect(api.called('POST /users/u-ed/password')[0].body).toEqual({ password: 'otra-clave-1' });
  });
});

describe('roles', () => {
  it('el rol protegido no se puede editar ni eliminar', async () => {
    admin('#/admin/roles');
    render(<App />);
    await screen.findByText('Reviewer');
    const row = within(screen.getByRole('table')).getByText('Administrator').closest('tr');
    expect(within(row).getByText('Protegido')).toBeInTheDocument();
    expect(within(row).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar el rol Editor' })).toBeInTheDocument();
  });

  it('crea un rol con las acciones elegidas', async () => {
    const user = userEvent.setup();
    const api = admin('#/admin/roles', { 'POST /roles': { id: 'nuevo' } });
    render(<App />);
    await screen.findByText('Editor');
    await user.click(screen.getByRole('button', { name: /Nuevo rol/ }));
    const dialog = screen.getByRole('dialog', { name: 'Nuevo rol' });
    await user.type(within(dialog).getByLabelText('Nombre del rol'), 'Analista');
    await user.click(within(dialog).getByRole('checkbox', { name: /Modificar/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Guardar rol' }));
    await waitFor(() => expect(api.called('POST /roles')).toHaveLength(1));
    expect(api.called('POST /roles')[0].body).toEqual({ name: 'Analista', description: '', permissions: ['read', 'update'] });
  });

  it('explica en español por qué no se puede eliminar un rol con usuarios', async () => {
    const user = userEvent.setup();
    admin('#/admin/roles', { 'DELETE /roles/r2': { status: 409, data: { message: 'This role still has users. Reassign them before deleting it.' } } });
    render(<App />);
    await screen.findByText('Reviewer');
    await user.click(screen.getByRole('button', { name: 'Eliminar el rol Editor' }));
    const dialog = screen.getByRole('dialog', { name: 'Eliminar rol' });
    expect(dialog).toHaveTextContent('Todavía tiene 2 usuarios');
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar rol' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Este rol todavía tiene usuarios');
  });
});

describe('proyectos', () => {
  it('muestra también los archivados, que solo el administrador ve', async () => {
    const api = admin('#/admin/projects');
    render(<App />);
    const archived = (await screen.findByText('Proyecto viejo')).closest('tr');
    expect(within(archived).getByText('Archivado')).toBeInTheDocument();
    expect(within(archived).getByRole('button', { name: 'Reactivar Proyecto viejo' })).toBeInTheDocument();
    expect(within(archived).queryByRole('button', { name: /Importar/ })).not.toBeInTheDocument();
    expect(api.called('GET /projects?includeArchived=true')).toHaveLength(1);
  });

  it('crea un proyecto', async () => {
    const user = userEvent.setup();
    const api = admin('#/admin/projects', { 'POST /projects': { id: 'nuevo' } });
    render(<App />);
    await screen.findByText('Proyecto viejo');
    await user.click(screen.getByRole('button', { name: /Nuevo proyecto/ }));
    const dialog = screen.getByRole('dialog', { name: 'Nuevo proyecto' });
    await user.type(within(dialog).getByLabelText('Nombre', { exact: false }), 'CC-002');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar proyecto' }));
    await waitFor(() => expect(api.called('POST /projects')[0].body).toEqual({ name: 'CC-002', description: '' }));
  });

  it('archiva tras confirmar, explicando que no se borra nada', async () => {
    const user = userEvent.setup();
    const api = admin('#/admin/projects', { 'POST /projects/p1/archive': { id: 'p1' } });
    render(<App />);
    await screen.findByText('Proyecto viejo');
    await user.click(screen.getByRole('button', { name: 'Archivar CC-001 Rev. 3' }));
    const dialog = screen.getByRole('dialog', { name: 'Archivar proyecto' });
    expect(dialog).toHaveTextContent('No se borra nada');
    expect(api.called('POST /projects/p1/archive')).toHaveLength(0);
    await user.click(within(dialog).getByRole('button', { name: 'Archivar' }));
    await waitFor(() => expect(api.called('POST /projects/p1/archive')).toHaveLength(1));
  });

  describe('importación', () => {
    const xlsx = () => new File([new Uint8Array([0x50, 0x4b, 3, 4])], 'plantilla.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const open = async (user) => {
      await screen.findByText('Proyecto viejo');
      await user.click(screen.getByRole('button', { name: 'Importar un Excel a CC-001 Rev. 3' }));
      return screen.getByRole('dialog');
    };

    it('no deja importar hasta validar el archivo, y entonces importa solo si salió limpio', async () => {
      const user = userEvent.setup();
      const ok = { valid: true, dryRun: true, summary: { milestones: 11, tasks: 28 }, issues: [], totalIssues: 0, truncated: false };
      const api = admin('#/admin/projects', {
        'POST /projects/p1/import?dryRun=true': ok,
        'POST /projects/p1/import': { ...ok, dryRun: false },
      });
      render(<App />);
      const dialog = await open(user);
      expect(within(dialog).getByRole('button', { name: 'Importar' })).toBeDisabled();
      expect(within(dialog).getByRole('button', { name: 'Validar archivo' })).toBeDisabled();

      await user.upload(within(dialog).getByLabelText('Archivo de Excel (.xlsx)'), xlsx());
      await user.click(within(dialog).getByRole('button', { name: 'Validar archivo' }));
      expect(await within(dialog).findByText(/se crearán/)).toHaveTextContent('11 hitos y 28 tareas');
      expect(api.called('POST /projects/p1/import')).toHaveLength(0);

      await user.click(within(dialog).getByRole('button', { name: 'Importar' }));
      expect(await within(dialog).findByText(/Se importaron/)).toHaveTextContent('11 hitos');
      expect(api.called('POST /projects/p1/import')).toHaveLength(1);
    });

    it('muestra todos los problemas con fila y columna en español, e impide importar', async () => {
      const user = userEvent.setup();
      admin('#/admin/projects', {
        'POST /projects/p1/import?dryRun=true': {
          valid: false, dryRun: true, summary: { milestones: 1, tasks: 2 }, totalIssues: 3, truncated: false,
          issues: [
            { row: 3, column: 'CodigoHito', code: 'required', message: 'CodigoHito is required.' },
            { row: 4, column: 'FechaEstimada', code: 'date_order', message: 'x' },
            { row: 5, column: 'CodigoHito', code: 'code_exists', message: 'x' },
          ],
        },
      });
      render(<App />);
      const dialog = await open(user);
      await user.upload(within(dialog).getByLabelText('Archivo de Excel (.xlsx)'), xlsx());
      await user.click(within(dialog).getByRole('button', { name: 'Validar archivo' }));

      const issues = await within(dialog).findByRole('region', { name: 'Problemas del archivo' });
      expect(issues).toHaveTextContent('3 problemas');
      expect(issues).toHaveTextContent('CodigoHito es obligatorio.');
      expect(issues).toHaveTextContent('La fecha estimada es anterior a la fecha de inicio.');
      expect(issues).toHaveTextContent('Ya existe un hito con ese código en el proyecto.');
      expect(within(dialog).getByRole('button', { name: 'Importar' })).toBeDisabled();
    });

    it('al elegir otro archivo se descarta la validación anterior', async () => {
      const user = userEvent.setup();
      admin('#/admin/projects', { 'POST /projects/p1/import?dryRun=true': { valid: true, dryRun: true, summary: { milestones: 1, tasks: 1 }, issues: [], totalIssues: 0, truncated: false } });
      render(<App />);
      const dialog = await open(user);
      const input = within(dialog).getByLabelText('Archivo de Excel (.xlsx)');
      await user.upload(input, xlsx());
      await user.click(within(dialog).getByRole('button', { name: 'Validar archivo' }));
      await within(dialog).findByText(/se crearán/);
      await user.upload(input, new File([new Uint8Array([0x50, 0x4b, 3, 4])], 'otro.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      expect(within(dialog).queryByText(/se crearán/)).not.toBeInTheDocument();
      expect(within(dialog).getByRole('button', { name: 'Importar' })).toBeDisabled();
    });
  });
});

describe('describeIssue', () => {
  it('redacta cada código en español y usa el mensaje original si no lo conoce', () => {
    expect(describeIssue({ code: 'missing_column', column: 'FechaInicio' })).toBe('Falta la columna FechaInicio en la fila de encabezados.');
    expect(describeIssue({ code: 'duplicate_task', column: 'Tarea' })).toMatch(/repetida/);
    expect(describeIssue({ code: 'unreadable_file' })).toMatch(/libro de Excel/);
    expect(describeIssue({ code: 'algo_nuevo', message: 'Mensaje original' })).toBe('Mensaje original');
  });
});
