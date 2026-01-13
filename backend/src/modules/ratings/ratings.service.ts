import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRatingDto } from './dto';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class RatingsService {
    constructor(private prisma: PrismaService) { }

    // Create a rating for an order
    async create(orderId: string, userId: string, dto: CreateRatingDto) {
        // Get order
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                brand: { include: { companyUsers: true } },
                supplier: { include: { companyUsers: true } },
            },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        // Order must be finalized
        if (order.status !== OrderStatus.FINALIZADO) {
            throw new BadRequestException('Order must be finalized before rating');
        }

        // Check if user belongs to brand or supplier
        const isBrand = order.brand.companyUsers.some((cu) => cu.userId === userId);
        const isSupplier = order.supplier?.companyUsers.some((cu) => cu.userId === userId);

        if (!isBrand && !isSupplier) {
            throw new ForbiddenException('You do not have access to this order');
        }

        const fromCompanyId = isBrand ? order.brandId : order.supplierId!;
        const toCompanyId = isBrand ? order.supplierId! : order.brandId;

        // Check if already rated
        const existingRating = await this.prisma.rating.findUnique({
            where: {
                orderId_fromCompanyId: {
                    orderId,
                    fromCompanyId,
                },
            },
        });

        if (existingRating) {
            throw new BadRequestException('You have already rated this order');
        }

        // Create rating
        const rating = await this.prisma.rating.create({
            data: {
                orderId,
                fromCompanyId,
                toCompanyId,
                score: dto.score,
                comment: dto.comment,
            },
        });

        // Update average rating for the company
        await this.updateAverageRating(toCompanyId);

        return rating;
    }

    // Get ratings for a company
    async getCompanyRatings(companyId: string) {
        return this.prisma.rating.findMany({
            where: { toCompanyId: companyId },
            include: {
                fromCompany: { select: { id: true, tradeName: true } },
                order: { select: { id: true, displayId: true, productName: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    }

    // Get my pending ratings (orders that can be rated)
    async getPendingRatings(userId: string) {
        // Get user's companies
        const companyUsers = await this.prisma.companyUser.findMany({
            where: { userId },
            select: { companyId: true },
        });

        const companyIds = companyUsers.map((cu) => cu.companyId);

        // Get finalized orders without a rating from this user's company
        return this.prisma.order.findMany({
            where: {
                status: OrderStatus.FINALIZADO,
                OR: [
                    { brandId: { in: companyIds } },
                    { supplierId: { in: companyIds } },
                ],
                ratings: {
                    none: {
                        fromCompanyId: { in: companyIds },
                    },
                },
            },
            include: {
                brand: { select: { id: true, tradeName: true } },
                supplier: { select: { id: true, tradeName: true } },
            },
            orderBy: { updatedAt: 'desc' },
        });
    }

    private async updateAverageRating(companyId: string) {
        const result = await this.prisma.rating.aggregate({
            where: { toCompanyId: companyId },
            _avg: { score: true },
        });

        await this.prisma.company.update({
            where: { id: companyId },
            data: { avgRating: result._avg.score || 0 },
        });
    }
}
