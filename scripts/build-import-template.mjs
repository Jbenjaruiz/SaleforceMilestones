// Genera la plantilla de importación del proyecto «CC-001 Rev. 3» (F01) a partir de scripts/workbook-data.mjs.
// Uso: node scripts/build-import-template.mjs [ruta de salida]
//
// Reglas de calendario (ver hoja «Supuestos» del libro generado):
// - Solo días hábiles: se excluyen sábados, domingos y feriados (hoja «Feriados»).
// - Las tareas de un mismo hito se encadenan; entre el fin de una y el inicio de la siguiente
//   se dejan 2 días hábiles de pruebas.
// - Los hitos corren en paralelo desde la fecha de inicio del proyecto.
// - Cada tarea que cita varios códigos CC se asigna solo al primero.
import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';
import { tasks as allTasks } from './workbook-data.mjs';

const output = path.resolve(process.argv[2] ?? 'docs/importacion/plantilla-importacion-CC-001-Rev3.xlsx');

const PROJECT_START = '2026-10-19';
const TEST_GAP_DAYS = 2;

// Duración en días hábiles, incluyendo el día de inicio. Supuesto editable.
const DURATION_BY_TYPE = {
  'Decisión funcional': 3,
  'Dependencia externa': 5,
  Desarrollo: 5,
  Documentación: 2,
  'Aprobación comercial': 3,
};

// Orden lógico dentro de un hito: decidir, habilitar, construir, documentar, aprobar.
const TYPE_ORDER = ['Decisión funcional', 'Dependencia externa', 'Desarrollo', 'Documentación', 'Aprobación comercial'];

// Calendario de Guatemala (supuesto; el 24 y el 31 de diciembre se tratan como no laborables).
const HOLIDAYS = [
  ['2026-10-20', 'Día de la Revolución'],
  ['2026-11-01', 'Día de Todos los Santos (domingo)'],
  ['2026-12-24', 'Nochebuena (medio día; se trata como no laborable)'],
  ['2026-12-25', 'Navidad'],
  ['2026-12-31', 'Fin de año (medio día; se trata como no laborable)'],
  ['2027-01-01', 'Año Nuevo'],
  ['2027-03-25', 'Jueves Santo'],
  ['2027-03-26', 'Viernes Santo'],
  ['2027-05-01', 'Día del Trabajo (sábado)'],
  ['2027-06-30', 'Día del Ejército'],
];
const holidaySet = new Set(HOLIDAYS.map(([d]) => d));

// Hitos: título y justificación tomados de FWY-SF-LUCALZA-CC-001 Rev. 3.
const MILESTONES = {
  'CC-C01': ['Visualización de stock por bodega durante la cotización en Core', 'El vendedor necesita ver la disponibilidad de producto en las diferentes bodegas (venta y visualización) en el momento de capturar el pedido.'],
  'CC-C02': ['Integración de facturación', 'La integración vigente asume que la cantidad facturada por SAP siempre coincide con la pedida; en la operación real esto no siempre ocurre.'],
  'CC-C03': ['Componente de evaluación entre pedidos sugeridos y pedidos en Core (vista Farmer)', 'Comparar el pedido sugerido contra el pedido capturado exige salir a un reporte aparte, lo que retrasa la decisión del vendedor y del supervisor.'],
  'CC-C04': ['Componente de captura de promociones y carga masiva de productos asociados en Core', 'El esquema comercial de Lucalza contempla promociones acumulables, excluyentes, por escalas y mixtas que no calzan con el motor estándar de Consumer Goods Cloud.'],
  'CC-C07': ['Sincronización de precios a demanda (consulta a SAP)', 'La sincronización horaria de precios puede dejar al vendedor en campo con información desactualizada frente a una cotización.'],
  'CC-C08': ['Integración de creación de pagos y mapeo del proceso de pagos', 'No existe integración que registre y sincronice los pagos de Salesforce hacia SAP, y un mismo pago puede aplicarse parcialmente a varias facturas.'],
  'CC-C10': ['Validación para que el usuario solo pueda seleccionar el país/empresa que le corresponde', 'Un usuario puede visualizar y seleccionar opciones de país/operación distinto al suyo, lo que compromete la claridad de los datos.'],
  'CC-C11': ['Captura de información de impuesto del prospecto en Salesforce para su posterior envío a SAP', 'La integración de alta de socios de negocio no envía información fiscal, y los valores de impuesto válidos difieren por país y empresa.'],
  'CC-C13': ['Pedido sugerido nativo de Consumer Goods Cloud en la App Offline', 'La fuente del pedido sugerido pasa de Kin a la sugerencia nativa de Consumer Goods Cloud, configurada en el Order Template y ejecutada en la App Offline.'],
  'CC-M01': ['Visualización de stock por bodega durante la cotización en la App Offline (Modeler)', 'El vendedor que opera sin conexión también necesita conocer el stock por bodega al capturar el pedido.'],
};

const toKey = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
const parse = (s) => new Date(`${s}T00:00:00Z`);
const isBusiness = (d) => d.getUTCDay() !== 0 && d.getUTCDay() !== 6 && !holidaySet.has(toKey(d));

