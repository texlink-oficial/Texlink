import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto, UpdateCompanyDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CompanyType, UserRole } from '@prisma/client';

@Controller('companies')
@UseGuards(JwtAuthGuard)
export class CompaniesController {
    constructor(private readonly companiesService: CompaniesService) { }

    @Post()
    async create(
        @Body() dto: CreateCompanyDto,
        @CurrentUser('id') userId: string,
    ) {
        return this.companiesService.create(dto, userId);
    }

    @Get('me')
    async findMyCompanies(@CurrentUser('id') userId: string) {
        return this.companiesService.findMyCompanies(userId);
    }

    @Get(':id')
    async findById(@Param('id') id: string) {
        return this.companiesService.findById(id);
    }

    @Patch(':id')
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateCompanyDto,
        @CurrentUser('id') userId: string,
    ) {
        return this.companiesService.update(id, dto, userId);
    }

    @Get()
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    async findAll(@Query('type') type?: CompanyType) {
        return this.companiesService.findAll(type);
    }
}
