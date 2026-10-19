import * as ExcelJS from 'exceljs';
import { buildTemplate, readWorkbook } from './excel-reader';
import { buildPlan, parseDay } from './import-validator';

const HEADER = ['CodigoHito', 'NombreHito', 'DescripcionHito', 'Tarea', 'Responsable', 'FechaInicio', 'FechaEstimada'];
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

async function workbookWith(rows: unknown[][], { sheet = 'Plantilla', header = HEADER }: { sheet?: string; header?: string[] } = {}) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheet);
  worksheet.addRow(header);
  rows.forEach((row) => worksheet.addRow(row));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

const good = ['CC-C01', 'Stock por bodega', 'Descripción', 'Definir regla', 'Inforum', day('2026-10-19'), day('2026-10-22')];

describe('readWorkbook', () => {
  it('reads the template rows with their spreadsheet row numbers, skipping blank rows', async () => {
    const { rows, issues } = await readWorkbook(await workbookWith([good, [], ['CC-C01', 'Stock por bodega', null, 'Construir', null, day('2026-10-27'), day('2026-11-02')]]));
    expect(issues).toEqual([]);
    expect(rows.map((r) => r.row)).toEqual([2, 4]);
    expect(rows[0].values).toMatchObject({ CodigoHito: 'CC-C01', Tarea: 'Definir regla', Responsable: 'Inforum' });
  });

  it('matches headers regardless of case, accents and spaces', async () => {
    const { rows, issues } = await readWorkbook(await workbookWith([good], { header: ['código hito', 'NOMBRE HITO', 'descripcion hito', 'tarea', 'responsable', 'fecha inicio', 'Fecha_Estimada'] }));
    expect(issues).toEqual([]);
    expect(rows).toHaveLength(1);
  });

  it('falls back to the first sheet when there is no sheet named Plantilla', async () => {
    const { rows } = await readWorkbook(await workbookWith([good], { sheet: 'Hoja1' }));
    expect(rows).toHaveLength(1);
  });

  it('names every missing required column', async () => {
    const { issues } = await readWorkbook(await workbookWith([good], { header: ['CodigoHito', 'Tarea'] }));
    expect(issues.map((i) => i.column)).toEqual(['NombreHito', 'FechaInicio', 'FechaEstimada']);
    expect(issues.every((i) => i.code === 'missing_column' && i.row === 1)).toBe(true);
  });

  it('reports a file that is not a workbook, and a workbook without rows', async () => {
    expect((await readWorkbook(Buffer.from('PK not really a zip'))).issues[0].code).toBe('unreadable_file');
    expect((await readWorkbook(await workbookWith([]))).issues[0].code).toBe('no_rows');
  });

  it('builds a downloadable template that reads back as valid', async () => {
    const { rows, issues } = await readWorkbook(await buildTemplate());
    expect(issues).toEqual([]);
    expect(buildPlan(rows, new Set()).issues).toEqual([]);
  });
});

describe('parseDay', () => {
  it('accepts Excel dates, serial numbers and ISO text only', () => {
    expect(parseDay(day('2026-10-19'))).toBe('2026-10-19');
    expect(parseDay(46314)).toBe('2026-10-19'); // Excel serial for 2026-10-19
    expect(parseDay(' 2026-10-19 ')).toBe('2026-10-19');
    for (const bad of ['19/10/2026', '10/19/2026', '2026-02-30', 'mañana', '', null, -5]) expect(parseDay(bad as never)).toBeNull();
  });
});

describe('buildPlan', () => {
  const rowsOf = async (data: unknown[][]) => (await readWorkbook(await workbookWith(data))).rows;

  it('groups tasks under their milestone in file order and uppercases codes', async () => {
    const { plan, issues } = buildPlan(await rowsOf([good, ['cc-c01', 'Stock por bodega', null, 'Construir', null, day('2026-10-27'), day('2026-11-02')], ['CC-M01', 'Modeler', null, 'Probar', null, day('2026-10-19'), day('2026-10-20')]]), new Set());
    expect(issues).toEqual([]);
    expect(plan.milestones.map((m) => [m.code, m.tasks.length])).toEqual([['CC-C01', 2], ['CC-M01', 1]]);
    expect(plan.milestones[0]).toMatchObject({ name: 'Stock por bodega', description: 'Descripción' });
    expect(plan.milestones[0].tasks[0]).toMatchObject({ responsible: 'Inforum', startDate: '2026-10-19', estimatedDate: '2026-10-22' });
  });

  it('rejects codes that already exist in the project, once per code', async () => {
    const { issues } = buildPlan(await rowsOf([good, ['CC-C01', 'Stock por bodega', null, 'Otra', null, day('2026-10-27'), day('2026-11-02')]]), new Set(['CC-C01']));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ code: 'code_exists', row: 2, column: 'CodigoHito' });
  });

  it('collects every problem in the file, with its row and column', async () => {
    const { issues } = buildPlan(
      await rowsOf([
        ['', 'Sin código', null, 'Tarea A', null, day('2026-10-19'), day('2026-10-22')],
        ['CC-C02', '', null, '', null, day('2026-10-19'), day('2026-10-22')],
        ['CC-C03', 'Fechas', null, 'Tarea B', null, null, 'pronto'],
        ['CC-C04', 'Orden', null, 'Tarea C', null, day('2026-10-25'), day('2026-10-20')],
        ['CC-C05', 'Largo', null, 'x'.repeat(501), null, day('2026-10-19'), day('2026-10-22')],
      ]),
      new Set(),
    );
    const found = issues.map((i) => `${i.row}:${i.column}:${i.code}`);
    expect(found).toEqual(expect.arrayContaining(['2:CodigoHito:required', '3:NombreHito:required', '3:Tarea:required', '4:FechaInicio:required', '4:FechaEstimada:invalid_date', '5:FechaEstimada:date_order', '6:Tarea:too_long']));
  });

  it('flags a milestone named differently on different rows, and repeated tasks', async () => {
    const { issues } = buildPlan(
      await rowsOf([good, ['CC-C01', 'Otro nombre', null, 'Definir regla', null, day('2026-10-27'), day('2026-11-02')]]),
      new Set(),
    );
    expect(issues.map((i) => i.code)).toEqual(expect.arrayContaining(['name_conflict', 'duplicate_task']));
  });

  it('accepts the same task name in different milestones', async () => {
    const { issues } = buildPlan(await rowsOf([good, ['CC-C02', 'Otro', null, 'Definir regla', null, day('2026-10-19'), day('2026-10-22')]]), new Set());
    expect(issues).toEqual([]);
  });
});