/** Suma n días hábiles (n ≥ 0) a una fecha; si cae en día no hábil, avanza al siguiente hábil. */
function addBusinessDays(date, n) {
  const d = new Date(date);
  while (!isBusiness(d)) d.setUTCDate(d.getUTCDate() + 1);
  for (let left = n; left > 0;) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (isBusiness(d)) left -= 1;
  }
  return d;
}

const excelSerial = (d) => (d.getTime() - Date.UTC(1899, 11, 30)) / 86_400_000;
const dateCell = (d) => ({ t: 'n', v: excelSerial(d), z: 'yyyy-mm-dd' });

// Una tarea pertenece al primer código que cita; sin código no entra.
const withCode = allTasks.filter((t) => t.cc.length > 0).map((t, index) => ({ ...t, code: t.cc[0], index }));
const byCode = new Map();
for (const t of withCode) {
  if (!MILESTONES[t.code]) throw new Error(`Código sin hito definido: ${t.code}`);
  byCode.set(t.code, [...(byCode.get(t.code) ?? []), t]);
}

const rows = [];
const reference = [];
for (const code of Object.keys(MILESTONES).filter((c) => byCode.has(c))) {
  const ordered = byCode.get(code).sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) || a.index - b.index);
  let start = parse(PROJECT_START);
  for (const t of ordered) {
    const days = DURATION_BY_TYPE[t.type];
    const begin = addBusinessDays(start, 0);
    const end = addBusinessDays(begin, days - 1);
    const [title, description] = MILESTONES[code];
    rows.push([code, title, description, t.name, '', dateCell(begin), dateCell(end)]);
    reference.push([code, t.name, t.type, days, t.cc.join(', '), t.source, t.notes]);
    start = addBusinessDays(end, TEST_GAP_DAYS + 1);
  }
}

const sheet = (headers, data, widths) => {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  ws['!cols'] = widths.map((wch) => ({ wch }));
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };
  return ws;
};

const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, sheet(
  ['CodigoHito', 'NombreHito', 'DescripcionHito', 'Tarea', 'Responsable', 'FechaInicio', 'FechaEstimada'],
  rows,
  [11, 60, 70, 70, 20, 13, 15],
), 'Plantilla');

XLSX.utils.book_append_sheet(workbook, sheet(
  ['CodigoHito', 'Tarea', 'TipoTarea', 'DuracionDiasHabiles', 'CodigosOriginales', 'FuenteHallazgo', 'Observaciones'],
  reference,
  [11, 70, 20, 20, 30, 38, 100],
), 'Referencia');

const lastEnd = rows.map((r) => r[6].v).reduce((a, b) => Math.max(a, b));
XLSX.utils.book_append_sheet(workbook, sheet(
  ['Supuesto', 'Valor'],
  [
    ['Estado de los datos', 'DATOS DE PRUEBA: supuestos confirmados por el equipo; las fechas pasarán por una revisión antes de uso real'],
    ['Proyecto destino (propuesto)', 'CC-001 Rev. 3 (8 oct 2026)'],
    ['Fecha de inicio del proyecto (supuesto)', PROJECT_START],
    ['Días hábiles', 'Lunes a viernes, sin feriados (hoja Feriados)'],
    ['Calendario de feriados', 'Guatemala (supuesto, por confirmar)'],
    ['Pruebas entre tareas', `${TEST_GAP_DAYS} días hábiles entre el fin de una tarea y el inicio de la siguiente del mismo hito`],
    ['Encadenamiento', 'Las tareas de un hito van en secuencia; los hitos corren en paralelo'],
    ['Orden dentro del hito', 'Decisión funcional → Dependencia externa → Desarrollo → Documentación → Aprobación comercial'],
    ['Duración por tipo (días hábiles, incluye el día de inicio)', Object.entries(DURATION_BY_TYPE).map(([k, v]) => `${k}: ${v}`).join('; ')],
    ['Hitos con tareas', `${byCode.size}: ${[...byCode.keys()].join(', ')}`],
    ['Hitos del PDF sin tareas', 'CC-C09 y CC-C12: ninguna tarea los cita como primer código, así que no se crean hasta que tengan tareas'],
    ['Tarea con varios CC', 'Se asigna solo al primer código; los originales están en la hoja Referencia'],
    ['Tareas sin CC', 'Quedan fuera (5): pendientes de decidir a qué hito se asignan'],
    ['Responsable', 'Vacío: los documentos no lo confirman'],
    ['Fin del último hito', toKey(new Date(Date.UTC(1899, 11, 30) + lastEnd * 86_400_000))],
  ],
  [58, 110],
), 'Supuestos');

XLSX.utils.book_append_sheet(workbook, sheet(['Fecha', 'Feriado'], HOLIDAYS, [13, 60]), 'Feriados');

fs.mkdirSync(path.dirname(output), { recursive: true });
XLSX.writeFile(workbook, output);
console.log(`Plantilla generada: ${output} (${byCode.size} hitos, ${rows.length} tareas)`);
