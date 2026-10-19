import { describe, expect, it } from 'vitest';
import { buildDashboard, filterMilestones } from './dashboard.js';
import { CONFIG, hito, tarea } from '../test/helpers.js';

const TODAY = { year: 2026, month: 10, day: 18 };
const build = (milestones, tasks) => buildDashboard({ config: CONFIG, milestones, tasks }, TODAY);
const find = (dashboard, id) => dashboard.milestones.find((row) => row.id === id);

describe('buildDashboard — cálculos', () => {
  it('calcula avance por hito, global y retrasos', () => {
    const dashboard = build(
      [
        hito({ HitoID: 'H001', Estado: 'En curso', FechaEstimada: '2026-10-08', Orden: 1 }),
        hito({ HitoID: 'H002', Estado: 'Finalizado', FechaEstimada: '2026-09-01', FechaFinalizacion: '2026-08-30', Orden: 2 }),
        hito({ HitoID: 'H003', Estado: 'Pendiente', FechaEstimada: '2026-12-01', Orden: 3 }),
      ],
      [
        tarea({ TareaID: 'T1', HitoID: 'H001', Completada: 'Sí' }),
        tarea({ TareaID: 'T2', HitoID: 'H001', Completada: 'No' }),
        tarea({ TareaID: 'T3', HitoID: 'H002', Completada: 'Sí' }),
        tarea({ TareaID: 'T4', HitoID: 'H003', Completada: 'No' }),
      ],
    );

    expect(find(dashboard, 'H001').progress).toBe(50);
    expect(find(dashboard, 'H001').delay).toBe(10);
    expect(find(dashboard, 'H002').delay).toBe(0);
    expect(dashboard.summary).toMatchObject({ overall: 50, included: 3, total: 3, finished: 1, late: 1, tasks: 4, tasksDone: 2 });
  });

  it('un hito sin tareas no cuenta como 0 % ni como completado: avisa y no participa', () => {
    const dashboard = build(
      [hito({ HitoID: 'H001', Orden: 1 }), hito({ HitoID: 'H002', Orden: 2 })],
      [tarea({ HitoID: 'H001', Completada: 'Sí' })],
    );
    expect(find(dashboard, 'H002').progress).toBeNull();
    expect(find(dashboard, 'H002').warnings.join(' ')).toMatch(/no tiene tareas/);
    expect(dashboard.summary).toMatchObject({ overall: 100, included: 1, total: 2 });
  });

  it('sin ningún hito válido el avance global no está disponible', () => {
    const dashboard = build([hito()], []);
    expect(dashboard.summary.overall).toBeNull();
    expect(dashboard.summary.included).toBe(0);
  });

  it('respeta el orden indicado en la columna Orden', () => {
    const dashboard = build([hito({ HitoID: 'B', Orden: 2 }), hito({ HitoID: 'A', Orden: 1 })], []);
    expect(dashboard.milestones.map((row) => row.id)).toEqual(['A', 'B']);
  });
});

