import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';
import { CONFIG, hito, makeWorkbook, tarea } from './test/helpers.js';

const today = new Date();
const iso = (offsetDays) => {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const workbook = () => makeWorkbook({
  config: [{ ...CONFIG, VersionDatos: 'BORRADOR 0.1' }],
  milestones: [
    hito({ HitoID: 'H001', NombreHito: 'Hito vencido', Estado: 'En curso', FechaEstimada: iso(-5), Orden: 1 }),
    hito({ HitoID: 'H002', NombreHito: 'Hito a tiempo', Estado: 'Pendiente', FechaEstimada: iso(30), Orden: 2 }),
    hito({ HitoID: 'H003', NombreHito: 'Hito finalizado', Estado: 'Finalizado', FechaEstimada: iso(-20), FechaFinalizacion: iso(-20), Orden: 3 }),
    hito({ HitoID: 'H004', NombreHito: 'Hito sin tareas', Orden: 4 }),
  ],
  tasks: [
    tarea({ TareaID: 'T1', HitoID: 'H001', NombreTarea: 'Primera tarea', Completada: 'Sí', Observaciones: 'Nota visible', ControlCambioOrigen: 'CC-C01, CC-C02', Orden: 1 }),
    tarea({ TareaID: 'T2', HitoID: 'H001', NombreTarea: 'Segunda tarea', Completada: 'No', Orden: 2 }),
    tarea({ TareaID: 'T3', HitoID: 'H002', NombreTarea: 'Tarea futura', Completada: 'No', Orden: 3 }),
    tarea({ TareaID: 'T4', HitoID: 'H003', NombreTarea: 'Tarea cerrada', Completada: 'Sí', Orden: 4 }),
  ],
});

function mockFetch(impl) {
  vi.stubGlobal('fetch', vi.fn(impl));
}

beforeEach(() => mockFetch(async () => ({ ok: true, status: 200, arrayBuffer: async () => workbook() })));
afterEach(() => vi.unstubAllGlobals());

const rowOf = (name) => screen.getByText(name).closest('tr');

describe('App', () => {
  it('muestra la fecha de corte, el aviso de borrador y los indicadores del proyecto completo', async () => {
    render(<App />);
    expect(screen.getByRole('status')).toHaveTextContent(/Leyendo/);
    expect(await screen.findByText('Hito vencido')).toBeInTheDocument();

    expect(screen.getAllByText(/18 oct 2026/).length).toBeGreaterThan(0);
    expect(screen.getByText(/BORRADOR 0.1\. Las fechas/)).toBeInTheDocument();

    const kpis = screen.getByRole('region', { name: /Indicadores del proyecto completo/ });
    // Hitos: H001 50 %, H002 0 %, H003 100 %; H004 sin tareas no participa → 50 %.
    expect(within(kpis).getByText('50 %')).toBeInTheDocument();
    expect(within(kpis).getByText(/Calculado con 3 de 4 hitos/)).toBeInTheDocument();
    expect(within(kpis).getByText('Hitos finalizados').closest('article')).toHaveTextContent(/^Hitos finalizados1 de 4/);
    expect(within(kpis).getByText('Hitos retrasados').closest('article')).toHaveTextContent(/^Hitos retrasados1/);
  });

  it('expande y contrae las tareas de un hito con su control de cambio', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Hito vencido');
    expect(screen.queryByText('Primera tarea')).not.toBeInTheDocument();

    const toggle = within(rowOf('Hito vencido')).getByRole('button', { name: /Ver tareas \(1\/2\)/ });
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Primera tarea')).toBeInTheDocument();
    expect(screen.getByText('Nota visible')).toBeInTheDocument();
    expect(screen.getByText('CC-C01')).toBeInTheDocument();
    expect(screen.getByText('CC-C02')).toBeInTheDocument();

    await user.click(toggle);
    expect(screen.queryByText('Primera tarea')).not.toBeInTheDocument();
  });

  it('los filtros acotan la tabla sin cambiar los indicadores', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Hito vencido');
    const kpis = screen.getByRole('region', { name: /Indicadores del proyecto completo/ });
    const before = kpis.textContent;

    await user.click(screen.getByRole('button', { name: 'Retrasados' }));
    expect(screen.getByText('Hito vencido')).toBeInTheDocument();
    expect(screen.queryByText('Hito a tiempo')).not.toBeInTheDocument();
    expect(screen.getByText(/Mostrando 1 de 4 hitos/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Dentro del plazo' }));
    expect(screen.getByText('Hito a tiempo')).toBeInTheDocument();
    expect(screen.getByText('Hito finalizado')).toBeInTheDocument();
    expect(screen.queryByText('Hito vencido')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Estado del hito'), 'Finalizado');
    expect(screen.getByText(/Mostrando 1 de 4 hitos/)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Estado del hito'), 'En curso');
    expect(await screen.findByText(/Ningún hito coincide/)).toBeInTheDocument();
    expect(kpis.textContent).toBe(before);
  });

  it('avisa del hito sin tareas en lugar de darlo por completado', async () => {
    render(<App />);
    await screen.findByText('Hito sin tareas');
    expect(within(rowOf('Hito sin tareas')).getByText('N/D')).toBeInTheDocument();
    expect(screen.getByText(/avisos? de coherencia/)).toBeInTheDocument();
  });

  it('es de solo lectura: no ofrece campos editables ni casillas', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Hito vencido');
    await user.click(within(rowOf('Hito vencido')).getByRole('button', { name: /Ver tareas/ }));

    expect(screen.queryAllByRole('textbox')).toHaveLength(0);
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(screen.queryAllByRole('spinbutton')).toHaveLength(0);
    // Los únicos desplegables son los filtros.
    expect(screen.getAllByRole('combobox')).toHaveLength(1);
  });

  it('muestra un error comprensible cuando el Excel no existe y permite reintentar', async () => {
    const user = userEvent.setup();
    mockFetch(async () => ({ ok: false, status: 404 }));
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/No se encontró el archivo de datos/);

    mockFetch(async () => ({ ok: true, status: 200, arrayBuffer: async () => workbook() }));
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Hito vencido')).toBeInTheDocument();
  });

  it('muestra un error cuando el libro tiene una estructura incorrecta', async () => {
    mockFetch(async () => ({ ok: true, status: 200, arrayBuffer: async () => makeWorkbook({ omit: ['Hitos'] }) }));
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/Faltan hojas requeridas: Hitos/);
  });

  it('«Actualizar datos» vuelve a leer el archivo', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Hito vencido');
    const calls = fetch.mock.calls.length;
    await user.click(screen.getByRole('button', { name: /Actualizar datos/ }));
    await screen.findByText('Hito vencido');
    expect(fetch.mock.calls.length).toBe(calls + 1);
  });
});
