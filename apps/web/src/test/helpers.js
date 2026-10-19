import * as XLSX from 'xlsx';

export const CONFIG = { NombreProyecto: 'Proyecto de prueba', FechaCorte: '2026-10-18', VersionDatos: '1.0', ResponsableActualizacion: 'QA' };

export const HITO_COLUMNS = ['HitoID', 'NombreHito', 'Descripcion', 'FechaEstimada', 'FechaFinalizacion', 'Estado', 'Responsable', 'Observaciones', 'Orden'];
export const TAREA_COLUMNS = ['TareaID', 'HitoID', 'NombreTarea', 'Completada', 'Observaciones', 'Orden', 'ControlCambioOrigen'];

export const hito = (overrides = {}) => ({
  HitoID: 'H001', NombreHito: 'Hito uno', Descripcion: '', FechaEstimada: '', FechaFinalizacion: '', Estado: 'Pendiente',
  Responsable: '', Observaciones: '', Orden: 1, ...overrides,
});

export const tarea = (overrides = {}) => ({
  TareaID: 'T001', HitoID: 'H001', NombreTarea: 'Tarea uno', Completada: 'No', Observaciones: '', Orden: 1, ControlCambioOrigen: '', ...overrides,
});

/** Libro en memoria con las tres hojas; `sheets` permite omitir o alterar alguna. */
export function makeWorkbook({ config = [CONFIG], milestones = [hito()], tasks = [tarea()], omit = [], milestoneColumns = HITO_COLUMNS } = {}) {
  const wb = XLSX.utils.book_new();
  const add = (name, rows, header) => {
    if (omit.includes(name)) return;
    const kept = rows.map((row) => Object.fromEntries(header.filter((key) => key in row).map((key) => [key, row[key]])));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kept, { header }), name);
  };
  add('Configuracion', config, Object.keys(CONFIG));
  add('Hitos', milestones, milestoneColumns);
  add('Tareas', tasks, TAREA_COLUMNS);
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return out instanceof ArrayBuffer ? out : new Uint8Array(out).buffer;
}
