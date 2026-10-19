import { EntityManager, In } from 'typeorm';
import { Attachment } from '../attachments/attachment.entity';
import { Comment } from '../comments/comment.entity';
import { Milestone } from '../milestones/milestone.entity';
import { Task } from '../tasks/task.entity';

/**
 * The schema has no ON DELETE CASCADE on these tables (SQL Server rejects the multiple cascade paths,
 * and files on disk must go too), so deletes run in order inside the caller's transaction:
 * attachments, comments, tasks, milestone.
 */
export interface DeletionReport {
  tasks: number;
  comments: number;
  attachments: number;
  /** Files to remove from disk once the transaction has committed. */
  storageKeys: string[];
}

const empty = (): DeletionReport => ({ tasks: 0, comments: 0, attachments: 0, storageKeys: [] });

async function deleteCommentsAndAttachments(manager: EntityManager, where: { taskIds?: string[]; milestoneId?: string }) {
  const report = empty();
  const comments = await manager.getRepository(Comment).find({
    select: { id: true },
    where: [
      ...(where.taskIds?.length ? [{ taskId: In(where.taskIds) }] : []),
      ...(where.milestoneId ? [{ milestoneId: where.milestoneId }] : []),
    ],
  });
  const commentIds = comments.map((comment) => comment.id);

  const attachments = await manager.getRepository(Attachment).find({
    select: { id: true, storageKey: true },
    where: [
      ...(where.taskIds?.length ? [{ taskId: In(where.taskIds) }] : []),
      ...(commentIds.length ? [{ commentId: In(commentIds) }] : []),
    ],
  });
  if (attachments.length > 0) {
    await manager.getRepository(Attachment).delete(attachments.map((attachment) => attachment.id));
    report.attachments = attachments.length;
    report.storageKeys = attachments.map((attachment) => attachment.storageKey);
  }
  if (commentIds.length > 0) {
    await manager.getRepository(Comment).delete(commentIds);
    report.comments = commentIds.length;
  }
  return report;
}

const merge = (a: DeletionReport, b: DeletionReport): DeletionReport => ({
  tasks: a.tasks + b.tasks,
  comments: a.comments + b.comments,
  attachments: a.attachments + b.attachments,
  storageKeys: [...a.storageKeys, ...b.storageKeys],
});

export async function deleteTasks(manager: EntityManager, taskIds: string[]): Promise<DeletionReport> {
  if (taskIds.length === 0) return empty();
  const report = await deleteCommentsAndAttachments(manager, { taskIds });
  await manager.getRepository(Task).delete(taskIds);
  return merge(report, { ...empty(), tasks: taskIds.length });
}

export async function deleteMilestone(manager: EntityManager, milestoneId: string): Promise<DeletionReport> {
  const tasks = await manager.getRepository(Task).find({ select: { id: true }, where: { milestoneId } });
  const taskReport = await deleteTasks(manager, tasks.map((task) => task.id));
  const ownReport = await deleteCommentsAndAttachments(manager, { milestoneId });
  await manager.getRepository(Milestone).delete(milestoneId);
  return merge(taskReport, ownReport);
}
