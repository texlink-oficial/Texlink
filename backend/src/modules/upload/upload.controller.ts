import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Req,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UploadService } from './upload.service';

@ApiTags('Upload')
@ApiBearerAuth()
@Controller('orders/:orderId/attachments')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('files', 5)) // Max 5 files
  async uploadFiles(
    @Param('orderId') orderId: string,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({
            fileType: /^(image\/(jpeg|png|gif|webp)|application\/pdf|application\/(vnd\.openxmlformats|vnd\.ms-excel|msword))/,
          }),
        ],
        fileIsRequired: true,
      }),
    )
    files: Express.Multer.File[],
    @Req() req: any,
  ) {
    const mappedFiles = files.map((f) => ({
      fieldname: f.fieldname,
      originalname: f.originalname,
      encoding: f.encoding,
      mimetype: f.mimetype,
      buffer: f.buffer,
      size: f.size,
    }));

    return this.uploadService.uploadMultipleAttachments(
      orderId,
      mappedFiles,
      req.user.id,
    );
  }

  @Get()
  async getAttachments(@Param('orderId') orderId: string) {
    return this.uploadService.getOrderAttachments(orderId);
  }

  @Delete(':attachmentId')
  async deleteAttachment(
    @Param('attachmentId') attachmentId: string,
    @Req() req: any,
  ) {
    return this.uploadService.deleteAttachment(attachmentId, req.user.id);
  }

  @Post(':attachmentId/download')
  async trackDownload(@Param('attachmentId') attachmentId: string) {
    await this.uploadService.incrementDownloadCount(attachmentId);
    return { success: true };
  }

  @Get(':attachmentId/download-url')
  async getDownloadUrl(@Param('attachmentId') attachmentId: string) {
    return this.uploadService.getAttachmentDownloadUrl(attachmentId);
  }
}
