import { Body, Controller, Delete, Get, HttpCode, Param, Post, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { uploadOptions } from '../attachments/attachments.controller';
import { ATTACHMENTS_PER_PARENT } from '../attachments/file-rules';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { CurrentUser, RequirePermission } from '../auth/decorators';
import { ParseGuidPipe } from '../common/guid';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/comment.dto';

/**
 * Creating a comment accepts plain JSON, or multipart/form-data with a `body` field and up to
 * 5 files in `files`. Files can only be attached while creating the comment (comments are not edited).
 */
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
  @UseInterceptors(FilesInterceptor('files', ATTACHMENTS_PER_PARENT, uploadOptions))
  createForMilestone(
    @Param('id', ParseGuidPipe) id: string,
    @Body() dto: CreateCommentDto,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.comments.createForMilestone(id, dto.body, files, actor);
  }

  @RequirePermission('read')
  @Get('tasks/:id/comments')
  listForTask(@Param('id', ParseGuidPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.comments.listForTask(id, actor);
  }

  @RequirePermission('create')
  @Post('tasks/:id/comments')
  @UseInterceptors(FilesInterceptor('files', ATTACHMENTS_PER_PARENT, uploadOptions))
  createForTask(
    @Param('id', ParseGuidPipe) id: string,
    @Body() dto: CreateCommentDto,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.comments.createForTask(id, dto.body, files, actor);
  }

  // No @RequirePermission: the service allows only the author or an administrator.
  @HttpCode(204)
  @Delete('comments/:id')
  remove(@Param('id', ParseGuidPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.comments.remove(id, actor);
  }
}
