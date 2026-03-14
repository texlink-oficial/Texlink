import { Module } from '@nestjs/common';
import { SupplierDocumentsController } from './supplier-documents.controller';
import { SupplierDocumentsService } from './supplier-documents.service';
import { DocumentAnalyzerService } from './document-analyzer.service';

@Module({
  controllers: [SupplierDocumentsController],
  providers: [SupplierDocumentsService, DocumentAnalyzerService],
  exports: [SupplierDocumentsService],
})
export class SupplierDocumentsModule {}
