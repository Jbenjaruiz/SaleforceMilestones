import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { CurrentUser, RequirePermission } from '../auth/decorators';
import { ParseGuidPipe } from '../common/guid';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/comment.dto';

@Controller()
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @RequirePermission('read')
  @Get('milestones/:id/comments')
  listForMilestone(@Param('id', ParseGuidPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.comments.listForMilestone(id, actor);
  }

  @RequirePermission('create')
  @Post('milestones/:id/comments')
  createForMilestone(@Param('id', ParseGuidPipe) id: string, @Body() dto: CreateCommentDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.comments.createForMilestone(id, dto.body, actor);
  }

  @RequirePermission('read')
  @Get('tasks/:id/comments')
  listForTask(@Param('id', ParseGuidPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.comments.listForTask(id, actor);
  }

  @RequirePermission('create')
  @Post('tasks/:id/comments')
  createForTask(@Param('id', ParseGuidPipe) id: string, @Body() dto: CreateCommentDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.comments.createForTask(id, dto.body, actor);
  }

  // No @RequirePermission: the service allows only the author or an administrator.
  @HttpCode(204)
  @Delete('comments/:id')
  remove(@Param('id', ParseGuidPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.comments.remove(id, actor);
  }
}
