import fs from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { fetchWorkbook, parseWorkbook, WorkbookError } from './workbook.js';
import { buildDashboard } from '../utils/dashboard.js';
import { CONFIG, hito, makeWorkbook, tarea } from '../test/helpers.js';

describe('parseWorkbook', () => {
  it('lee las tres hojas', () => {
    const data = parseWorkbook(makeWorkbook());
    expect(data.config.NombreProyecto).toBe('Proyecto de prueba');
    expect(data.milestones).toHaveLength(1);
    expect(data.tasks).toHaveLength(1);
  });

  it('informa qué hojas faltan', () => {
    expect(() => parseWorkbook(makeWorkbook({ omit: ['Tareas'] }))).toThrow(/Faltan hojas requeridas: Tareas/);
  });

  it('informa qué columnas faltan', () => {
    const columns = ['HitoID', 'NombreHito', 'Estado'];
    expect(() => parseWorkbook(makeWorkbook({ milestoneColumns: columns }))).toThrow(/hoja "Hitos".*FechaEstimada/);
  });

  it('exige FechaCorte', () => {
    expect(() => parseWorkbook(makeWorkbook({ config: [{ ...CONFIG, FechaCorte: '' }] }))).toThrow(/FechaCorte/);
  });

  it('rechaza un archivo que no es Excel con un mensaje comprensible', () => {
    const garbage = new TextEncoder().encode('esto no es un libro').buffer;
    expect(() => parseWorkbook(garbage)).toThrow(WorkbookError);
  });

  it('descarta filas completamente vacías', () => {
    const data = parseWorkbook(makeWorkbook({ tasks: [tarea(), { ...tarea({ TareaID: '', HitoID: '', NombreTarea: '', Completada: '', Orden: '' }) }] }));
    expect(data.tasks).toHaveLength(1);
  });

  it('las fechas de Excel (número de serie) llegan como día calendario correcto', () => {
    const buffer = makeWorkbook({ milestones: [hito({ FechaEstimada: 46313 })] });
    const dashboard = buildDashboard(parseWorkbook(buffer), { year: 2026, month: 10, day: 20 });
    expect(dashboard.milestones[0].estimated).toEqual({ year: 2026, month: 10, day: 18 });
    expect(dashboard.milestones[0].delay).toBe(2);
  });
});

describe('fetchWorkbook', () => {
  const respond = (body, init = {}) => vi.fn().mockResolvedValue({ ok: true, status: 200, arrayBuffer: async () => body, ...init });

  it('descarta la caché del navegador y versiona la URL', async () => {
    const fetchMock = respond(makeWorkbook());
    await fetchWorkbook(fetchMock);
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/data\/seguimiento_salesforce\.xlsx\?v=\d+/);
    expect(options.cache).toBe('no-store');
  });

  it('explica cuando el archivo no existe', async () => {
    await expect(fetchWorkbook(respond(null, { ok: false, status: 404 }))).rejects.toThrow(/No se encontró el archivo de datos/);
  });

  it('explica cuando no hay red', async () => {
    await expect(fetchWorkbook(vi.fn().mockRejectedValue(new TypeError('fail')))).rejects.toThrow(/No hay conexión/);
  });
});

describe('libro publicado (public/data/seguimiento_salesforce.xlsx)', () => {
  const buffer = fs.readFileSync(process.env.WORKBOOK_PATH ?? 'public/data/seguimiento_salesforce.xlsx');
  const data = parseWorkbook(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
  const dashboard = buildDashboard(data, { year: 2026, month: 10, day: 18 });

  it('tiene la estructura esperada y los hitos H001 a H006', () => {
    expect(dashboard.milestones.map((row) => row.id)).toEqual(['H001', 'H002', 'H003', 'H004', 'H005', 'H006']);
    expect(data.config.NombreProyecto).toBe('Seguimiento de Desarrollo Salesforce');
  });

  it('relaciona todas las tareas con un hito existente y no tiene avisos de integridad', () => {
    expect(dashboard.milestones.every((row) => row.tasks.length > 0)).toBe(true);
    expect(dashboard.alerts.filter((alert) => /duplicado|no existe|no es válid|debe ser/.test(alert.message))).toEqual([]);
  });

  it('no declara avances, fechas ni responsables sin respaldo', () => {
    expect(dashboard.milestones.every((row) => row.status === 'Pendiente' && !row.estimated && !row.completed && !row.owner)).toBe(true);
    expect(dashboard.milestones.flatMap((row) => row.tasks).every((task) => task.completed === false)).toBe(true);
  });

  it('conserva los códigos de control de cambio originales', () => {
    const codes = new Set(dashboard.milestones.flatMap((row) => row.tasks).flatMap((task) => task.changeControls));
    for (const code of ['CC-C01', 'CC-C02', 'CC-C03', 'CC-C04', 'CC-C07', 'CC-C08', 'CC-C09', 'CC-C10', 'CC-C11', 'CC-C12', 'CC-C13', 'CC-M01']) {
      expect(codes.has(code), code).toBe(true);
    }
  });
});
