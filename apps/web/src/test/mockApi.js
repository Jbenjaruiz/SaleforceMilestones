import { vi } from 'vitest';

export const ADMIN = { id: 'u-admin', email: 'admin@example.com', fullName: 'Ana Admin', roleId: 'r1', roleName: 'Administrator', isAdmin: true, permissions: ['read', 'create', 'update', 'delete'] };
export const EDITOR = { id: 'u-ed', email: 'ed@example.com', fullName: 'Eva Editora', roleId: 'r2', roleName: 'Editor', isAdmin: false, permissions: ['read', 'create', 'update'] };
export const REVIEWER = { id: 'u-rev', email: 'rev@example.com', fullName: 'Rafa Revisor', roleId: 'r3', roleName: 'Reviewer', isAdmin: false, permissions: ['read'] };

export const task = (overrides = {}) => ({
  id: 't1', milestoneId: 'm1', name: 'Definir regla de precios', responsible: 'Inforum', startDate: '2026-10-12', estimatedDate: '2026-10-16',
  actualDate: null, isCompleted: false, status: 'in_progress', delayDays: 3, sortOrder: 1, ...overrides,
});

export const milestone = (overrides = {}) => ({
  id: 'm1', projectId: 'p1', code: 'CC-C01', name: 'Stock por bodega', description: 'Ver stock al cotizar', sortOrder: 1,
  taskCount: 2, completedCount: 1, progress: 50, status: 'in_progress', startDate: '2026-10-12', estimatedDate: '2026-10-30', actualDate: null,
  delayDays: 3, delayedTaskCount: 1,
  tasks: [task(), task({ id: 't2', name: 'Construir el componente', isCompleted: true, actualDate: '2026-10-15', status: 'completed', delayDays: 0, startDate: '2026-10-19', estimatedDate: '2026-10-30' })],
  ...overrides,
});

export const dashboard = (overrides = {}) => ({
  project: { id: 'p1', name: 'CC-001 Rev. 3', description: 'Cambios de la revisión 3', isArchived: false, createdAt: '2026-10-01T00:00:00Z' },
  today: '2026-10-19',
  summary: { milestoneCount: 3, finishedMilestones: 1, taskCount: 4, completedTasks: 2, overallProgress: 75, milestonesWithProgress: 2, delayDays: 3, delayedTaskCount: 1 },
  milestones: [
    milestone(),
    milestone({ id: 'm2', code: 'CC-C02', name: 'Integración de facturación', description: null, taskCount: 1, completedCount: 1, progress: 100, status: 'completed', delayDays: 0, actualDate: '2026-10-15', tasks: [task({ id: 't3', milestoneId: 'm2', name: 'Importar facturas', isCompleted: true, status: 'completed', delayDays: 0 })] }),
    milestone({ id: 'm3', code: 'CC-M01', name: 'Stock en la app offline', description: null, taskCount: 0, completedCount: 0, progress: null, status: 'no_tasks', startDate: null, estimatedDate: null, delayDays: 0, tasks: [] }),
  ],
  alerts: [{ type: 'milestone_without_tasks', milestoneId: 'm3', code: 'CC-M01' }],
  ...overrides,
});

/**
 * Sustituye `fetch` por un enrutador en memoria. Cada manejador recibe `{ body, path }` y devuelve los datos
 * (200), `{ status, data }` o `null` (204). Las llamadas quedan en `api.calls` para comprobarlas.
 */
export function mockApi(handlers) {
  const calls = [];
  const table = { ...handlers };
  const fetchMock = vi.fn(async (url, init = {}) => {
    const path = String(url).replace(/^\/api/, '');
    const key = `${init.method ?? 'GET'} ${path}`;
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
    calls.push({ key, body, headers: init.headers });
    const handler = table[key] ?? Object.entries(table).find(([pattern]) => pattern.endsWith('*') && key.startsWith(pattern.slice(0, -1)))?.[1];
    if (!handler) return reply(404, { message: `sin manejador para ${key}` });
    const result = await (typeof handler === 'function' ? handler({ body, path, key }) : handler);
    if (result === null) return reply(204, null);
    if (result && typeof result === 'object' && 'status' in result && ('data' in result || Object.keys(result).length === 1)) return reply(result.status, result.data ?? null);
    return reply(200, result);
  });
  vi.stubGlobal('fetch', fetchMock);
  return {
    calls,
    set: (key, handler) => { table[key] = handler; },
    called: (key) => calls.filter((call) => call.key === key),
  };
}

const reply = (status, data) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
  blob: async () => new Blob([JSON.stringify(data)]),
});

/** Arranca como si ya hubiera una sesión guardada de ese usuario. */
export function signedInAs(user) {
  localStorage.setItem('seguimiento.token', 'token-de-prueba');
  return { 'GET /auth/me': user };
}
