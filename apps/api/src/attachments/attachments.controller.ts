import { Controller, Delete, Get, Header, HttpCode, Param, Post, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { CurrentUser } from '../auth/decorators';
import { ParseGuidPipe } from '../common/guid';
import { AttachmentsService } from './attachments.service';
import { ATTACHMENT_MAX_BYTES, ATTACHMENTS_PER_PARENT } from './file-rules';

/** Multer limits, applied before anything is read into memory beyond the cap. */
export const uploadOptions = { limits: { fileSize: ATTACHMENT_MAX_BYTES, files: ATTACHMENTS_PER_PARENT } };

@Controller()
export class AttachmentsController {
  constructor(private readonly attachments: AttachmentsService) {}

  @Get('tasks/:id/attachments')
  list(@Param('id', ParseGuidPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.attachments.listForTask(id, actor);
  }

  /** multipart/form-data with up to 5 files in the `files` field. */
  @Post('tasks/:id/attachments')
  @UseInterceptors(FilesInterceptor('files', ATTACHMENTS_PER_PARENT, uploadOptions))
  upload(@Param('id', ParseGuidPipe) id: string, @UploadedFiles() files: Express.Multer.File[], @CurrentUser() actor: AuthenticatedUser) {
    return this.attachments.uploadToTask(id, files, actor);
  }

  // The bytes are only sent with a valid session, and the browser may not guess another type or run them.
  @Get('attachments/:id/download')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Content-Security-Policy', "default-src 'none'; sandbox")
  @Header('Cache-Control', 'private, no-store')
  download(@Param('id', ParseGuidPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.attachments.download(id, actor);
  }

  // The service allows only whoever uploaded it or an administrator.
  @HttpCode(204)
  @Delete('attachments/:id')
  remove(@Param('id', ParseGuidPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.attachments.remove(id, actor);
  }
}
