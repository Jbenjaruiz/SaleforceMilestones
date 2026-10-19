import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';
import { ADMIN, dashboard, EDITOR, mockApi, REVIEWER, signedInAs } from './test/mockApi.js';

const PROJECTS = [{ id: 'p1', name: 'CC-001 Rev. 3', description: null, isArchived: false, createdAt: '2026-10-01T00:00:00Z' }, { id: 'p2', name: 'Otro proyecto', description: null, isArchived: false, createdAt: '2026-10-02T00:00:00Z' }];

beforeEach(() => { window.location.hash = '#/'; localStorage.clear(); });
afterEach(() => vi.unstubAllGlobals());

const board = (user, extra = {}) => mockApi({ ...signedInAs(user), 'GET /projects': PROJECTS, 'GET /projects/p1/dashboard': dashboard(), ...extra });
const inTable = () => within(screen.getByRole('table'));
const rowOf = (code) => inTable().getByText(code).closest('tr');

describe('inicio de sesión', () => {
  it('sin sesión muestra el formulario de ingreso', async () => {
    mockApi({});
    render(<App />);
    expect(await screen.findByRole('button', { name: 'Ingresar' })).toBeInTheDocument();
    expect(screen.queryByText('Hitos', { exact: false })).not.toBeInTheDocument();
  });

  it('muestra en español el error de credenciales y no guarda sesión', async () => {
    const user = userEvent.setup();
    mockApi({ 'POST /auth/login': { status: 401, data: { message: 'Invalid email or password.' } } });
    render(<App />);
    await user.type(await screen.findByLabelText('Correo'), 'admin@example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'incorrecta');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos.');
    expect(localStorage.getItem('seguimiento.token')).toBeNull();
  });

  it('con credenciales correctas guarda el token y abre el tablero', async () => {
    const user = userEvent.setup();
    const api = mockApi({
      'POST /auth/login': { accessToken: 'abc', expiresIn: '8h', user: ADMIN },
      'GET /projects': PROJECTS,
      'GET /projects/p1/dashboard': dashboard(),
    });
    render(<App />);
    await user.type(await screen.findByLabelText('Correo'), ' admin@example.com ');
    await user.type(screen.getByLabelText('Contraseña'), 'secreta-123');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(await screen.findByText('Stock por bodega')).toBeInTheDocument();
    expect(localStorage.getItem('seguimiento.token')).toBe('abc');
    expect(api.called('POST /auth/login')[0].body).toEqual({ email: 'admin@example.com', password: 'secreta-123' });
  });

  it('una sesión guardada se valida con la API y entra directo', async () => {
    board(EDITOR);
    render(<App />);
    expect(await screen.findByText('Stock por bodega')).toBeInTheDocument();
    expect(screen.getByText('Eva Editora')).toBeInTheDocument();
  });

  it('un token vencido se descarta y pide ingresar de nuevo', async () => {
    localStorage.setItem('seguimiento.token', 'vencido');
    mockApi({ 'GET /auth/me': { status: 401, data: { message: 'Invalid or expired access token.' } } });
    render(<App />);
    expect(await screen.findByRole('button', { name: 'Ingresar' })).toBeInTheDocument();
    expect(localStorage.getItem('seguimiento.token')).toBeNull();
  });

  it('si la API responde 401 durante el uso, cierra la sesión', async () => {
    const user = userEvent.setup();
    board(EDITOR, { 'PUT /tasks/t1/completion': { status: 401, data: { message: 'Invalid or expired access token.' } } });
    render(<App />);
    await user.click(within(await screen.findByText('CC-C01').then((el) => el.closest('tr'))).getByRole('button', { name: /Ver tareas/ }));
    await user.click(await screen.findByRole('button', { name: /Marcar «Definir regla de precios» como finalizada/ }));
    expect(await screen.findByRole('button', { name: 'Ingresar' })).toBeInTheDocument();
  });

  it('«Salir» cierra la sesión', async () => {
    const user = userEvent.setup();
    board(EDITOR);
    render(<App />);
    await screen.findByText('Stock por bodega');
    await user.click(screen.getByRole('button', { name: 'Salir' }));
    expect(await screen.findByRole('button', { name: 'Ingresar' })).toBeInTheDocument();
    expect(localStorage.getItem('seguimiento.token')).toBeNull();
  });
});

