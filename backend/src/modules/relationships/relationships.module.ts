import { Module } from '@nestjs/common';
import { RelationshipsService } from './relationships.service';
import { RelationshipsController } from './relationships.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { ContractsModule } from '../contracts/contracts.module';

@Module({
  imports: [PrismaModule, ContractsModule],
  controllers: [RelationshipsController],
  providers: [RelationshipsService],
  exports: [RelationshipsService],
})
export class RelationshipsModule {}
