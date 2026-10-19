import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { Comment } from '../comments/comment.entity';
import { Milestone } from '../milestones/milestone.entity';
import { Project } from '../projects/project.entity';
import { Task } from '../tasks/task.entity';

/**
 * Loads projects, milestones, tasks and comments while enforcing the archive rules:
 * an archived project is invisible to everyone but administrators, and read-only for them.
 */
@Injectable()
export class CoreAccessService {
  constructor(
    @InjectRepository(Project) private readonly projects: Repository<Project>,
    @InjectRepository(Milestone) private readonly milestones: Repository<Milestone>,
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    @InjectRepository(Comment) private readonly comments: Repository<Comment>,
  ) {}

  async project(id: string, actor: AuthenticatedUser, write = false): Promise<Project> {
    const project = await this.projects.findOne({ where: { id } });
    return this.check(project, actor, write, 'Project not found.');
  }

  async milestone(id: string, actor: AuthenticatedUser, write = false): Promise<Milestone> {
    const milestone = await this.milestones.findOne({ where: { id }, relations: { project: true } });
    this.check(milestone?.project ?? null, actor, write, 'Milestone not found.');
    return milestone as Milestone;
  }

  async task(id: string, actor: AuthenticatedUser, write = false): Promise<Task> {
    const task = await this.tasks.findOne({ where: { id }, relations: { milestone: { project: true } } });
    this.check(task?.milestone.project ?? null, actor, write, 'Task not found.');
    return task as Task;
  }

  async comment(id: string, actor: AuthenticatedUser, write = false): Promise<Comment> {
    const comment = await this.comments.findOne({
      where: { id },
      relations: { milestone: { project: true }, task: { milestone: { project: true } } },
    });
    this.check(comment?.milestone?.project ?? comment?.task?.milestone.project ?? null, actor, write, 'Comment not found.');
    return comment as Comment;
  }

  private check(project: Project | null, actor: AuthenticatedUser, write: boolean, notFound: string): Project {
    if (!project || (project.isArchived && !actor.isAdmin)) throw new NotFoundException(notFound);
    if (write && project.isArchived) {
      throw new BadRequestException('This project is archived. Reactivate it to make changes.');
    }
    return project;
  }
}
