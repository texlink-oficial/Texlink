import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RatingsService } from './ratings.service';
import { CreateRatingDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Avaliações')
@ApiBearerAuth()
@Controller('ratings')
@UseGuards(JwtAuthGuard)
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post('orders/:orderId')
  async create(
    @Param('orderId') orderId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateRatingDto,
  ) {
    return this.ratingsService.create(orderId, userId, dto);
  }

  @Get('company/:companyId')
  async getCompanyRatings(
    @Param('companyId') companyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.ratingsService.getCompanyRatings(companyId, userId);
  }

  @Get('received')
  async getReceivedRatings(@CurrentUser('id') userId: string) {
    return this.ratingsService.getReceivedRatings(userId);
  }

  @Get('pending')
  async getPendingRatings(@CurrentUser('id') userId: string) {
    return this.ratingsService.getPendingRatings(userId);
  }
}
