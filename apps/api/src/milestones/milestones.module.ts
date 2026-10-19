import { Module } from '@nestjs/common';
import { AttachmentsModule } from '../attachments/attachments.module';
import { MilestonesController } from './milestones.controller';
import { MilestonesService } from './milestones.service';

@Module({
  imports: [AttachmentsModule],
  controllers: [MilestonesController],
  providers: [MilestonesService],
})
export class MilestonesModule {}
