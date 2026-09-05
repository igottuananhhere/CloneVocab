import { Body, Controller, Param, Post } from '@nestjs/common';
import {
  createReportSchema,
  uuidSchema,
  type CreateReportInput,
  type ReportSummary,
} from '@flashcard/contracts';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { ReportsService } from './reports.service';

@Controller('study-sets')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Public()
  @Post(':id/reports')
  createReport(
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @Body(new ZodValidationPipe(createReportSchema)) input: CreateReportInput,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ReportSummary> {
    return this.reports.createReport(id, input, user);
  }
}