describe('tablero', () => {
  it('muestra los indicadores del proyecto completo y los hitos con su estado derivado', async () => {
    board(REVIEWER);
    render(<App />);
    expect(await screen.findByText('Stock por bodega')).toBeInTheDocument();

    const kpis = screen.getByRole('region', { name: /Indicadores del proyecto completo/ });
    expect(within(kpis).getByText('75 %')).toBeInTheDocument();
    expect(within(kpis).getByText(/Calculado con 2 de 3 hitos/)).toBeInTheDocument();
    expect(within(kpis).getByText('Hitos finalizados').closest('article')).toHaveTextContent(/^Hitos finalizados1 de 3/);
    expect(within(kpis).getByText('Retraso acumulado').closest('article')).toHaveTextContent(/^Retraso acumulado3 días/);
    expect(within(kpis).getByText('Tareas finalizadas').closest('article')).toHaveTextContent(/^Tareas finalizadas2 de 4/);

    expect(within(rowOf('CC-C01')).getByText('En curso')).toBeInTheDocument();
    expect(within(rowOf('CC-C01')).getByText('3 días')).toBeInTheDocument();
    expect(within(rowOf('CC-C02')).getByText('Finalizado')).toBeInTheDocument();
    expect(within(rowOf('CC-M01')).getByText('Sin tareas')).toBeInTheDocument();
    expect(within(rowOf('CC-M01')).getByText('N/D')).toBeInTheDocument();
    expect(screen.getByText(/1 hito sin tareas/)).toBeInTheDocument();
  });

  it('expande las tareas con sus fechas, responsable y estado', async () => {
    const user = userEvent.setup();
    board(REVIEWER);
    render(<App />);
    await screen.findByText('Stock por bodega');
    expect(screen.queryByText('Definir regla de precios')).not.toBeInTheDocument();

    const toggle = within(rowOf('CC-C01')).getByRole('button', { name: /Ver tareas \(1\/2\)/ });
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const first = screen.getByText('Definir regla de precios').closest('li');
    expect(first).toHaveTextContent('Inicio 12 oct 2026');
    expect(first).toHaveTextContent('Estimada 16 oct 2026');
    expect(first).toHaveTextContent('Responsable Inforum');
    expect(screen.getByText('Construir el componente').closest('li')).toHaveTextContent('Entregada 15 oct 2026');

    await user.click(toggle);
    expect(screen.queryByText('Definir regla de precios')).not.toBeInTheDocument();
  });

  it('los filtros acotan la tabla sin cambiar los indicadores', async () => {
    const user = userEvent.setup();
    board(REVIEWER);
    render(<App />);
    await screen.findByText('Stock por bodega');
    const before = screen.getByRole('region', { name: /Indicadores/ }).textContent;

    await user.click(screen.getByRole('button', { name: 'Retrasados' }));
    expect(inTable().getByText('CC-C01')).toBeInTheDocument();
    expect(inTable().queryByText('CC-C02')).not.toBeInTheDocument();
    expect(screen.getByText(/Mostrando 1 de 3 hitos/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'En plazo' }));
    expect(inTable().getByText('CC-C02')).toBeInTheDocument();
    expect(inTable().queryByText('CC-M01')).not.toBeInTheDocument(); // sin tareas no cuenta como «en plazo»

    await user.selectOptions(screen.getByLabelText('Estado del hito'), 'no_tasks');
    await user.click(screen.getByRole('button', { name: 'Todos' }));
    expect(inTable().getByText('CC-M01')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Indicadores/ }).textContent).toBe(before);
  });

  it('cambiar de proyecto carga su tablero y lo recuerda', async () => {
    const user = userEvent.setup();
    const api = board(REVIEWER, { 'GET /projects/p2/dashboard': dashboard({ project: { ...dashboard().project, id: 'p2', name: 'Otro proyecto' }, milestones: [], alerts: [], summary: { ...dashboard().summary, milestoneCount: 0, taskCount: 0, completedTasks: 0, finishedMilestones: 0, overallProgress: null, milestonesWithProgress: 0, delayDays: 0, delayedTaskCount: 0 } }) });
    render(<App />);
    await screen.findByText('Stock por bodega');
    await user.selectOptions(screen.getByLabelText('Proyecto'), 'p2');
    expect(await screen.findByText('Este proyecto todavía no tiene hitos.')).toBeInTheDocument();
    expect(api.called('GET /projects/p2/dashboard')).toHaveLength(1);
    expect(localStorage.getItem('seguimiento.project')).toBe('p2');
  });

  it('sin proyectos orienta al administrador a crear el primero', async () => {
    board(ADMIN, { 'GET /projects': [] });
    render(<App />);
    expect(await screen.findByText('Todavía no hay proyectos disponibles.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cree el primer proyecto' })).toBeInTheDocument();
  });

  it('muestra un error comprensible cuando falla la carga y permite reintentar', async () => {
    const user = userEvent.setup();
    const api = board(REVIEWER, { 'GET /projects/p1/dashboard': { status: 500, data: null } });
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Ocurrió un error en el servidor');
    api.set('GET /projects/p1/dashboard', dashboard());
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Stock por bodega')).toBeInTheDocument();
  });
});

