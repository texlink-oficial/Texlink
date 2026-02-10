import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BrandOnboardingPhase2Dto, BrandOnboardingPhase3Dto } from './dto';
import { CompanyType, Prisma } from '@prisma/client';

@Injectable()
export class BrandsService {
  constructor(private prisma: PrismaService) {}

  async getMyProfile(userId: string) {
    const companyUser = await this.prisma.companyUser.findFirst({
      where: {
        userId,
        company: { type: CompanyType.BRAND },
      },
      include: {
        company: {
          include: {
            brandProfile: true,
          },
        },
      },
    });

    if (!companyUser) {
      throw new NotFoundException('Brand profile not found');
    }

    return companyUser.company;
  }

  async updatePhase2(userId: string, dto: BrandOnboardingPhase2Dto) {
    const company = await this.getMyProfile(userId);

    if (!company.brandProfile) {
      throw new NotFoundException('Brand profile not found');
    }

    return this.prisma.brandProfile.update({
      where: { id: company.brandProfile.id },
      data: {
        onboardingPhase: 2,
        businessQualification: dto as unknown as Prisma.JsonObject,
      },
    });
  }

  async updatePhase3(userId: string, dto: BrandOnboardingPhase3Dto) {
    const company = await this.getMyProfile(userId);

    if (!company.brandProfile) {
      throw new NotFoundException('Brand profile not found');
    }

    return this.prisma.brandProfile.update({
      where: { id: company.brandProfile.id },
      data: {
        onboardingPhase: 3,
        productTypes: dto.productTypes,
        specialties: dto.specialties || [],
        monthlyVolume: dto.monthlyVolume,
        onboardingComplete: dto.onboardingComplete ?? true,
      },
    });
  }

  async completeOnboarding(userId: string) {
    const company = await this.getMyProfile(userId);

    if (!company.brandProfile) {
      throw new NotFoundException('Brand profile not found');
    }

    return this.prisma.brandProfile.update({
      where: { id: company.brandProfile.id },
      data: {
        onboardingPhase: 3,
        onboardingComplete: true,
      },
    });
  }
}
