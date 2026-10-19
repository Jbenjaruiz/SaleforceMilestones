import { Milestone } from '../milestones/milestone.entity';
import { Project } from '../projects/project.entity';
import { Task } from '../tasks/task.entity';
import { MilestoneSummary, summarizeMilestone, TaskStatus, taskDelayDays, taskStatus } from './metrics';

export interface TaskView {
  id: string;
  milestoneId: string;
  name: string;
  responsible: string | null;
  startDate: string;
  estimatedDate: string;
  actualDate: string | null;
  isCompleted: boolean;
  status: TaskStatus;
  delayDays: number;
  sortOrder: number;
}

export interface MilestoneView extends MilestoneSummary {
  id: string;
  projectId: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  tasks: TaskView[];
}

export interface ProjectView {
  id: string;
  name: string;
  description: string | null;
  isArchived: boolean;
  createdAt: Date;
}

export const toTaskView = (task: Task, today: string): TaskView => ({
  id: task.id,
  milestoneId: task.milestoneId,
  name: task.name,
  responsible: task.responsible,
  startDate: task.startDate,
  estimatedDate: task.estimatedDate,
  actualDate: task.actualDate,
  isCompleted: task.isCompleted,
  status: taskStatus(task, today),
  delayDays: taskDelayDays(task, today),
  sortOrder: task.sortOrder,
});

export const sortTasks = (tasks: Task[]): Task[] =>
  [...tasks].sort((a, b) => a.sortOrder - b.sortOrder || a.startDate.localeCompare(b.startDate));

/** Expects `milestone.tasks` to be loaded. */
export function toMilestoneView(milestone: Milestone, today: string): MilestoneView {
  const tasks = sortTasks(milestone.tasks ?? []);
  return {
    id: milestone.id,
    projectId: milestone.projectId,
    code: milestone.code,
    name: milestone.name,
    description: milestone.description,
    sortOrder: milestone.sortOrder,
    ...summarizeMilestone(tasks, today),
    tasks: tasks.map((task) => toTaskView(task, today)),
  };
}

export const toProjectView = (project: Project): ProjectView => ({
  id: project.id,
  name: project.name,
  description: project.description,
  isArchived: project.isArchived,
  createdAt: project.createdAt,
});
