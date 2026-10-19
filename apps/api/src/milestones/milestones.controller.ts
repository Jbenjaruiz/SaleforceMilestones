import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { CurrentUser, RequirePermission } from '../auth/decorators';
import { ParseGuidPipe } from '../common/guid';
import { CreateMilestoneDto, UpdateMilestoneDto } from './dto/milestone.dto';
import { MilestonesService } from './milestones.service';

@Controller()
export class MilestonesController {
  constructor(private readonly milestones: MilestonesService) {}

  @RequirePermission('create')
  @Post('projects/:projectId/milestones')
  create(@Param('projectId', ParseGuidPipe) projectId: string, @Body() dto: CreateMilestoneDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.milestones.create(projectId, dto, actor);
  }

  @RequirePermission('read')
  @Get('milestones/:id')
  get(@Param('id', ParseGuidPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.milestones.get(id, actor);
  }

  @RequirePermission('update')
  @Patch('milestones/:id')
  update(@Param('id', ParseGuidPipe) id: string, @Body() dto: UpdateMilestoneDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.milestones.update(id, dto, actor);
  }

  @RequirePermission('delete')
  @HttpCode(204)
  @Delete('milestones/:id')
  remove(@Param('id', ParseGuidPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.milestones.remove(id, actor);
  }
}
