import { Module } from '@nestjs/common';
import { StudyController, StudyStatsController } from './study.controller';
import { StudyService } from './study.service';

@Module({
  controllers: [StudyController, StudyStatsController],
  providers: [StudyService],
  exports: [StudyService],
})
export class StudyModule {}
