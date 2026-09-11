import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import {
  adminReportQuerySchema,
  resolveReportInputSchema,
  uuidSchema,
  type AdminOverviewStats,
  type AdminReportItem,
  type AdminReportListResponse,
  type AdminReportQuery,
  type ResolveReportInput,
} from '@flashcard/contracts';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  getStats(): Promise<AdminOverviewStats> {
    return this.adminService.getStats();
  }

  @Get('reports')
  getReports(
    @Query(new ZodValidationPipe(adminReportQuerySchema)) query: AdminReportQuery,
  ): Promise<AdminReportListResponse> {
    return this.adminService.getReports(query);
  }

  @Patch('reports/:id')
  resolveReport(
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @Body(new ZodValidationPipe(resolveReportInputSchema)) input: ResolveReportInput,
  ): Promise<AdminReportItem> {
    return this.adminService.resolveReport(id, input);
  }
}