describe('permisos en la interfaz', () => {
  it('el revisor (solo lectura) no ve ningún control de edición', async () => {
    const user = userEvent.setup();
    board(REVIEWER);
    render(<App />);
    await screen.findByText('Stock por bodega');
    await user.click(within(rowOf('CC-C01')).getByRole('button', { name: /Ver tareas/ }));

    expect(screen.queryByRole('button', { name: /Nuevo hito/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Agregar tarea/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Editar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Eliminar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Marcar|Reabrir/ })).not.toBeInTheDocument();
  });

  it('el editor puede crear y modificar, pero no eliminar', async () => {
    const user = userEvent.setup();
    board(EDITOR);
    render(<App />);
    await screen.findByText('Stock por bodega');
    await user.click(within(rowOf('CC-C01')).getByRole('button', { name: /Ver tareas/ }));

    expect(screen.getByRole('button', { name: /Nuevo hito/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Agregar tarea/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Editar hito/ })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Editar la tarea/ })).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /Eliminar/ })).not.toBeInTheDocument();
  });

  it('solo el administrador ve los enlaces de administración', async () => {
    board(EDITOR);
    const { unmount } = render(<App />);
    await screen.findByText('Stock por bodega');
    expect(screen.queryByRole('link', { name: 'Usuarios' })).not.toBeInTheDocument();
    unmount();

    board(ADMIN);
    render(<App />);
    await screen.findByText('Stock por bodega');
    expect(screen.getByRole('link', { name: 'Usuarios' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Roles' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Proyectos' })).toBeInTheDocument();
  });
});

