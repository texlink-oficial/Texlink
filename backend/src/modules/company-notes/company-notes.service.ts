import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { StorageProvider } from '../upload/storage.provider';
import { UploadedFile, STORAGE_PROVIDER } from '../upload/storage.provider';
import { CreateCompanyNoteDto } from './dto/create-company-note.dto';
import { QueryNotesDto } from './dto/query-notes.dto';
import { UserRole, NotificationType, NotificationPriority } from '@prisma/client';

@Injectable()
export class CompanyNotesService {
  private readonly logger = new Logger(CompanyNotesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async create(
    companyId: string,
    authorId: string,
    dto: CreateCompanyNoteDto,
    files?: UploadedFile[],
  ) {
    // Verify the company exists
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, tradeName: true },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    // Create note
    const note = await this.prisma.companyNote.create({
      data: {
        companyId,
        authorId,
        content: dto.content,
        category: dto.category || 'GERAL',
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });

    // Upload attachments if provided
    let attachments: any[] = [];
    if (files && files.length > 0) {
      const uploadPromises = files.map(async (file) => {
        const folder = `company-notes/${companyId}/${note.id}`;
        const { url, key } = await this.storage.upload(file, folder);

        return this.prisma.companyNoteAttachment.create({
          data: {
            noteId: note.id,
            fileName: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype,
            filePath: key,
          },
        });
      });

      attachments = await Promise.all(uploadPromises);
    }

    // If category is ALERTA, notify all other ADMIN users
    if (dto.category === 'ALERTA') {
      await this.notifyAdminUsers(companyId, authorId, note.id, company.tradeName || 'Empresa');
    }

    return {
      ...note,
      attachments,
    };
  }

  async findAll(companyId: string, query: QueryNotesDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      companyId,
      deletedAt: null,
    };

    if (query.category) {
      where.category = query.category;
    }

    if (query.search) {
      where.content = {
        contains: query.search,
        mode: 'insensitive',
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.companyNote.findMany({
        where,
        include: {
          author: { select: { id: true, name: true, email: true } },
          attachments: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.companyNote.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async remove(companyId: string, noteId: string, userId: string) {
    const note = await this.prisma.companyNote.findFirst({
      where: { id: noteId, companyId, deletedAt: null },
    });

    if (!note) {
      throw new NotFoundException('Nota não encontrada');
    }

    await this.prisma.companyNote.update({
      where: { id: noteId },
      data: {
        deletedAt: new Date(),
        deletedById: userId,
      },
    });

    return { success: true, message: 'Nota removida com sucesso' };
  }

  async downloadAttachment(
    companyId: string,
    noteId: string,
    attachmentId: string,
  ) {
    const attachment = await this.prisma.companyNoteAttachment.findFirst({
      where: { id: attachmentId, noteId },
      include: {
        note: { select: { companyId: true, deletedAt: true } },
      },
    });

    if (!attachment || attachment.note.companyId !== companyId || attachment.note.deletedAt) {
      throw new NotFoundException('Anexo não encontrado');
    }

    // Generate presigned URL if storage supports it, otherwise return direct URL
    if (this.storage.getPresignedUrl) {
      const url = await this.storage.getPresignedUrl(attachment.filePath, 3600);
      return {
        url,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        expiresIn: 3600,
      };
    }

    return {
      url: this.storage.getUrl(attachment.filePath),
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      expiresIn: null,
    };
  }

  private async notifyAdminUsers(
    companyId: string,
    authorId: string,
    noteId: string,
    companyName: string,
  ) {
    try {
      // Find all ADMIN users except the author
      const adminUsers = await this.prisma.user.findMany({
        where: {
          role: UserRole.ADMIN,
          isActive: true,
          id: { not: authorId },
        },
        select: { id: true },
      });

      if (adminUsers.length === 0) return;

      // Create notifications for each admin
      const notifications = adminUsers.map((user) =>
        this.prisma.notification.create({
          data: {
            recipientId: user.id,
            companyId,
            type: NotificationType.COMPANY_NOTE_ALERT,
            priority: NotificationPriority.HIGH,
            title: 'Alerta de Nota na Empresa',
            body: `Uma nota de alerta foi adicionada ao histórico de ${companyName}`,
            data: { noteId, companyId },
            actionUrl: `/admin/companies/${companyId}`,
            entityType: 'company_note',
            entityId: noteId,
          },
        }),
      );

      await Promise.all(notifications);
    } catch (error) {
      this.logger.error(`Failed to notify admin users about alert note: ${error.message}`);
    }
  }
}
