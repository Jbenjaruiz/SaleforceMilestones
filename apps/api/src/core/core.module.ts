import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attachment } from '../attachments/attachment.entity';
import { ClockService } from '../common/clock.service';
import { Comment } from '../comments/comment.entity';
import { Milestone } from '../milestones/milestone.entity';
import { ProjectMember } from '../project-members/project-member.entity';
import { Project } from '../projects/project.entity';
import { Task } from '../tasks/task.entity';
import { CoreAccessService } from './core-access.service';

/** Shared pieces of the core modules (projects, milestones, tasks, comments). */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Project, Milestone, Task, Comment, Attachment, ProjectMember])],
  providers: [ClockService, CoreAccessService],
  exports: [ClockService, CoreAccessService, TypeOrmModule],
})
export class CoreModule {}