describe('edición', () => {
  const openFirstMilestone = async (user) => {
    await screen.findByText('Stock por bodega');
    await user.click(within(rowOf('CC-C01')).getByRole('button', { name: /Ver tareas/ }));
  };

  it('el botón de check finaliza la tarea y recarga el tablero', async () => {
    const user = userEvent.setup();
    const api = board(EDITOR, { 'PUT /tasks/t1/completion': { id: 't1' } });
    render(<App />);
    await openFirstMilestone(user);
    await user.click(screen.getByRole('button', { name: 'Marcar «Definir regla de precios» como finalizada' }));

    await waitFor(() => expect(api.called('PUT /tasks/t1/completion')[0].body).toEqual({ completed: true }));
    await waitFor(() => expect(api.called('GET /projects/p1/dashboard').length).toBeGreaterThan(1));
  });

  it('una tarea finalizada se reabre con el mismo botón', async () => {
    const user = userEvent.setup();
    const api = board(EDITOR, { 'PUT /tasks/t2/completion': { id: 't2' } });
    render(<App />);
    await openFirstMilestone(user);
    const done = screen.getByRole('button', { name: 'Reabrir la tarea «Construir el componente»' });
    expect(done).toHaveAttribute('aria-pressed', 'true');
    await user.click(done);
    await waitFor(() => expect(api.called('PUT /tasks/t2/completion')[0].body).toEqual({ completed: false }));
  });

  it('crea un hito con su formulario', async () => {
    const user = userEvent.setup();
    const api = board(EDITOR, { 'POST /projects/p1/milestones': { id: 'new' } });
    render(<App />);
    await screen.findByText('Stock por bodega');
    await user.click(screen.getByRole('button', { name: /Nuevo hito/ }));
    const dialog = screen.getByRole('dialog', { name: 'Nuevo hito' });
    await user.type(within(dialog).getByLabelText(/Código/), 'CC-C09');
    await user.type(within(dialog).getByLabelText('Nombre'), 'Límite de débito');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar hito' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(api.called('POST /projects/p1/milestones')[0].body).toEqual({ code: 'CC-C09', name: 'Límite de débito', description: '' });
  });

  it('muestra en el formulario el error de la API, en español, sin cerrarlo', async () => {
    const user = userEvent.setup();
    board(EDITOR, { 'POST /projects/p1/milestones': { status: 409, data: { message: 'A milestone with code CC-C01 already exists in this project.' } } });
    render(<App />);
    await screen.findByText('Stock por bodega');
    await user.click(screen.getByRole('button', { name: /Nuevo hito/ }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText(/Código/), 'CC-C01');
    await user.type(within(dialog).getByLabelText('Nombre'), 'Repetido');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar hito' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Ya existe un hito con el código CC-C01 en este proyecto.');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('crea una tarea y valida que la fecha estimada no sea anterior al inicio', async () => {
    const user = userEvent.setup();
    const api = board(EDITOR, { 'POST /milestones/m1/tasks': { id: 'new' } });
    render(<App />);
    await openFirstMilestone(user);
    await user.click(screen.getByRole('button', { name: /Agregar tarea/ }));
    const dialog = screen.getByRole('dialog', { name: 'Nueva tarea en CC-C01' });
    await user.type(within(dialog).getByLabelText('Nombre de la tarea'), 'Probar');
    await user.type(within(dialog).getByLabelText('Fecha de inicio'), '2026-10-20');
    await user.type(within(dialog).getByLabelText('Fecha estimada de entrega'), '2026-10-19');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar tarea' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('La fecha estimada no puede ser anterior a la de inicio.');
    expect(api.called('POST /milestones/m1/tasks')).toHaveLength(0);

    await user.clear(within(dialog).getByLabelText('Fecha estimada de entrega'));
    await user.type(within(dialog).getByLabelText('Fecha estimada de entrega'), '2026-10-23');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar tarea' }));
    await waitFor(() => expect(api.called('POST /milestones/m1/tasks')[0].body).toEqual({ name: 'Probar', responsible: '', startDate: '2026-10-20', estimatedDate: '2026-10-23' }));
  });

  it('pide confirmación antes de eliminar un hito y avisa de lo que se borra', async () => {
    const user = userEvent.setup();
    const api = board(ADMIN, { 'DELETE /milestones/m1': null });
    render(<App />);
    await openFirstMilestone(user);
    await user.click(screen.getByRole('button', { name: /Eliminar hito/ }));

    const dialog = screen.getByRole('dialog', { name: 'Eliminar hito' });
    expect(dialog).toHaveTextContent('CC-C01');
    expect(dialog).toHaveTextContent('2 tareas');
    expect(api.called('DELETE /milestones/m1')).toHaveLength(0);

    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(api.called('DELETE /milestones/m1')).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: /Eliminar hito/ }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar hito' }));
    await waitFor(() => expect(api.called('DELETE /milestones/m1')).toHaveLength(1));
  });

  it('Escape cierra el formulario sin guardar', async () => {
    const user = userEvent.setup();
    const api = board(EDITOR);
    render(<App />);
    await screen.findByText('Stock por bodega');
    await user.click(screen.getByRole('button', { name: /Nuevo hito/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(api.calls.filter((call) => call.key.startsWith('POST'))).toHaveLength(0);
  });
});
