import { Module } from '@nestjs/common';
import { AttachmentStorage } from './attachment-storage';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';

@Module({
  controllers: [AttachmentsController],
  providers: [AttachmentsService, AttachmentStorage],
  exports: [AttachmentsService, AttachmentStorage],
})
export class AttachmentsModule {}
