import { Controller, Get, Query, Param, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { RejectionReportFiltersDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.BRAND)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Get the brand ID for the current user
   */
  private async getBrandId(userId: string): Promise<string> {
    const companyUser = await this.prisma.companyUser.findFirst({
      where: { userId },
      select: { companyId: true },
    });

    if (!companyUser) {
      throw new Error('User is not associated with any company');
    }

    return companyUser.companyId;
  }

  /**
   * GET /reports/rejections
   * Returns rejection summary KPIs
   */
  @Get('rejections')
  async getSummary(
    @CurrentUser('id') userId: string,
    @Query() filters: RejectionReportFiltersDto,
  ) {
    const brandId = await this.getBrandId(userId);
    return this.reportsService.getSummary(brandId, filters);
  }

  /**
   * GET /reports/rejections/by-supplier
   * Returns rejections grouped by supplier
   */
  @Get('rejections/by-supplier')
  async getBySupplier(
    @CurrentUser('id') userId: string,
    @Query() filters: RejectionReportFiltersDto,
  ) {
    const brandId = await this.getBrandId(userId);
    return this.reportsService.getBySupplier(brandId, filters);
  }

  /**
   * GET /reports/rejections/by-reason
   * Returns rejections grouped by reason category
   */
  @Get('rejections/by-reason')
  async getByReason(
    @CurrentUser('id') userId: string,
    @Query() filters: RejectionReportFiltersDto,
  ) {
    const brandId = await this.getBrandId(userId);
    return this.reportsService.getByReason(brandId, filters);
  }

  /**
   * GET /reports/rejections/trend
   * Returns rejection trend over time
   */
  @Get('rejections/trend')
  async getTrend(
    @CurrentUser('id') userId: string,
    @Query() filters: RejectionReportFiltersDto,
  ) {
    const brandId = await this.getBrandId(userId);
    return this.reportsService.getTrend(brandId, filters);
  }

  /**
   * GET /reports/rejections/details/:supplierId
   * Returns detailed rejection list for a supplier
   */
  @Get('rejections/details/:supplierId')
  async getDetails(
    @CurrentUser('id') userId: string,
    @Param('supplierId') supplierId: string,
    @Query() filters: RejectionReportFiltersDto,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const brandId = await this.getBrandId(userId);
    return this.reportsService.getDetails(
      brandId,
      supplierId,
      filters,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    );
  }

  /**
   * GET /reports/rejections/export
   * Export rejection data to CSV
   */
  @Get('rejections/export')
  async exportReport(
    @CurrentUser('id') userId: string,
    @Query() filters: RejectionReportFiltersDto,
    @Query('format') format: string = 'csv',
    @Res() res: Response,
  ) {
    const brandId = await this.getBrandId(userId);
    const csv = await this.reportsService.exportToCsv(brandId, filters);

    const filename = `relatorio-rejeicoes-${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\ufeff' + csv); // BOM for Excel UTF-8 compatibility
  }
}
