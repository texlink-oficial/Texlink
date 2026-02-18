import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRatingDto } from './dto';
import { OrderStatus } from '@prisma/client';
import type { StorageProvider } from '../upload/storage.provider';
import { STORAGE_PROVIDER } from '../upload/storage.provider';

@Injectable()
export class RatingsService {
  constructor(
    private prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

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
      throw new NotFoundException('Pedido não encontrado');
    }

    // Order must be finalized
    if (order.status !== OrderStatus.FINALIZADO) {
      throw new BadRequestException('O pedido deve ser finalizado antes de avaliar');
    }

    // Check if user belongs to brand or supplier
    const isBrand = order.brand.companyUsers.some((cu) => cu.userId === userId);
    const isSupplier = order.supplier?.companyUsers.some(
      (cu) => cu.userId === userId,
    );

    if (!isBrand && !isSupplier) {
      throw new ForbiddenException('Você não tem acesso a este pedido');
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
      throw new BadRequestException('Você já avaliou este pedido');
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

  // Get ratings for a company (user must be a member or business partner)
  async getCompanyRatings(companyId: string, userId: string) {
    // Verify user is a member of this company or has a business relationship
    const userCompanies = await this.prisma.companyUser.findMany({
      where: { userId },
      select: { companyId: true },
    });
    const userCompanyIds = userCompanies.map((cu) => cu.companyId);

    if (!userCompanyIds.includes(companyId)) {
      // Check if user's company has any orders with the target company
      const hasRelationship = await this.prisma.order.findFirst({
        where: {
          OR: [
            { brandId: { in: userCompanyIds }, supplierId: companyId },
            { supplierId: { in: userCompanyIds }, brandId: companyId },
          ],
        },
        select: { id: true },
      });

      if (!hasRelationship) {
        throw new ForbiddenException('You do not have access to this company\'s ratings');
      }
    }

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

  // Get ratings received by the current user's company
  async getReceivedRatings(userId: string) {
    const companyUsers = await this.prisma.companyUser.findMany({
      where: { userId },
      select: { companyId: true },
    });

    const companyIds = companyUsers.map((cu) => cu.companyId);

    return this.prisma.rating.findMany({
      where: { toCompanyId: { in: companyIds } },
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
    const orders = await this.prisma.order.findMany({
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
        brand: { select: { id: true, tradeName: true, logoUrl: true } },
        supplier: { select: { id: true, tradeName: true, logoUrl: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Transform to PendingRating shape expected by frontend
    return Promise.all(
      orders.map(async (order) => {
        const isBrand = companyIds.includes(order.brandId);
        const partner = isBrand ? order.supplier : order.brand;
        const partnerImage = partner?.logoUrl
          ? (await this.storage.resolveUrl?.(partner.logoUrl)) ?? partner.logoUrl
          : undefined;

        return {
          orderId: order.id,
          orderDisplayId: order.displayId,
          partnerCompanyId: partner?.id || '',
          partnerName: partner?.tradeName || '',
          partnerImage,
          completedAt: order.updatedAt.toISOString(),
        };
      }),
    );
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
