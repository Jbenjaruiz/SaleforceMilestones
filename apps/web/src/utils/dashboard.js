import { parseCalendarDay } from './dates.js';
import { delayDays, delayStatus, FINISHED } from './delay.js';
import { milestoneProgress, overallProgress, parseCompleted } from './progress.js';

export const STATUSES = ['Pendiente', 'En curso', 'Finalizado'];

const text = (value) => String(value ?? '').trim();

function splitReferences(value) {
  return text(value).split(/[,;\n]+/).map((item) => item.trim()).filter(Boolean);
}

function byOrder(a, b) {
  const left = Number.isFinite(a.order) ? a.order : Infinity;
  const right = Number.isFinite(b.order) ? b.order : Infinity;
  return left - right || a.index - b.index;
}

function normalizeMilestone(row, index, issues) {
  const id = text(row.HitoID);
  const label = id || `fila ${index + 2} de Hitos`;
  const estimated = parseCalendarDay(row.FechaEstimada);
  const completed = parseCalendarDay(row.FechaFinalizacion);
  const status = text(row.Estado);

  if (estimated === undefined) issues.push({ scope: label, message: `FechaEstimada no es una fecha válida (${text(row.FechaEstimada)}); se ignora.` });
  if (completed === undefined) issues.push({ scope: label, message: `FechaFinalizacion no es una fecha válida (${text(row.FechaFinalizacion)}); se ignora.` });
  if (!STATUSES.includes(status)) issues.push({ scope: label, message: `Estado "${status}" no es válido; use ${STATUSES.join(', ')}.` });

  return {
    id,
    name: text(row.NombreHito) || label,
    description: text(row.Descripcion),
    estimated: estimated ?? null,
    completed: completed ?? null,
    status,
    statusValid: STATUSES.includes(status),
    owner: text(row.Responsable),
    notes: text(row.Observaciones),
    order: Number(row.Orden),
    index,
  };
}

function normalizeTask(row, index, issues) {
  const id = text(row.TareaID);
  const label = id || `fila ${index + 2} de Tareas`;
  const completed = parseCompleted(row.Completada);
  if (completed === null) issues.push({ scope: label, message: `Completada debe ser Sí o No (valor: "${text(row.Completada)}"); la tarea no cuenta para el avance.` });

  return {
    id,
    milestoneId: text(row.HitoID),
    name: text(row.NombreTarea) || label,
    completed,
    notes: text(row.Observaciones),
    changeControls: splitReferences(row.ControlCambioOrigen),
    type: text(row.TipoTarea),
    source: text(row.FuenteHallazgo),
    order: Number(row.Orden),
    index,
  };
}

/** Conserva la primera aparición de cada identificador y avisa de las repetidas. */
function dropDuplicates(items, kind, issues) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item.id) {
      issues.push({ scope: kind, message: `Hay una fila de ${kind} sin identificador; se ignora.` });
      return false;
    }
    if (seen.has(item.id)) {
      issues.push({ scope: item.id, message: `Identificador duplicado en ${kind}; se usa solo la primera fila.` });
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

/**
 * Normaliza las hojas leídas y calcula avance, retrasos y advertencias.
 * No modifica el estado manual de los hitos ni oculta los datos inconsistentes.
 */
export function buildDashboard({ config, milestones: milestoneRows, tasks: taskRows }, today) {
  const issues = [];

  const milestones = dropDuplicates(milestoneRows.map((row, i) => normalizeMilestone(row, i, issues)), 'Hitos', issues).sort(byOrder);
  const tasks = dropDuplicates(taskRows.map((row, i) => normalizeTask(row, i, issues)), 'Tareas', issues).sort(byOrder);

  const milestoneIds = new Set(milestones.map((item) => item.id));
  const orphanTasks = tasks.filter((task) => !milestoneIds.has(task.milestoneId));
  for (const task of orphanTasks) {
    issues.push({ scope: task.id, message: `Referencia inválida: el HitoID "${task.milestoneId}" no existe; la tarea no se asigna a ningún hito.` });
  }

  const rows = milestones.map((milestone) => {
    const own = tasks.filter((task) => task.milestoneId === milestone.id);
    const progress = milestoneProgress(own);
    const delay = delayDays({ status: milestone.status, estimated: milestone.estimated, completed: milestone.completed }, today);
    const warnings = [];

    if (!own.length) warnings.push('Este hito no tiene tareas: su avance no está disponible y no participa en el avance global.');
    if (milestone.status === FINISHED && own.some((task) => task.completed !== true)) warnings.push('Marcado como Finalizado pero tiene tareas incompletas.');
    if (milestone.status !== FINISHED && milestone.completed) warnings.push('Tiene fecha real de finalización aunque no está Finalizado.');
    if (milestone.status === FINISHED && !milestone.completed) warnings.push('Marcado como Finalizado sin fecha real de finalización: no se puede calcular el retraso.');
    for (const issue of issues.filter((item) => item.scope === milestone.id)) warnings.push(issue.message);

    return {
      ...milestone,
      tasks: own,
      tasksDone: own.filter((task) => task.completed === true).length,
      progress,
      delay,
      delayStatus: delayStatus(delay),
      warnings,
    };
  });

  const overall = overallProgress(rows.map((row) => row.progress));
  const rowIds = new Set(rows.map((row) => row.id));
  const alerts = [
    ...rows.flatMap((row) => row.warnings.map((message) => ({ scope: row.id, message }))),
    ...issues.filter((issue) => !rowIds.has(issue.scope)),
  ];

  return {
    config,
    milestones: rows,
    alerts,
    summary: {
      total: rows.length,
      overall: overall.value,
      included: overall.included,
      finished: rows.filter((row) => row.status === FINISHED).length,
      late: rows.filter((row) => row.delayStatus === 'late').length,
      unknownDelay: rows.filter((row) => row.delayStatus === 'unknown').length,
      tasks: tasks.length - orphanTasks.length,
      tasksDone: rows.reduce((sum, row) => sum + row.tasksDone, 0),
    },
  };
}

/** Filtro de la tabla: solo selecciona filas, los indicadores salen del conjunto completo. */
export function filterMilestones(rows, { status = 'all', delay = 'all' } = {}) {
  return rows.filter((row) => (status === 'all' || row.status === status) && (delay === 'all' || row.delayStatus === delay));
}
