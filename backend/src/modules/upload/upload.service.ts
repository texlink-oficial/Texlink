import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { StorageProvider } from './storage.provider';
import { UploadedFile, STORAGE_PROVIDER } from './storage.provider';
import { AttachmentType } from '@prisma/client';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'video/mp4',
  'video/webm',
  'video/quicktime', // .mov
];

const MAX_IMAGE_PDF_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

const getMaxFileSize = (mimetype: string): number => {
  return mimetype.startsWith('video/') ? MAX_VIDEO_SIZE : MAX_IMAGE_PDF_SIZE;
};

// Magic byte signatures for file type validation
const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  'video/mp4': [
    [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], // ftyp at offset 4
    [0x00, 0x00, 0x00, 0x1c, 0x66, 0x74, 0x79, 0x70],
    [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70],
  ],
  'video/webm': [[0x1a, 0x45, 0xdf, 0xa3]], // EBML header
  'video/quicktime': [
    [0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70],
    [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70],
    [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70],
  ],
};

const validateMagicBytes = (buffer: Buffer, mimetype: string): boolean => {
  const signatures = MAGIC_BYTES[mimetype];
  if (!signatures) return true; // No signature to check, allow
  return signatures.some((sig) =>
    sig.every((byte, i) => buffer.length > i && buffer[i] === byte),
  );
};

@Injectable()
export class UploadService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async uploadOrderAttachment(
    orderId: string,
    file: UploadedFile,
    userId: string,
  ) {
    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de arquivo não permitido. Permitidos: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    // Validate magic bytes to prevent MIME type spoofing
    if (!validateMagicBytes(file.buffer, file.mimetype)) {
      throw new BadRequestException(
        'O conteúdo do arquivo não corresponde ao tipo declarado',
      );
    }

    const maxSize = getMaxFileSize(file.mimetype);
    if (file.size > maxSize) {
      throw new BadRequestException(
        `Arquivo muito grande. Máximo: ${maxSize / (1024 * 1024)}MB`,
      );
    }

    // Check order exists and user has access
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { brand: true, supplier: true },
    });

    if (!order) {
      throw new NotFoundException('Pedido não encontrado');
    }

    // Determine attachment type
    let type: AttachmentType;
    if (file.mimetype === 'application/pdf') {
      type = AttachmentType.TECH_SHEET;
    } else if (file.mimetype.startsWith('video/')) {
      type = AttachmentType.VIDEO;
    } else {
      type = AttachmentType.IMAGE;
    }

    // Upload to storage
    const { url, key } = await this.storage.upload(file, `orders/${orderId}`);

    // Create attachment record
    const attachment = await this.prisma.orderAttachment.create({
      data: {
        orderId,
        type,
        name: file.originalname,
        url,
        mimeType: file.mimetype,
        size: file.size,
      },
    });

    return attachment;
  }

  async uploadMultipleAttachments(
    orderId: string,
    files: UploadedFile[],
    userId: string,
  ) {
    const results = await Promise.all(
      files.map((file) => this.uploadOrderAttachment(orderId, file, userId)),
    );
    return results;
  }

  async getOrderAttachments(orderId: string) {
    return this.prisma.orderAttachment.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteAttachment(attachmentId: string, userId: string) {
    const attachment = await this.prisma.orderAttachment.findUnique({
      where: { id: attachmentId },
      include: { order: true },
    });

    if (!attachment) {
      throw new NotFoundException('Anexo não encontrado');
    }

    // Delete from storage (extract key from URL)
    const key = attachment.url.split('/uploads/')[1];
    if (key) {
      await this.storage.delete(key);
    }

    // Delete record
    await this.prisma.orderAttachment.delete({
      where: { id: attachmentId },
    });

    return { success: true };
  }

  async incrementDownloadCount(attachmentId: string) {
    await this.prisma.orderAttachment.update({
      where: { id: attachmentId },
      data: { downloadCount: { increment: 1 } },
    });
  }

  async getAttachmentDownloadUrl(attachmentId: string) {
    const attachment = await this.prisma.orderAttachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      throw new NotFoundException('Anexo não encontrado');
    }

    // Increment download count
    await this.prisma.orderAttachment.update({
      where: { id: attachmentId },
      data: { downloadCount: { increment: 1 } },
    });

    // Generate presigned URL if storage supports it
    const key = this.extractKeyFromUrl(attachment.url);
    if (key && this.storage.getPresignedUrl) {
      const url = await this.storage.getPresignedUrl(key, 3600);
      return {
        url,
        fileName: attachment.name,
        mimeType: attachment.mimeType,
        expiresIn: 3600,
      };
    }

    // Fallback to direct URL (local storage)
    return {
      url: attachment.url,
      fileName: attachment.name,
      mimeType: attachment.mimeType,
      expiresIn: null,
    };
  }

  private extractKeyFromUrl(url: string): string | null {
    // Local: http://localhost:3000/uploads/orders/uuid/file.ext
    const localMatch = url.match(/\/uploads\/(.+)$/);
    if (localMatch) return localMatch[1];

    // S3/CDN: https://bucket.s3.region.amazonaws.com/orders/uuid/file.ext
    const httpsMatch = url.match(/^https?:\/\/[^/]+\/(.+)$/);
    if (httpsMatch) return httpsMatch[1];

    return null;
  }
}
