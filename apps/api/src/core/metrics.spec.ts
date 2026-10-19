import { summarizeMilestone, summarizeProject, taskDelayDays, taskStatus, TaskFacts } from './metrics';

const TODAY = '2026-10-19';

const task = (overrides: Partial<TaskFacts> = {}): TaskFacts => ({
  startDate: '2026-10-12',
  estimatedDate: '2026-10-16',
  actualDate: null,
  isCompleted: false,
  ...overrides,
});

describe('task status', () => {
  it('is completed when checked, in progress once it has started, pending before', () => {
    expect(taskStatus(task({ isCompleted: true, actualDate: '2026-10-15' }), TODAY)).toBe('completed');
    expect(taskStatus(task({ startDate: TODAY }), TODAY)).toBe('in_progress');
    expect(taskStatus(task({ startDate: '2026-10-20' }), TODAY)).toBe('pending');
  });
});

describe('task delay', () => {
  it('counts days overdue for an unfinished task and 0 before its due date', () => {
    expect(taskDelayDays(task({ estimatedDate: '2026-10-16' }), TODAY)).toBe(3);
    expect(taskDelayDays(task({ estimatedDate: TODAY }), TODAY)).toBe(0);
    expect(taskDelayDays(task({ estimatedDate: '2026-10-25' }), TODAY)).toBe(0);
  });

  it('for a finished task counts how late it was delivered, not days since', () => {
    expect(taskDelayDays(task({ isCompleted: true, estimatedDate: '2026-10-16', actualDate: '2026-10-18' }), TODAY)).toBe(2);
    expect(taskDelayDays(task({ isCompleted: true, estimatedDate: '2026-10-16', actualDate: '2026-10-14' }), TODAY)).toBe(0);
  });
});

describe('milestone summary', () => {
  it('has no progress, dates or status when it has no tasks', () => {
    expect(summarizeMilestone([], TODAY)).toMatchObject({ progress: null, status: 'no_tasks', startDate: null, estimatedDate: null, actualDate: null, delayDays: 0 });
  });

  it('derives progress, start and estimated dates from its tasks', () => {
    const s = summarizeMilestone(
      [task({ startDate: '2026-10-14', estimatedDate: '2026-10-20' }), task({ startDate: '2026-10-12', estimatedDate: '2026-10-30', isCompleted: true, actualDate: '2026-10-15' }), task({ startDate: '2026-10-22', estimatedDate: '2026-10-28' })],
      TODAY,
    );
    expect(s.progress).toBeCloseTo(33.33, 1);
    expect(s).toMatchObject({ taskCount: 3, completedCount: 1, startDate: '2026-10-12', estimatedDate: '2026-10-30', actualDate: null, status: 'in_progress' });
  });

  it('is finished only when every task is, dated by the last one completed', () => {
    const s = summarizeMilestone(
      [task({ isCompleted: true, actualDate: '2026-10-15' }), task({ isCompleted: true, actualDate: '2026-10-17' })],
      TODAY,
    );
    expect(s).toMatchObject({ status: 'completed', progress: 100, actualDate: '2026-10-17' });
  });

  it('is pending while no task has started, and in progress as soon as the earliest one starts', () => {
    expect(summarizeMilestone([task({ startDate: '2026-11-02', estimatedDate: '2026-11-06' })], TODAY).status).toBe('pending');
    expect(summarizeMilestone([task({ startDate: '2026-11-02', estimatedDate: '2026-11-06' }), task({ startDate: TODAY })], TODAY).status).toBe('in_progress');
  });

  it('adds up the delay of its overdue tasks', () => {
    const s = summarizeMilestone(
      [task({ estimatedDate: '2026-10-16' }), task({ estimatedDate: '2026-10-17' }), task({ estimatedDate: '2026-10-30' })],
      TODAY,
    );
    expect(s).toMatchObject({ delayDays: 5, delayedTaskCount: 2 });
  });
});

describe('project summary', () => {
  it('averages the milestones that have tasks and sums every delay', () => {
    const half = summarizeMilestone([task({ isCompleted: true, actualDate: '2026-10-15' }), task()], TODAY); // 50 %, 3 late days
    const done = summarizeMilestone([task({ isCompleted: true, actualDate: '2026-10-14' })], TODAY); // 100 %
    const empty = summarizeMilestone([], TODAY);

    expect(summarizeProject([half, done, empty])).toMatchObject({
      milestoneCount: 3,
      finishedMilestones: 1,
      taskCount: 3,
      completedTasks: 2,
      overallProgress: 75,
      milestonesWithProgress: 2,
      delayDays: 3,
      delayedTaskCount: 1,
    });
  });

  it('reports no overall progress when no milestone has tasks', () => {
    expect(summarizeProject([summarizeMilestone([], TODAY)]).overallProgress).toBeNull();
    expect(summarizeProject([]).overallProgress).toBeNull();
  });
});
