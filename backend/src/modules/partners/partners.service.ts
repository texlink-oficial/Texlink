import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePartnerDto, UpdatePartnerDto } from './dto';
import { PartnerCategory } from '@prisma/client';

@Injectable()
export class PartnersService {
    constructor(private readonly prisma: PrismaService) {}

    // ========== PUBLIC ENDPOINTS ==========

    // List active partners (for suppliers)
    async findAllActive(category?: PartnerCategory) {
        return this.prisma.partner.findMany({
            where: {
                isActive: true,
                ...(category && { category }),
            },
            orderBy: [
                { displayOrder: 'asc' },
                { name: 'asc' },
            ],
        });
    }

    // Get partner by ID (public)
    async findOnePublic(id: string) {
        const partner = await this.prisma.partner.findFirst({
            where: { id, isActive: true },
        });

        if (!partner) {
            throw new NotFoundException('Partner not found');
        }

        return partner;
    }

    // Get all categories with partner count
    async getCategories() {
        const categories = await this.prisma.partner.groupBy({
            by: ['category'],
            where: { isActive: true },
            _count: { id: true },
        });

        return categories.map(c => ({
            category: c.category,
            count: c._count.id,
        }));
    }

    // ========== ADMIN ENDPOINTS ==========

    // List all partners (admin)
    async findAll(category?: PartnerCategory, isActive?: boolean) {
        return this.prisma.partner.findMany({
            where: {
                ...(category && { category }),
                ...(isActive !== undefined && { isActive }),
            },
            orderBy: [
                { displayOrder: 'asc' },
                { name: 'asc' },
            ],
        });
    }

    // Get partner by ID (admin)
    async findOne(id: string) {
        const partner = await this.prisma.partner.findUnique({
            where: { id },
        });

        if (!partner) {
            throw new NotFoundException('Partner not found');
        }

        return partner;
    }

    // Create partner
    async create(dto: CreatePartnerDto) {
        return this.prisma.partner.create({
            data: dto,
        });
    }

    // Update partner
    async update(id: string, dto: UpdatePartnerDto) {
        const partner = await this.prisma.partner.findUnique({
            where: { id },
        });

        if (!partner) {
            throw new NotFoundException('Partner not found');
        }

        return this.prisma.partner.update({
            where: { id },
            data: dto,
        });
    }

    // Delete partner
    async remove(id: string) {
        const partner = await this.prisma.partner.findUnique({
            where: { id },
        });

        if (!partner) {
            throw new NotFoundException('Partner not found');
        }

        await this.prisma.partner.delete({
            where: { id },
        });

        return { success: true };
    }

    // Toggle active status
    async toggleActive(id: string) {
        const partner = await this.prisma.partner.findUnique({
            where: { id },
        });

        if (!partner) {
            throw new NotFoundException('Partner not found');
        }

        return this.prisma.partner.update({
            where: { id },
            data: { isActive: !partner.isActive },
        });
    }

    // Update display order for multiple partners
    async updateOrder(items: { id: string; displayOrder: number }[]) {
        const updates = items.map(item =>
            this.prisma.partner.update({
                where: { id: item.id },
                data: { displayOrder: item.displayOrder },
            })
        );

        await this.prisma.$transaction(updates);

        return { success: true };
    }
}
