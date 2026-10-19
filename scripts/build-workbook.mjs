// Genera public/data/seguimiento_salesforce.xlsx a partir de scripts/workbook-data.mjs.
// Uso: npm run build:data [ruta de salida]   (cierre el libro en Excel antes: si está abierto, Windows bloquea la escritura).
import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';
import { config, milestones, PROVISIONAL, tasks } from './workbook-data.mjs';

const output = path.resolve(process.argv[2] ?? 'public/data/seguimiento_salesforce.xlsx');

const excelSerial = (date) => (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(1899, 11, 30)) / 86_400_000;
const dateCell = (date) => ({ t: 'n', v: excelSerial(date), z: 'yyyy-mm-dd' });

function sheet(headers, rows, widths) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = widths.map((wch) => ({ wch }));
  return ws;
}

const configHeaders = ['NombreProyecto', 'FechaCorte', 'VersionDatos', 'ResponsableActualizacion'];
const milestoneHeaders = ['HitoID', 'NombreHito', 'Descripcion', 'FechaEstimada', 'FechaFinalizacion', 'Estado', 'Responsable', 'Observaciones', 'Orden'];
const taskHeaders = ['TareaID', 'HitoID', 'NombreTarea', 'Completada', 'Observaciones', 'Orden', 'ControlCambioOrigen', 'TipoTarea', 'FuenteHallazgo'];

const workbook = XLSX.utils.book_new();

XLSX.utils.book_append_sheet(workbook, sheet(
  configHeaders,
  [[config.NombreProyecto, dateCell(new Date()), config.VersionDatos, config.ResponsableActualizacion]],
  [38, 14, 70, 28],
), 'Configuracion');

XLSX.utils.book_append_sheet(workbook, sheet(
  milestoneHeaders,
  milestones.map((m, i) => [m.id, m.name, m.description, '', '', 'Pendiente', '', `${m.notes} ${PROVISIONAL}`, i + 1]),
  [9, 48, 60, 15, 18, 12, 18, 80, 8],
), 'Hitos');

XLSX.utils.book_append_sheet(workbook, sheet(
  taskHeaders,
  tasks.map((t, i) => [
    `T${String(i + 1).padStart(3, '0')}`, t.milestone, t.name, 'No', `${t.notes} ${PROVISIONAL}`, i + 1,
    t.cc.join(', '), t.type, t.source,
  ]),
  [9, 9, 70, 12, 100, 8, 24, 22, 38],
), 'Tareas');

fs.mkdirSync(path.dirname(output), { recursive: true });
XLSX.writeFile(workbook, output);
console.log(`Libro generado: ${output} (${milestones.length} hitos, ${tasks.length} tareas)`);
