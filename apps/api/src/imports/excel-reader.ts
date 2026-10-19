import * as ExcelJS from 'exceljs';

/** The one-sheet template (F01 §7): one row per task. */
export const TEMPLATE_SHEET = 'Plantilla';
export const COLUMNS = ['CodigoHito', 'NombreHito', 'DescripcionHito', 'Tarea', 'Responsable', 'FechaInicio', 'FechaEstimada'] as const;
export type ColumnName = (typeof COLUMNS)[number];
export const REQUIRED_COLUMNS: readonly ColumnName[] = ['CodigoHito', 'NombreHito', 'Tarea', 'FechaInicio', 'FechaEstimada'];
export const MAX_ROWS = 2000;

export type CellValue = string | number | Date | null;

export interface RawRow {
  /** Spreadsheet row number, as the user sees it. */
  row: number;
  values: Record<ColumnName, CellValue>;
}

export interface ImportIssue {
  row: number | null;
  column: string | null;
  code: string;
  message: string;
}

export interface ReadResult {
  rows: RawRow[];
  issues: ImportIssue[];
}

/** Header comparison ignores case, accents and spaces: "Código hito" matches "CodigoHito". */
const normalize = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s_-]+/g, '').toLowerCase();

function cellValue(value: ExcelJS.CellValue): CellValue {
  if (value === null || value === undefined) return null;
  if (value instanceof Date || typeof value === 'number') return value;
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return String(value);
  if ('richText' in value) return value.richText.map((part) => part.text).join('');
  if ('result' in value) return cellValue(value.result as ExcelJS.CellValue); // formula: use its computed value
  if ('text' in value) return String(value.text); // hyperlink
  return null; // error cells (#N/A…) count as empty
}

const isBlank = (value: CellValue) => value === null || (typeof value === 'string' && value.trim() === '');

export async function readWorkbook(buffer: Buffer): Promise<ReadResult> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    return { rows: [], issues: [{ row: null, column: null, code: 'unreadable_file', message: 'The file could not be read as an Excel (.xlsx) workbook.' }] };
  }

  const sheet = workbook.getWorksheet(TEMPLATE_SHEET) ?? workbook.worksheets[0];
  if (!sheet) return { rows: [], issues: [{ row: null, column: null, code: 'no_sheet', message: 'The workbook has no sheets.' }] };

  const header = new Map<ColumnName, number>();
  sheet.getRow(1).eachCell((cell, columnNumber) => {
    const text = cellValue(cell.value);
    if (typeof text !== 'string') return;
    const match = COLUMNS.find((name) => normalize(name) === normalize(text));
    if (match && !header.has(match)) header.set(match, columnNumber);
  });

  const missing = REQUIRED_COLUMNS.filter((name) => !header.has(name));
  if (missing.length > 0) {
    return {
      rows: [],
      issues: missing.map((name) => ({ row: 1, column: name, code: 'missing_column', message: `Column "${name}" was not found in the header row of sheet "${sheet.name}".` })),
    };
  }

  const rows: RawRow[] = [];
  const last = sheet.actualRowCount > 0 ? sheet.rowCount : 1;
  if (last - 1 > MAX_ROWS) {
    return { rows: [], issues: [{ row: null, column: null, code: 'too_many_rows', message: `The file has more than ${MAX_ROWS} rows.` }] };
  }

  for (let number = 2; number <= last; number += 1) {
    const row = sheet.getRow(number);
    const values = Object.fromEntries(COLUMNS.map((name) => [name, header.has(name) ? cellValue(row.getCell(header.get(name) as number).value) : null])) as Record<ColumnName, CellValue>;
    if (Object.values(values).every(isBlank)) continue; // empty rows between tasks are ignored
    rows.push({ row: number, values });
  }

  if (rows.length === 0) {
    return { rows, issues: [{ row: null, column: null, code: 'no_rows', message: `Sheet "${sheet.name}" has no task rows below the header.` }] };
  }
  return { rows, issues: [] };
}

/** An empty template with the expected columns and one example row, for the "download template" action. */
export async function buildTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(TEMPLATE_SHEET);
  sheet.columns = COLUMNS.map((name) => ({ header: name, key: name, width: name === 'Tarea' || name === 'NombreHito' || name === 'DescripcionHito' ? 50 : 16 }));
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.addRow({
    CodigoHito: 'CC-C01',
    NombreHito: 'Nombre del control de cambio',
    DescripcionHito: 'Descripción (opcional)',
    Tarea: 'Nombre de la tarea',
    Responsable: '',
    FechaInicio: new Date(Date.UTC(2026, 9, 19)),
    FechaEstimada: new Date(Date.UTC(2026, 9, 23)),
  });
  for (const key of ['FechaInicio', 'FechaEstimada']) sheet.getColumn(key).numFmt = 'yyyy-mm-dd';
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
