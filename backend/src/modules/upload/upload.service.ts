import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LocalStorageProvider, StorageProvider, UploadedFile } from './storage.provider';
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

@Injectable()
export class UploadService {
    private readonly storage: StorageProvider;

    constructor(private readonly prisma: PrismaService) {
        // Use LocalStorage by default, can switch to S3 via env
        this.storage = new LocalStorageProvider();
    }

    async uploadOrderAttachment(
        orderId: string,
        file: UploadedFile,
        userId: string,
    ) {
        // Validate file
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            throw new BadRequestException(
                `Tipo de arquivo não permitido. Permitidos: ${ALLOWED_MIME_TYPES.join(', ')}`,
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
            files.map(file => this.uploadOrderAttachment(orderId, file, userId)),
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
}
