import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { CapacityReportsService } from './capacity-reports.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ReportsController],
  providers: [ReportsService, CapacityReportsService],
  exports: [ReportsService, CapacityReportsService],
})
export class ReportsModule {}
