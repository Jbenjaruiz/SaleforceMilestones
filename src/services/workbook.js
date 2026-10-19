import * as XLSX from 'xlsx';

export const DATA_PATH = 'data/seguimiento_salesforce.xlsx';

export const SCHEMA = {
  Configuracion: ['NombreProyecto', 'FechaCorte', 'VersionDatos', 'ResponsableActualizacion'],
  Hitos: ['HitoID', 'NombreHito', 'Descripcion', 'FechaEstimada', 'FechaFinalizacion', 'Estado', 'Responsable', 'Observaciones', 'Orden'],
  Tareas: ['TareaID', 'HitoID', 'NombreTarea', 'Completada', 'Observaciones', 'Orden', 'ControlCambioOrigen'],
};

export class WorkbookError extends Error {}

function readSheet(workbook, name) {
  const sheet = workbook.Sheets[name];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });
  const headers = (XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })[0] ?? []).map((header) => String(header).trim());
  const missing = SCHEMA[name].filter((column) => !headers.includes(column));
  if (missing.length) throw new WorkbookError(`La hoja "${name}" no tiene las columnas requeridas: ${missing.join(', ')}.`);

  return rows
    .map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key.trim(), value])))
    .filter((row) => Object.values(row).some((value) => String(value).trim() !== ''));
}

/** Convierte el contenido de un .xlsx en las tres tablas del seguimiento. */
export function parseWorkbook(buffer) {
  let workbook;
  try {
    workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
  } catch {
    throw new WorkbookError('El archivo no se pudo leer como un libro de Excel (.xlsx).');
  }

  const missingSheets = Object.keys(SCHEMA).filter((name) => !workbook.SheetNames.includes(name));
  if (missingSheets.length) throw new WorkbookError(`Faltan hojas requeridas: ${missingSheets.join(', ')}.`);

  const [config] = readSheet(workbook, 'Configuracion');
  if (!config) throw new WorkbookError('La hoja "Configuracion" no tiene datos.');
  if (!String(config.FechaCorte).trim()) throw new WorkbookError('La hoja "Configuracion" debe incluir FechaCorte.');

  return { config, milestones: readSheet(workbook, 'Hitos'), tasks: readSheet(workbook, 'Tareas') };
}

/**
 * Descarga el libro sin usar la caché del navegador. La URL parte de la base de
 * Vite y del documento, así funciona también cuando el sitio vive en una subruta.
 */
export async function fetchWorkbook(fetchImpl = fetch) {
  const url = new URL(`${import.meta.env.BASE_URL}${DATA_PATH}`, document.baseURI);
  url.searchParams.set('v', String(Date.now()));

  let response;
  try {
    response = await fetchImpl(url, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
  } catch {
    throw new WorkbookError('No hay conexión con el servidor para descargar el archivo de datos.');
  }
  if (!response.ok) {
    throw new WorkbookError(`No se encontró el archivo de datos (${DATA_PATH}, respuesta ${response.status}).`);
  }
  return parseWorkbook(await response.arrayBuffer());
}
