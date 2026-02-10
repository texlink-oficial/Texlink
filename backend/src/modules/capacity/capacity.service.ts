import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { CompanyType, OrderStatus, OrderAssignmentType, OrderTargetStatus } from '@prisma/client';
import { UpdateCapacityConfigDto } from './dto/update-capacity-config.dto';
import { CalendarQueryDto } from './dto/calendar-query.dto';
import { AcceptOrderCapacityDto } from './dto/accept-order-capacity.dto';
import {
  ORDER_ACCEPTED,
  OrderAcceptedEvent,
} from '../notifications/events/notification.events';

@Injectable()
export class CapacityService {
  private readonly logger = new Logger(CapacityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Resolve userId to supplier companyId.
   * Throws ForbiddenException if user is not linked to a SUPPLIER company.
   */
  private async getSupplierCompanyId(userId: string): Promise<string> {
    const companyUser = await this.prisma.companyUser.findFirst({
      where: {
        userId,
        company: { type: CompanyType.SUPPLIER },
      },
    });

    if (!companyUser) {
      throw new ForbiddenException(
        'Você deve estar associado a uma empresa fornecedora',
      );
    }

    return companyUser.companyId;
  }

  // ==================== CONFIG ====================

  async getConfig(userId: string) {
    const companyId = await this.getSupplierCompanyId(userId);

    const profile = await this.prisma.supplierProfile.findUnique({
      where: { companyId },
      select: {
        activeWorkers: true,
        hoursPerDay: true,
        monthlyCapacity: true,
        currentOccupancy: true,
        productTypes: true,
        specialties: true,
      },
    });

    if (!profile) {
      return {
        activeWorkers: null,
        hoursPerDay: null,
        monthlyCapacity: null,
        currentOccupancy: 0,
        productTypes: [],
        specialties: [],
      };
    }

    return profile;
  }

  async updateConfig(userId: string, dto: UpdateCapacityConfigDto) {
    const companyId = await this.getSupplierCompanyId(userId);

    // Total available minutes per month: workers * hours/day * 60 min * 22 working days
    const monthlyCapacity = Math.round(
      dto.activeWorkers * dto.hoursPerDay * 60 * 22,
    );

    const profile = await this.prisma.supplierProfile.upsert({
      where: { companyId },
      update: {
        activeWorkers: dto.activeWorkers,
        hoursPerDay: dto.hoursPerDay,
        monthlyCapacity,
      },
      create: {
        companyId,
        activeWorkers: dto.activeWorkers,
        hoursPerDay: dto.hoursPerDay,
        monthlyCapacity,
      },
      select: {
        activeWorkers: true,
        hoursPerDay: true,
        monthlyCapacity: true,
        currentOccupancy: true,
        productTypes: true,
        specialties: true,
      },
    });

    return profile;
  }

  // ==================== CALENDAR ====================

  async getCalendar(userId: string, query: CalendarQueryDto) {
    // B1 FIX: Always resolve from authenticated user, no supplierId override
    const companyId = await this.getSupplierCompanyId(userId);

    const profile = await this.prisma.supplierProfile.findUnique({
      where: { companyId },
      select: {
        activeWorkers: true,
        hoursPerDay: true,
      },
    });

    const activeWorkers = profile?.activeWorkers || 0;
    const hoursPerDay = profile?.hoursPerDay ? Number(profile.hoursPerDay) : 8;
    const dailyCapacityMinutes = activeWorkers * hoursPerDay * 60;

    // Generate all days for the given year/month
    const year = query.year;
    const month = query.month; // 1-based
    const daysInMonth = new Date(year, month, 0).getDate();

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month - 1, daysInMonth, 23, 59, 59, 999);

    // Statuses that count as "active production" for calendar allocation
    const activeStatuses: OrderStatus[] = [
      OrderStatus.EM_PRODUCAO,
    ];

    // Find all active orders for this supplier (with AND without planned dates)
    const orders = await this.prisma.order.findMany({
      where: {
        supplierId: companyId,
        status: { in: activeStatuses },
      },
      select: {
        id: true,
        displayId: true,
        productName: true,
        quantity: true,
        status: true,
        totalProductionMinutes: true,
        plannedStartDate: true,
        plannedEndDate: true,
      },
    });

    // Estimate production minutes for orders without totalProductionMinutes
    // Use a default of 15 min/piece when no specific time is set
    const DEFAULT_MINUTES_PER_PIECE = 15;

    // Pre-calculate each order's daily allocation
    const ordersWithDays = orders
      .map((order) => {
        const productionMinutes = order.totalProductionMinutes
          || Math.round(order.quantity * DEFAULT_MINUTES_PER_PIECE);

        if (order.plannedStartDate && order.plannedEndDate) {
          // Has planned dates — distribute across its date range
          const start = order.plannedStartDate;
          const end = order.plannedEndDate;
          const totalDays = Math.max(
            1,
            Math.ceil(
              (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
            ) + 1,
          );
          return {
            ...order,
            startDate: start,
            endDate: end,
            dailyMinutes: productionMinutes / totalDays,
          };
        } else {
          // No planned dates — assume it spans the entire queried month
          return {
            ...order,
            startDate: monthStart,
            endDate: monthEnd,
            dailyMinutes: productionMinutes / daysInMonth,
          };
        }
      })
      // Filter to only orders that overlap the queried month
      .filter((o) => o.startDate <= monthEnd && o.endDate >= monthStart);

    // Build calendar days
    const days: Array<{
      date: string;
      dayOfWeek: number;
      isWeekend: boolean;
      totalCapacityMinutes: number;
      allocatedMinutes: number;
      availableMinutes: number;
      orders: Array<{
        id: string;
        displayId: string;
        productName: string;
        quantity: number;
        status: OrderStatus;
      }>;
    }> = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const totalCapacityMinutes = isWeekend ? 0 : dailyCapacityMinutes;

      // Find orders overlapping this day
      const dayStart = new Date(year, month - 1, day);
      const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999);

      let allocatedMinutes = 0;
      const dayOrders: Array<{
        id: string;
        displayId: string;
        productName: string;
        quantity: number;
        status: OrderStatus;
      }> = [];

      for (const order of ordersWithDays) {
        if (order.startDate <= dayEnd && order.endDate >= dayStart) {
          allocatedMinutes += order.dailyMinutes;
          dayOrders.push({
            id: order.id,
            displayId: order.displayId,
            productName: order.productName,
            quantity: order.quantity,
            status: order.status,
          });
        }
      }

      allocatedMinutes = Math.round(allocatedMinutes);
      const availableMinutes = Math.max(0, totalCapacityMinutes - allocatedMinutes);

      days.push({
        date: date.toISOString().split('T')[0],
        dayOfWeek,
        isWeekend,
        totalCapacityMinutes,
        allocatedMinutes,
        availableMinutes,
        orders: dayOrders,
      });
    }

