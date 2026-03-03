import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateEducationalContentDto,
  UpdateEducationalContentDto,
} from './dto';
import {
  EducationalContentType,
  EducationalContentCategory,
} from '@prisma/client';
import type { StorageProvider } from '../upload/storage.provider';
import { UploadedFile, STORAGE_PROVIDER } from '../upload/storage.provider';

const ALLOWED_VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200MB
const MAX_THUMBNAIL_SIZE = 5 * 1024 * 1024; // 5MB

@Injectable()
export class EducationalContentService {
  private readonly logger = new Logger(EducationalContentService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  // ========== FILE UPLOAD ==========

  async uploadVideo(file: UploadedFile) {
    if (!ALLOWED_VIDEO_MIMES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Formato de vídeo não suportado. Use MP4, WebM ou MOV.',
      );
    }

    if (file.size > MAX_VIDEO_SIZE) {
      throw new BadRequestException(
        `Vídeo excede o tamanho máximo de ${MAX_VIDEO_SIZE / (1024 * 1024)}MB.`,
      );
    }

    const result = await this.storage.upload(file, 'educational-content/videos');
    this.logger.log(`Video uploaded: ${result.key}`);
    return result;
  }

  async uploadThumbnail(file: UploadedFile) {
    if (!ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Formato de imagem não suportado. Use JPEG, PNG ou WebP.',
      );
    }

    if (file.size > MAX_THUMBNAIL_SIZE) {
      throw new BadRequestException(
        `Thumbnail excede o tamanho máximo de ${MAX_THUMBNAIL_SIZE / (1024 * 1024)}MB.`,
      );
    }

    const result = await this.storage.upload(
      file,
      'educational-content/thumbnails',
    );
    this.logger.log(`Thumbnail uploaded: ${result.key}`);
    return result;
  }

  async getVideoUrl(id: string): Promise<{ url: string; isExternal: boolean }> {
    const content = await this.prisma.educationalContent.findFirst({
      where: { id, isActive: true },
    });

    if (!content) {
      throw new NotFoundException('Conteúdo educativo não encontrado');
    }

    if (this.isExternalUrl(content.contentUrl)) {
      return { url: content.contentUrl, isExternal: true };
    }

    if (this.storage.resolveUrl) {
      const presignedUrl = await this.storage.resolveUrl(
        content.contentUrl,
        3600,
      );
      return { url: presignedUrl || content.contentUrl, isExternal: false };
    }

    return { url: content.contentUrl, isExternal: false };
  }

  private isExternalUrl(url: string): boolean {
    return /youtube\.com|youtu\.be|vimeo\.com/.test(url);
  }

  private async resolveUrls<
    T extends { contentUrl: string; thumbnailUrl: string | null },
  >(contents: T[]): Promise<T[]> {
    if (!this.storage.resolveUrl) return contents;

    return Promise.all(
      contents.map(async (content) => ({
        ...content,
        thumbnailUrl: content.thumbnailUrl
          ? await this.storage.resolveUrl!(content.thumbnailUrl, 3600)
          : null,
      })),
    );
  }

  private async deleteStorageFile(url: string | null | undefined) {
    if (!url || this.isExternalUrl(url)) return;

    try {
      // Extract key from URL pattern
      const s3Match = url.match(
        /^https?:\/\/[^/]+\.s3\.[^/]+\.amazonaws\.com\/(.+)$/,
      );
      const localMatch = url.match(/\/uploads\/(.+)$/);
      const key = s3Match?.[1] || localMatch?.[1];

      if (key) {
        await this.storage.delete(key);
        this.logger.log(`Deleted storage file: ${key}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to delete storage file: ${error.message}`);
    }
  }

  // ========== PUBLIC ENDPOINTS ==========

  async findAllActive(
    category?: EducationalContentCategory,
    contentType?: EducationalContentType,
  ) {
    const contents = await this.prisma.educationalContent.findMany({
      where: {
        isActive: true,
        ...(category && { category }),
        ...(contentType && { contentType }),
      },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    });

    return this.resolveUrls(contents);
  }

  async findOnePublic(id: string) {
    const content = await this.prisma.educationalContent.findFirst({
      where: { id, isActive: true },
    });

    if (!content) {
      throw new NotFoundException('Conteúdo educativo não encontrado');
    }

    return content;
  }

  async getCategories() {
    const categories = await this.prisma.educationalContent.groupBy({
      by: ['category'],
      where: { isActive: true },
      _count: { id: true },
    });

    return categories.map((c) => ({
      category: c.category,
      count: c._count.id,
    }));
  }

  // ========== ADMIN ENDPOINTS ==========

  async findAll(
    category?: EducationalContentCategory,
    contentType?: EducationalContentType,
    isActive?: boolean,
  ) {
    const contents = await this.prisma.educationalContent.findMany({
      where: {
        ...(category && { category }),
        ...(contentType && { contentType }),
        ...(isActive !== undefined && { isActive }),
      },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    });

    return this.resolveUrls(contents);
  }

  async findOne(id: string) {
    const content = await this.prisma.educationalContent.findUnique({
      where: { id },
    });

    if (!content) {
      throw new NotFoundException('Conteúdo educativo não encontrado');
    }

    return content;
  }

  async create(dto: CreateEducationalContentDto) {
    return this.prisma.educationalContent.create({
      data: dto,
    });
  }

  async update(id: string, dto: UpdateEducationalContentDto) {
    const content = await this.prisma.educationalContent.findUnique({
      where: { id },
    });

    if (!content) {
      throw new NotFoundException('Conteúdo educativo não encontrado');
    }

    // Clean up old files if URLs are being replaced
    if (dto.contentUrl && dto.contentUrl !== content.contentUrl) {
      await this.deleteStorageFile(content.contentUrl);
    }
    if (
      dto.thumbnailUrl !== undefined &&
      dto.thumbnailUrl !== content.thumbnailUrl
    ) {
      await this.deleteStorageFile(content.thumbnailUrl);
    }

    return this.prisma.educationalContent.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    const content = await this.prisma.educationalContent.findUnique({
      where: { id },
    });

    if (!content) {
      throw new NotFoundException('Conteúdo educativo não encontrado');
    }

    // Delete uploaded files from storage
    await this.deleteStorageFile(content.contentUrl);
    await this.deleteStorageFile(content.thumbnailUrl);

    await this.prisma.educationalContent.delete({
      where: { id },
    });

    return { success: true };
  }

  async toggleActive(id: string) {
    const content = await this.prisma.educationalContent.findUnique({
      where: { id },
    });

    if (!content) {
      throw new NotFoundException('Conteúdo educativo não encontrado');
    }

    return this.prisma.educationalContent.update({
      where: { id },
      data: { isActive: !content.isActive },
    });
  }

  async updateOrder(items: { id: string; displayOrder: number }[]) {
    const updates = items.map((item) =>
      this.prisma.educationalContent.update({
        where: { id: item.id },
        data: { displayOrder: item.displayOrder },
      }),
    );

    await this.prisma.$transaction(updates);

    return { success: true };
  }
}
