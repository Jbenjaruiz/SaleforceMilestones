import { diffInDays } from '../common/calendar';

/**
 * Derived values (F01 §4.3). Nothing here is stored: progress, status, dates and delays
 * are always computed from the tasks and today's calendar day.
 */

export type TaskStatus = 'completed' | 'in_progress' | 'pending';
export type MilestoneStatus = TaskStatus | 'no_tasks';

export interface TaskFacts {
  startDate: string;
  estimatedDate: string;
  actualDate: string | null;
  isCompleted: boolean;
}

export function taskStatus(task: TaskFacts, today: string): TaskStatus {
  if (task.isCompleted) return 'completed';
  return task.startDate <= today ? 'in_progress' : 'pending';
}

/**
 * Delay in calendar days. Finished: how late it was delivered; unfinished: how long it has been overdue.
 * Both dates are mandatory on tasks, so every task has a delay.
 */
export function taskDelayDays(task: TaskFacts, today: string): number {
  const reference = task.isCompleted ? (task.actualDate ?? today) : today;
  return Math.max(0, diffInDays(task.estimatedDate, reference));
}

export interface MilestoneSummary {
  taskCount: number;
  completedCount: number;
  /** Percentage 0-100, or null when the milestone has no tasks (never 0 % or 100 % by default). */
  progress: number | null;
  status: MilestoneStatus;
  startDate: string | null;
  estimatedDate: string | null;
  /** Only when every task is completed: the date of the last one. */
  actualDate: string | null;
  /** Sum of the delay of its tasks. */
  delayDays: number;
  delayedTaskCount: number;
}

export function summarizeMilestone(tasks: TaskFacts[], today: string): MilestoneSummary {
  if (tasks.length === 0) {
    return { taskCount: 0, completedCount: 0, progress: null, status: 'no_tasks', startDate: null, estimatedDate: null, actualDate: null, delayDays: 0, delayedTaskCount: 0 };
  }

  const completed = tasks.filter((task) => task.isCompleted);
  const finished = completed.length === tasks.length;
  const startDate = tasks.reduce((min, task) => (task.startDate < min ? task.startDate : min), tasks[0].startDate);
  const delays = tasks.map((task) => taskDelayDays(task, today));

  let status: MilestoneStatus = 'pending';
  if (finished) status = 'completed';
  else if (startDate <= today) status = 'in_progress';

  return {
    taskCount: tasks.length,
    completedCount: completed.length,
    progress: (completed.length / tasks.length) * 100,
    status,
    startDate,
    estimatedDate: tasks.reduce((max, task) => (task.estimatedDate > max ? task.estimatedDate : max), tasks[0].estimatedDate),
    actualDate: finished ? completed.reduce((max, task) => ((task.actualDate ?? '') > max ? (task.actualDate ?? '') : max), '') || null : null,
    delayDays: delays.reduce((sum, days) => sum + days, 0),
    delayedTaskCount: delays.filter((days) => days > 0).length,
  };
}

export interface ProjectSummary {
  milestoneCount: number;
  finishedMilestones: number;
  taskCount: number;
  completedTasks: number;
  /** Simple mean of the milestones that have progress, or null when none has tasks. */
  overallProgress: number | null;
  /** How many milestones contributed to overallProgress. */
  milestonesWithProgress: number;
  /** Accumulated delay in days of every task in the project. */
  delayDays: number;
  delayedTaskCount: number;
}

export function summarizeProject(milestones: MilestoneSummary[]): ProjectSummary {
  const withProgress = milestones.filter((m) => m.progress !== null);
  return {
    milestoneCount: milestones.length,
    finishedMilestones: milestones.filter((m) => m.status === 'completed').length,
    taskCount: milestones.reduce((sum, m) => sum + m.taskCount, 0),
    completedTasks: milestones.reduce((sum, m) => sum + m.completedCount, 0),
    overallProgress: withProgress.length > 0 ? withProgress.reduce((sum, m) => sum + (m.progress as number), 0) / withProgress.length : null,
    milestonesWithProgress: withProgress.length,
    delayDays: milestones.reduce((sum, m) => sum + m.delayDays, 0),
    delayedTaskCount: milestones.reduce((sum, m) => sum + m.delayedTaskCount, 0),
  };
}
