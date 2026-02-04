import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { BrandDashboardService } from './brand-dashboard.service';
import { DashboardFiltersDto, SupplierRankingFiltersDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('dashboard/brand')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.BRAND)
export class BrandDashboardController {
  constructor(
    private readonly brandDashboardService: BrandDashboardService,
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
   * GET /dashboard/brand/summary
   * Returns consolidated KPIs (orders, deadline, quality, cost)
   */
  @Get('summary')
  async getSummary(
    @CurrentUser('id') userId: string,
    @Query() filters: DashboardFiltersDto,
  ) {
    const brandId = await this.getBrandId(userId);
    return this.brandDashboardService.getSummary(brandId, filters);
  }

  /**
   * GET /dashboard/brand/suppliers-ranking
   * Returns supplier ranking with metrics
   */
  @Get('suppliers-ranking')
  async getSuppliersRanking(
    @CurrentUser('id') userId: string,
    @Query() filters: SupplierRankingFiltersDto,
  ) {
    const brandId = await this.getBrandId(userId);
    return this.brandDashboardService.getSuppliersRanking(brandId, filters);
  }

  /**
   * GET /dashboard/brand/timeline
   * Returns data for charts (temporal evolution)
   */
  @Get('timeline')
  async getTimeline(
    @CurrentUser('id') userId: string,
    @Query() filters: DashboardFiltersDto,
  ) {
    const brandId = await this.getBrandId(userId);
    return this.brandDashboardService.getTimelineData(brandId, filters);
  }

  /**
   * GET /dashboard/brand/alerts
   * Returns active alerts (deadlines, quality, costs)
   */
  @Get('alerts')
  async getAlerts(
    @CurrentUser('id') userId: string,
    @Query() filters: DashboardFiltersDto,
  ) {
    const brandId = await this.getBrandId(userId);
    return this.brandDashboardService.getAlerts(brandId, filters);
  }
}
