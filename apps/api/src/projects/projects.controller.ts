import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { AdminOnly, CurrentUser } from '../auth/decorators';
import { ParseGuidPipe } from '../common/guid';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  /** Feeds the project selector. `?includeArchived=true` only has effect for administrators. */
  @Get()
  list(@CurrentUser() actor: AuthenticatedUser, @Query('includeArchived') includeArchived?: string) {
    return this.projects.list(actor, includeArchived === 'true');
  }

  @Get(':id')
  get(@Param('id', ParseGuidPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.projects.get(id, actor);
  }

  /** Everything the dashboard shows for one project: summary, milestones, tasks and alerts. */
  @Get(':id/dashboard')
  dashboard(@Param('id', ParseGuidPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.projects.dashboard(id, actor);
  }

  @AdminOnly()
  @Post()
  create(@Body() dto: CreateProjectDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.projects.create(dto, actor);
  }

  @AdminOnly()
  @Patch(':id')
  update(@Param('id', ParseGuidPipe) id: string, @Body() dto: UpdateProjectDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.projects.update(id, dto, actor);
  }

  @AdminOnly()
  @Post(':id/archive')
  archive(@Param('id', ParseGuidPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.projects.setArchived(id, true, actor);
  }

  @AdminOnly()
  @Post(':id/unarchive')
  unarchive(@Param('id', ParseGuidPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.projects.setArchived(id, false, actor);
  }
}
