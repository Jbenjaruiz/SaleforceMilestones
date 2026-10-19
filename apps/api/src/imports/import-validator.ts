import { isCalendarDay } from '../common/calendar';
import { CellValue, ColumnName, ImportIssue, RawRow } from './excel-reader';

export interface PlannedTask {
  row: number;
  name: string;
  responsible: string | null;
  startDate: string;
  estimatedDate: string;
}

export interface PlannedMilestone {
  code: string;
  name: string;
  description: string | null;
  tasks: PlannedTask[];
}

export interface ImportPlan {
  milestones: PlannedMilestone[];
}

const LIMITS: Partial<Record<ColumnName, number>> = { CodigoHito: 30, NombreHito: 300, DescripcionHito: 2000, Tarea: 500, Responsable: 200 };

const text = (value: CellValue): string => {
  if (value === null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
};

/** Excel serial number (days since 1899-12-30) to a calendar day. */
const fromSerial = (serial: number) => new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * 86_400_000).toISOString().slice(0, 10);

/**
 * Dates may be real Excel dates, Excel serial numbers or "YYYY-MM-DD" text.
 * Anything else (including "03/04/2026", which is ambiguous) is rejected rather than guessed.
 */
export function parseDay(value: CellValue): string | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  if (typeof value === 'number') return value > 0 && value < 2_958_466 ? fromSerial(value) : null;
  const trimmed = text(value);
  return isCalendarDay(trimmed) ? trimmed : null;
}

/**
 * Turns the raw rows into milestones with tasks, collecting every problem (not just the first),
 * so the whole file can be fixed in one pass. Nothing is saved here.
 */
export function buildPlan(rows: RawRow[], existingCodes: ReadonlySet<string>): { plan: ImportPlan; issues: ImportIssue[] } {
  const issues: ImportIssue[] = [];
  const problem = (row: number, column: ColumnName | null, code: string, message: string) => issues.push({ row, column, code, message });
  const milestones = new Map<string, PlannedMilestone & { firstRow: number; nameRow: number; descriptionRow: number | null }>();
  const seenTasks = new Map<string, number>();
  const reportedExisting = new Set<string>();

  for (const { row, values } of rows) {
    const read = (column: ColumnName) => {
      const value = text(values[column]);
      const max = LIMITS[column];
      if (max && value.length > max) problem(row, column, 'too_long', `${column} is longer than ${max} characters.`);
      return value;
    };

    const code = read('CodigoHito').toUpperCase();
    const name = read('NombreHito');
    const description = read('DescripcionHito');
    const taskName = read('Tarea');
    const responsible = read('Responsable');

    if (!code) problem(row, 'CodigoHito', 'required', 'CodigoHito is required.');
    if (!name) problem(row, 'NombreHito', 'required', 'NombreHito is required.');
    if (!taskName) problem(row, 'Tarea', 'required', 'Tarea is required.');

    const startDate = parseDay(values.FechaInicio);
    const estimatedDate = parseDay(values.FechaEstimada);
    if (!startDate) problem(row, 'FechaInicio', isBlankCell(values.FechaInicio) ? 'required' : 'invalid_date', isBlankCell(values.FechaInicio) ? 'FechaInicio is required.' : 'FechaInicio is not a valid date. Use an Excel date or YYYY-MM-DD.');
    if (!estimatedDate) problem(row, 'FechaEstimada', isBlankCell(values.FechaEstimada) ? 'required' : 'invalid_date', isBlankCell(values.FechaEstimada) ? 'FechaEstimada is required.' : 'FechaEstimada is not a valid date. Use an Excel date or YYYY-MM-DD.');
    if (startDate && estimatedDate && estimatedDate < startDate) problem(row, 'FechaEstimada', 'date_order', 'FechaEstimada is earlier than FechaInicio.');

    if (!code) continue;

    if (existingCodes.has(code)) {
      if (!reportedExisting.has(code)) {
        reportedExisting.add(code);
        problem(row, 'CodigoHito', 'code_exists', `A milestone with code ${code} already exists in this project.`);
      }
      continue;
    }

    let milestone = milestones.get(code);
    if (!milestone) {
      milestone = { code, name, description: description || null, tasks: [], firstRow: row, nameRow: row, descriptionRow: description ? row : null };
      milestones.set(code, milestone);
    } else {
      if (name && name !== milestone.name) problem(row, 'NombreHito', 'name_conflict', `${code} is named differently in row ${milestone.nameRow}. Use the same NombreHito on every row of a milestone.`);
      if (description) {
        if (milestone.description && description !== milestone.description) problem(row, 'DescripcionHito', 'description_conflict', `${code} has a different DescripcionHito in row ${milestone.descriptionRow}.`);
        else if (!milestone.description) Object.assign(milestone, { description, descriptionRow: row });
      }
    }

    if (taskName) {
      const key = `${code}\u0000${taskName.toLowerCase()}`;
      if (seenTasks.has(key)) problem(row, 'Tarea', 'duplicate_task', `Task "${taskName}" is repeated in ${code} (also in row ${seenTasks.get(key)}).`);
      else seenTasks.set(key, row);
    }
    if (taskName && startDate && estimatedDate) {
      milestone.tasks.push({ row, name: taskName, responsible: responsible || null, startDate, estimatedDate });
    }
  }

  return {
    plan: { milestones: [...milestones.values()].map(({ code, name, description, tasks }) => ({ code, name, description, tasks })) },
    issues,
  };
}

const isBlankCell = (value: CellValue) => text(value) === '';