describe('buildDashboard — coherencia', () => {
  const warningsOf = (dashboard, id) => find(dashboard, id).warnings.join(' | ');

  it('Finalizado con tareas incompletas: avisa y no cambia el estado', () => {
    const dashboard = build(
      [hito({ Estado: 'Finalizado', FechaEstimada: '2026-09-01', FechaFinalizacion: '2026-09-01' })],
      [tarea({ Completada: 'No' })],
    );
    expect(warningsOf(dashboard, 'H001')).toMatch(/Finalizado pero tiene tareas incompletas/);
    expect(find(dashboard, 'H001').status).toBe('Finalizado');
  });

  it('no finalizado con fecha real: avisa', () => {
    const dashboard = build([hito({ Estado: 'En curso', FechaFinalizacion: '2026-10-01' })], [tarea()]);
    expect(warningsOf(dashboard, 'H001')).toMatch(/fecha real de finalización aunque no está Finalizado/);
  });

  it('finalizado sin fecha real: avisa y el retraso queda sin calcular', () => {
    const dashboard = build([hito({ Estado: 'Finalizado', FechaEstimada: '2026-09-01' })], [tarea({ Completada: 'Sí' })]);
    expect(warningsOf(dashboard, 'H001')).toMatch(/Finalizado sin fecha real/);
    expect(find(dashboard, 'H001').delayStatus).toBe('unknown');
    expect(dashboard.summary.late).toBe(0);
    expect(dashboard.summary.unknownDelay).toBe(1);
  });

  it('identificadores duplicados: usa la primera fila y avisa', () => {
    const dashboard = build(
      [hito({ HitoID: 'H001', NombreHito: 'Original' }), hito({ HitoID: 'H001', NombreHito: 'Copia' })],
      [tarea({ TareaID: 'T1', Completada: 'Sí' }), tarea({ TareaID: 'T1', Completada: 'No' })],
    );
    expect(dashboard.milestones).toHaveLength(1);
    expect(dashboard.milestones[0].name).toBe('Original');
    expect(dashboard.milestones[0].tasks).toHaveLength(1);
    expect(dashboard.alerts.map((alert) => alert.message).join(' ')).toMatch(/duplicado en Hitos/);
    expect(dashboard.alerts.map((alert) => alert.message).join(' ')).toMatch(/duplicado en Tareas/);
  });

  it('tarea con HitoID inexistente: avisa y no se cuenta', () => {
    const dashboard = build([hito()], [tarea({ TareaID: 'T9', HitoID: 'H999' })]);
    expect(dashboard.alerts.some((alert) => alert.scope === 'T9' && /no existe/.test(alert.message))).toBe(true);
    expect(dashboard.summary.tasks).toBe(0);
  });

  it('valores inválidos: estado, Completada y fechas', () => {
    const dashboard = build(
      [hito({ Estado: 'Casi listo', FechaEstimada: 'pronto' })],
      [tarea({ Completada: 'tal vez' })],
    );
    const messages = dashboard.alerts.map((alert) => alert.message).join(' | ');
    expect(messages).toMatch(/Estado "Casi listo" no es válido/);
    expect(messages).toMatch(/FechaEstimada no es una fecha válida/);
    expect(messages).toMatch(/Completada debe ser Sí o No/);
    expect(find(dashboard, 'H001').progress).toBeNull();
  });

  it('separa varias referencias de control de cambio', () => {
    const dashboard = build([hito()], [tarea({ ControlCambioOrigen: 'CC-C03, CC-C13; CC-M01' })]);
    expect(find(dashboard, 'H001').tasks[0].changeControls).toEqual(['CC-C03', 'CC-C13', 'CC-M01']);
  });
});

describe('filterMilestones', () => {
  const dashboard = build(
    [
      hito({ HitoID: 'H001', Estado: 'En curso', FechaEstimada: '2026-10-01', Orden: 1 }),
      hito({ HitoID: 'H002', Estado: 'Pendiente', FechaEstimada: '2026-12-01', Orden: 2 }),
      hito({ HitoID: 'H003', Estado: 'Pendiente', Orden: 3 }),
    ],
    [tarea({ HitoID: 'H001' }), tarea({ TareaID: 'T2', HitoID: 'H002' })],
  );
  const ids = (filters) => filterMilestones(dashboard.milestones, filters).map((row) => row.id);

  it('filtra por estado y por situación de retraso', () => {
    expect(ids({})).toEqual(['H001', 'H002', 'H003']);
    expect(ids({ status: 'Pendiente' })).toEqual(['H002', 'H003']);
    expect(ids({ delay: 'late' })).toEqual(['H001']);
    expect(ids({ delay: 'onTime' })).toEqual(['H002']);
    expect(ids({ delay: 'unknown' })).toEqual(['H003']);
    expect(ids({ status: 'Pendiente', delay: 'late' })).toEqual([]);
  });

  it('no altera los datos ni los indicadores', () => {
    const before = JSON.stringify(dashboard.summary);
    ids({ status: 'Finalizado' });
    expect(JSON.stringify(dashboard.summary)).toBe(before);
    expect(dashboard.milestones).toHaveLength(3);
  });
});
