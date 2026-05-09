import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthRequest } from '../common/types/auth.types';
import { DashboardService } from './dashboard.service';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboard: DashboardService) {}

  @Get('all')
  getAll(
    @Req() req: AuthRequest,
    @Query('chartMonths') chartMonths?: string,
    @Query('categoryMonths') categoryMonths?: string,
  ) {
    const cm = Math.min(Math.max(parseInt(chartMonths ?? '6', 10) || 6, 1), 24);
    const catm = parseInt(categoryMonths ?? '6', 10);
    return this.dashboard.getAll(req.user.id, cm, isNaN(catm) ? 6 : catm);
  }

  @Get('summary')
  getSummary(@Req() req: AuthRequest) {
    return this.dashboard.getSummary(req.user.id);
  }

  @Get('chart')
  getChart(@Req() req: AuthRequest, @Query('months') months?: string) {
    const m = Math.min(Math.max(parseInt(months ?? '6', 10) || 6, 1), 24);
    return this.dashboard.getMonthlyChart(req.user.id, m);
  }

  @Get('categories')
  getCategories(@Req() req: AuthRequest, @Query('months') months?: string) {
    const m = parseInt(months ?? '0', 10);
    return this.dashboard.getExpensesByCategory(req.user.id, isNaN(m) ? 0 : m);
  }

  @Get('report')
  getReport(@Req() req: AuthRequest, @Query('period') period?: string) {
    return this.dashboard.getReport(req.user.id, period ?? 'month');
  }
}