    return days;
  }

  // ==================== ACCEPT ORDER WITH CAPACITY ====================

  async acceptOrderWithCapacity(userId: string, dto: AcceptOrderCapacityDto) {
    const companyId = await this.getSupplierCompanyId(userId);

    // Pre-validate the order exists and belongs to this supplier
    const order = await this.prisma.order.findFirst({
      where: {
        id: dto.orderId,
        OR: [
          { supplierId: companyId },
          { supplierId: null, targetSuppliers: { some: { supplierId: companyId } } },
          { status: OrderStatus.DISPONIVEL_PARA_OUTRAS },
        ],
      },
      include: {
        brand: { select: { id: true, tradeName: true } },
        targetSuppliers: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Pedido não encontrado');
    }

    // Validate order is in a status that allows acceptance
    const acceptableStatuses: OrderStatus[] = [
      OrderStatus.LANCADO_PELA_MARCA,
      OrderStatus.EM_NEGOCIACAO,
      OrderStatus.DISPONIVEL_PARA_OUTRAS,
    ];

    if (!acceptableStatuses.includes(order.status)) {
      throw new BadRequestException(
        'Este pedido não pode ser aceito no status atual',
      );
    }

    // Get supplier profile for capacity info
    const profile = await this.prisma.supplierProfile.findUnique({
      where: { companyId },
    });

    const totalProductionMinutes = dto.avgTimePerPiece * order.quantity;

    const workers = profile?.activeWorkers || 1;
    const hours = profile?.hoursPerDay ? Number(profile.hoursPerDay) : 8;
    const dailyCapacityMinutes = workers * hours * 60;

    const productionDaysNeeded = Math.ceil(
      totalProductionMinutes / dailyCapacityMinutes,
    );

    // Calculate plannedEndDate by adding working days (skip weekends)
    const plannedStartDate = new Date(dto.plannedStartDate);
    const plannedEndDate = this.addWorkingDays(
      plannedStartDate,
      productionDaysNeeded,
    );

    const previousStatus = order.status;

    // B2 FIX: Atomic update with optimistic locking on status inside transaction
    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      // Attempt update only if the status hasn't changed (optimistic lock)
      const updated = await tx.order.updateMany({
        where: {
          id: dto.orderId,
          status: previousStatus, // Only update if status is still the expected one
        },
        data: {
          avgTimePerPiece: dto.avgTimePerPiece,
          totalProductionMinutes: Math.round(totalProductionMinutes),
          plannedStartDate,
          plannedEndDate,
          status: OrderStatus.ACEITO_PELA_FACCAO,
          supplierId: companyId,
          acceptedAt: new Date(),
          acceptedById: userId,
        },
      });

      // If no rows were updated, the order status changed concurrently
      if (updated.count === 0) {
        throw new BadRequestException(
          'Este pedido já foi aceito ou alterado por outro usuário',
        );
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId: dto.orderId,
          previousStatus,
          newStatus: OrderStatus.ACEITO_PELA_FACCAO,
          changedById: userId,
          notes: `Pedido aceito com capacidade: ${dto.avgTimePerPiece} min/peça, ${productionDaysNeeded} dias úteis de produção`,
        },
      });

      // If bidding, update target suppliers
      if (order.assignmentType === OrderAssignmentType.BIDDING) {
        await tx.orderTargetSupplier.updateMany({
          where: { orderId: dto.orderId, supplierId: companyId },
          data: { status: OrderTargetStatus.ACCEPTED, respondedAt: new Date() },
        });

        // Reject other suppliers
        await tx.orderTargetSupplier.updateMany({
          where: { orderId: dto.orderId, supplierId: { not: companyId } },
          data: { status: OrderTargetStatus.REJECTED, respondedAt: new Date() },
        });
      }

      // Fetch the full updated order for the response
      return tx.order.findUniqueOrThrow({
        where: { id: dto.orderId },
        include: {
          brand: { select: { id: true, tradeName: true } },
          supplier: { select: { id: true, tradeName: true } },
        },
      });
    });

    // B3 FIX: Emit order.accepted event (same as OrdersService.accept)
    const acceptedEvent: OrderAcceptedEvent = {
      orderId: updatedOrder.id,
      displayId: updatedOrder.displayId,
      brandId: updatedOrder.brandId,
      supplierId: companyId,
      supplierName: updatedOrder.supplier?.tradeName || 'Facção',
      acceptedById: userId,
    };
    this.eventEmitter.emit(ORDER_ACCEPTED, acceptedEvent);
    this.logger.log(`Emitted order.accepted event for ${updatedOrder.displayId}`);

    return updatedOrder;
  }

  /**
   * Add N working days to a date, skipping weekends (Sat/Sun).
   */
  private addWorkingDays(startDate: Date, days: number): Date {
    const result = new Date(startDate);
    let added = 0;

    while (added < days) {
      result.setDate(result.getDate() + 1);
      const dayOfWeek = result.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        added++;
      }
    }

    return result;
  }
}
