import { Module } from '@nestjs/common';
import { BrandDashboardController } from './brand-dashboard.controller';
import { BrandDashboardService } from './brand-dashboard.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BrandDashboardController],
  providers: [BrandDashboardService],
  exports: [BrandDashboardService],
})
export class BrandDashboardModule {}
