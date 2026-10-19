import { Controller, Get, Header, HttpCode, Param, Post, Query, StreamableFile, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { AdminOnly, CurrentUser } from '../auth/decorators';
import { ParseGuidPipe } from '../common/guid';
import { buildTemplate } from './excel-reader';
import { IMPORT_MAX_BYTES, ImportsService } from './imports.service';

/** Excel imports are an administrator task (F01 §7). */
@AdminOnly()
@Controller()
export class ImportsController {
  constructor(private readonly imports: ImportsService) {}

  @Get('imports/template')
  @Header('Content-Disposition', 'attachment; filename="plantilla-importacion.xlsx"')
  async template() {
    return new StreamableFile(await buildTemplate(), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  /**
   * multipart/form-data with the workbook in `file`. Add `?dryRun=true` to only validate it.
   * Creates milestones and tasks in the given project; it never creates projects or touches existing milestones.
   */
  @HttpCode(200)
  @Post('projects/:projectId/import')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: IMPORT_MAX_BYTES, files: 1 } }))
  import(
    @Param('projectId', ParseGuidPipe) projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('dryRun') dryRun: string | undefined,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.imports.importInto(projectId, file, dryRun === 'true', actor);
  }
}
