import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateEducationalContentDto,
  UpdateEducationalContentDto,
} from './dto';
import {
  EducationalContentType,
  EducationalContentCategory,
} from '@prisma/client';

@Injectable()
export class EducationalContentService {
  constructor(private readonly prisma: PrismaService) {}

  // ========== PUBLIC ENDPOINTS ==========

  // List active educational contents (for suppliers)
  async findAllActive(
    category?: EducationalContentCategory,
    contentType?: EducationalContentType,
  ) {
    return this.prisma.educationalContent.findMany({
      where: {
        isActive: true,
        ...(category && { category }),
        ...(contentType && { contentType }),
      },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  // Get content by ID (public)
  async findOnePublic(id: string) {
    const content = await this.prisma.educationalContent.findFirst({
      where: { id, isActive: true },
    });

    if (!content) {
      throw new NotFoundException('Conteúdo educativo não encontrado');
    }

    return content;
  }

  // Get all categories with content count
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

  // List all educational contents (admin)
  async findAll(
    category?: EducationalContentCategory,
    contentType?: EducationalContentType,
    isActive?: boolean,
  ) {
    return this.prisma.educationalContent.findMany({
      where: {
        ...(category && { category }),
        ...(contentType && { contentType }),
        ...(isActive !== undefined && { isActive }),
      },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  // Get content by ID (admin)
  async findOne(id: string) {
    const content = await this.prisma.educationalContent.findUnique({
      where: { id },
    });

    if (!content) {
      throw new NotFoundException('Conteúdo educativo não encontrado');
    }

    return content;
  }

  // Create educational content
  async create(dto: CreateEducationalContentDto) {
    return this.prisma.educationalContent.create({
      data: dto,
    });
  }

  // Update educational content
  async update(id: string, dto: UpdateEducationalContentDto) {
    const content = await this.prisma.educationalContent.findUnique({
      where: { id },
    });

    if (!content) {
      throw new NotFoundException('Conteúdo educativo não encontrado');
    }

    return this.prisma.educationalContent.update({
      where: { id },
      data: dto,
    });
  }

  // Delete educational content
  async remove(id: string) {
    const content = await this.prisma.educationalContent.findUnique({
      where: { id },
    });

    if (!content) {
      throw new NotFoundException('Conteúdo educativo não encontrado');
    }

    await this.prisma.educationalContent.delete({
      where: { id },
    });

    return { success: true };
  }

  // Toggle active status
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

  // Update display order for multiple contents
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
