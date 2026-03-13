import { Module } from '@nestjs/common';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { SuppliersModule } from '../suppliers/suppliers.module';

@Module({
  imports: [PrismaModule, SuppliersModule],
  controllers: [PortalController],
  providers: [PortalService],
  exports: [PortalService],
})
export class PortalModule {}
