import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SupplierCredentialStatus, Company, SupplierProfile } from '@prisma/client';
import type {
  UploadedFile,
  StorageProvider,
} from '../upload/storage.provider';
import { STORAGE_PROVIDER } from '../upload/storage.provider';
import { CompanyDataDto } from './dto/company-data.dto';
import { CapabilitiesDto } from './dto/capabilities.dto';
import * as bcrypt from 'bcrypt';

/**
 * Serviço de Onboarding - Lida com fluxo público de onboarding de facções
 *
 * Funções principais:
 * - Validação de token de convite (público)
 * - Criação de conta de facção
 * - Gerenciamento de progresso do onboarding
 */
@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    @Inject(STORAGE_PROVIDER)
    private readonly storage: StorageProvider,
  ) {}

  /**
   * Valida token de convite público (sem autenticação)
   *
   * Retorna:
   * - Dados da marca (nome, logo)
   * - Dados básicos do convite (CNPJ, nome de contato)
   * - Status do convite (ativo, expirado)
   *
   * @param token - Token único do convite
   */
  async validateToken(token: string) {
    // Busca convite pelo token
    const invitation = await this.prisma.credentialInvitation.findUnique({
      where: { token },
      include: {
        credential: {
          include: {
            brand: {
              select: {
                id: true,
                tradeName: true,
                legalName: true,
                logoUrl: true,
                city: true,
                state: true,
              },
            },
            onboarding: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException(
        'Token de convite inválido ou não encontrado',
      );
    }

    // Verifica se o convite está ativo
    if (!invitation.isActive) {
      throw new BadRequestException(
        'Este convite não está mais ativo. Um novo convite pode ter sido enviado.',
      );
    }

    // Verifica expiração
    const now = new Date();
    const isExpired = now > invitation.expiresAt;

    if (isExpired) {
      // Marca como expirado
      await this.prisma.credentialInvitation.update({
        where: { id: invitation.id },
        data: { isActive: false },
      });

      // Atualiza status do credential se necessário
      if (
        invitation.credential.status ===
        SupplierCredentialStatus.INVITATION_SENT
      ) {
        await this.prisma.supplierCredential.update({
          where: { id: invitation.credentialId },
          data: { status: SupplierCredentialStatus.INVITATION_EXPIRED },
        });

        // Registra no histórico
        await this.prisma.credentialStatusHistory.create({
          data: {
            credentialId: invitation.credentialId,
            fromStatus: SupplierCredentialStatus.INVITATION_SENT,
            toStatus: SupplierCredentialStatus.INVITATION_EXPIRED,
            performedById: 'SYSTEM',
            reason: 'Convite expirado',
          },
        });
      }

      throw new BadRequestException(
        `Este convite expirou em ${invitation.expiresAt.toLocaleDateString('pt-BR')}. ` +
          `Entre em contato com ${invitation.credential.brand.tradeName} para solicitar um novo convite.`,
      );
    }

    // Atualiza openedAt se primeira vez
    if (!invitation.openedAt) {
      await this.prisma.credentialInvitation.update({
        where: { id: invitation.id },
        data: { openedAt: now },
      });

      // Atualiza status do credential para OPENED
      if (
        invitation.credential.status ===
        SupplierCredentialStatus.INVITATION_SENT
      ) {
        await this.prisma.supplierCredential.update({
          where: { id: invitation.credentialId },
          data: { status: SupplierCredentialStatus.INVITATION_OPENED },
        });

        await this.prisma.credentialStatusHistory.create({
          data: {
            credentialId: invitation.credentialId,
            fromStatus: SupplierCredentialStatus.INVITATION_SENT,
            toStatus: SupplierCredentialStatus.INVITATION_OPENED,
            performedById: 'SYSTEM',
            reason: 'Convite aberto pelo destinatário',
          },
        });
      }

      this.logger.log(`Convite ${invitation.id} aberto pela primeira vez`);
    }

    // Calcula dias restantes
    const daysRemaining = Math.ceil(
      (invitation.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Retorna dados públicos
    return {
      valid: true,
      token,
      brand: {
        name:
          invitation.credential.brand.tradeName ||
          invitation.credential.brand.legalName,
        logo: await this.storage.resolveUrl?.(invitation.credential.brand.logoUrl) ?? invitation.credential.brand.logoUrl,
        location: `${invitation.credential.brand.city}, ${invitation.credential.brand.state}`,
      },
      supplier: {
        cnpj: this.formatCNPJ(invitation.credential.cnpj),
        tradeName: invitation.credential.tradeName,
        legalName: invitation.credential.legalName,
        contactName: invitation.credential.contactName,
        contactEmail: invitation.credential.contactEmail,
        contactPhone: invitation.credential.contactPhone,
      },
      invitation: {
        type: invitation.type,
        sentAt: invitation.sentAt,
        expiresAt: invitation.expiresAt,
        daysRemaining,
      },
      status: invitation.credential.status,
      // Verifica se já existe onboarding iniciado
      hasOnboarding: !!invitation.credential.onboarding,
      onboardingProgress: invitation.credential.onboarding
        ? {
            currentStep: invitation.credential.onboarding.currentStep,
            totalSteps: invitation.credential.onboarding.totalSteps,
            completedSteps: invitation.credential.onboarding.completedSteps,
          }
        : null,
    };
  }

  /**
   * Inicia o processo de onboarding
   *
   * Marca o status como ONBOARDING_STARTED e cria registro de progresso
   */
  async startOnboarding(token: string, deviceInfo?: any) {
    // Valida token primeiro
    const validation = await this.validateToken(token);

    const invitation = await this.prisma.credentialInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      throw new NotFoundException('Convite não encontrado');
    }

    // Buscar credential para pegar supplierId
    const credential = await this.prisma.supplierCredential.findUnique({
      where: { id: invitation.credentialId },
    });

    if (!credential) {
      throw new NotFoundException('Credencial não encontrada');
    }

    if (!credential.supplierId) {
      throw new BadRequestException(
        'Credencial não possui supplier associado. Entre em contato com o suporte.',
      );
    }

    // Verifica se já existe onboarding para este supplier
    const existingOnboarding = await this.prisma.supplierOnboarding.findUnique({
      where: { supplierId: credential.supplierId },
    });

    if (existingOnboarding) {
      // Atualiza última atividade
      await this.prisma.supplierOnboarding.update({
        where: { id: existingOnboarding.id },
        data: {
          lastActivityAt: new Date(),
          deviceInfo: deviceInfo as object | undefined,
        },
      });

      // Vincular credential ao onboarding se ainda não estiver
      if (credential.supplierOnboardingId !== existingOnboarding.id) {
        await this.prisma.supplierCredential.update({
          where: { id: credential.id },
          data: { supplierOnboardingId: existingOnboarding.id },
        });
      }

      this.logger.log(`Onboarding retomado: ${existingOnboarding.id}`);

      return {
        onboardingId: existingOnboarding.id,
        resumed: true,
        currentStep: existingOnboarding.currentStep,
      };
    }

    // Cria novo onboarding vinculado ao supplier
    const onboarding = await this.prisma.supplierOnboarding.create({
      data: {
        supplierId: credential.supplierId,
        currentStep: 1,
        totalSteps: 6,
        completedSteps: [],
        deviceInfo: deviceInfo as object | undefined,
      },
    });

    // Vincular credential ao onboarding
    await this.prisma.supplierCredential.update({
      where: { id: credential.id },
      data: { supplierOnboardingId: onboarding.id },
    });

    // Atualiza status do credential
    await this.prisma.supplierCredential.update({
      where: { id: invitation.credentialId },
      data: { status: SupplierCredentialStatus.ONBOARDING_STARTED },
    });

    // Registra no histórico
    await this.prisma.credentialStatusHistory.create({
      data: {
        credentialId: invitation.credentialId,
        fromStatus: validation.status,
        toStatus: SupplierCredentialStatus.ONBOARDING_STARTED,
        performedById: 'SYSTEM',
        reason: 'Onboarding iniciado pelo destinatário',
      },
    });

    // Marca convite como clicado
    if (!invitation.clickedAt) {
      await this.prisma.credentialInvitation.update({
        where: { id: invitation.id },
        data: { clickedAt: new Date() },
      });
    }

    this.logger.log(
      `Novo onboarding iniciado: ${onboarding.id} para credential ${invitation.credentialId}`,
    );

    // Notifica marca que facção iniciou onboarding
    await this.notificationsService
      .notifyBrandOnboardingStarted(invitation.credentialId)
      .catch((error) => {
        this.logger.error(`Falha ao enviar notificação: ${error.message}`);
      });

    return {
      onboardingId: onboarding.id,
      resumed: false,
      currentStep: 1,
    };
  }

  /**
   * Retorna progresso do onboarding
   */
  async getOnboardingProgress(token: string) {
    const invitation = await this.prisma.credentialInvitation.findUnique({
      where: { token },
      include: {
        credential: {
          include: {
            onboarding: {
              include: {
                documents: true,
              },
            },
          },
        },
      },
    });

    if (!invitation || !invitation.credential.onboarding) {
      return null;
    }

    return invitation.credential.onboarding;
  }

  /**
   * Upload de documento do onboarding
   */
  async uploadDocument(
    token: string,
    file: UploadedFile,
    type: string,
    name?: string,
  ) {
    // Validar arquivo
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de arquivo não permitido. Permitidos: ${allowedMimeTypes.join(', ')}`,
      );
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException(`Arquivo muito grande. Máximo: 10MB`);
    }

    // Validar token e buscar onboarding
    const invitation = await this.prisma.credentialInvitation.findUnique({
      where: { token },
      include: {
        credential: {
          include: {
            onboarding: true,
          },
        },
      },
    });

    if (!invitation || !invitation.credential.onboarding) {
      throw new NotFoundException(
        'Onboarding não encontrado. Inicie o processo primeiro.',
      );
    }

    const onboarding = invitation.credential.onboarding;

    // Verificar se já existe documento desse tipo
    const existing = await this.prisma.onboardingDocument.findFirst({
      where: {
        onboardingId: onboarding.id,
        type,
      },
    });

    if (existing) {
      // Deletar arquivo antigo do storage
      const oldKey = existing.fileUrl.split('/uploads/')[1];
      if (oldKey) {
        await this.storage.delete(oldKey).catch(() => {
          this.logger.warn(`Falha ao deletar arquivo antigo: ${oldKey}`);
        });
      }

      // Deletar registro antigo
      await this.prisma.onboardingDocument.delete({
        where: { id: existing.id },
      });
    }

    // Upload para storage
    const { url, key } = await this.storage.upload(
      file,
      `onboarding/${invitation.credentialId}`,
    );

    // Criar registro do documento
    const document = await this.prisma.onboardingDocument.create({
      data: {
        onboardingId: onboarding.id,
        type,
        name: name || type,
        fileName: file.originalname,
        fileUrl: url,
        fileSize: file.size,
        mimeType: file.mimetype,
      },
    });

    this.logger.log(
      `Documento ${type} enviado para onboarding ${onboarding.id}`,
    );

    // Atualizar última atividade
    await this.prisma.supplierOnboarding.update({
      where: { id: onboarding.id },
      data: { lastActivityAt: new Date() },
    });

    return document;
  }

  /**
   * Listar documentos do onboarding
   */
  async getDocuments(token: string) {
    const invitation = await this.prisma.credentialInvitation.findUnique({
      where: { token },
      include: {
        credential: {
          include: {
            onboarding: {
              include: {
                documents: {
                  orderBy: { createdAt: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    if (!invitation || !invitation.credential.onboarding) {
      throw new NotFoundException('Onboarding não encontrado');
    }

    return invitation.credential.onboarding.documents;
  }

  /**
   * Remover documento do onboarding
   */
  async deleteDocument(token: string, documentId: string) {
    // Validar token
    const invitation = await this.prisma.credentialInvitation.findUnique({
      where: { token },
      include: {
        credential: {
          include: {
            onboarding: true,
          },
        },
      },
    });

    if (!invitation || !invitation.credential.onboarding) {
      throw new NotFoundException('Onboarding não encontrado');
    }

    // Buscar documento
    const document = await this.prisma.onboardingDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }

    // Verificar se pertence ao onboarding correto
    if (document.onboardingId !== invitation.credential.onboarding.id) {
      throw new BadRequestException('Documento não pertence a este onboarding');
    }

    // Deletar arquivo do storage
    const key = document.fileUrl.split('/uploads/')[1];
    if (key) {
      await this.storage.delete(key).catch(() => {
        this.logger.warn(`Falha ao deletar arquivo: ${key}`);
      });
    }

    // Deletar registro
    await this.prisma.onboardingDocument.delete({
      where: { id: documentId },
    });

    this.logger.log(
      `Documento ${documentId} removido do onboarding ${invitation.credential.onboarding.id}`,
    );

    return { success: true };
  }

  // ==================== STEP 2: PASSWORD CREATION ====================

  /**
   * Step 2: Criar senha para o usuário
   *
   * - Cria usuário vinculado ao supplier
   * - Hash da senha com bcrypt
   * - Atualiza progresso do onboarding
   */
  async createPassword(token: string, password: string) {
    // Validar token e buscar invitation
    const invitation = await this.prisma.credentialInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      throw new NotFoundException('Convite não encontrado');
    }

    // Buscar credential com onboarding
    const credential = await this.prisma.supplierCredential.findUnique({
      where: { id: invitation.credentialId },
      include: {
        onboarding: true,
      },
    });

    if (!credential || !credential.onboarding) {
      throw new NotFoundException(
        'Onboarding não encontrado. Inicie o processo primeiro.',
      );
    }

    const onboarding = credential.onboarding;

    // Check if user already exists for this email
    if (!credential.contactEmail) {
      throw new BadRequestException('Email de contato não configurado');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: credential.contactEmail },
    });

    if (existingUser) {
      throw new ConflictException(
        'Já existe um usuário com este email. Use a opção de login.',
      );
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create the user
    const user = await this.prisma.user.create({
      data: {
        email: credential.contactEmail,
        name: credential.contactName || 'Usuário',
        passwordHash,
        role: 'SUPPLIER',
        isActive: true,
      },
    });

    // Link user to the supplier company
    if (credential.supplierId) {
      await this.prisma.companyUser.create({
        data: {
          userId: user.id,
          companyId: credential.supplierId,
          role: 'OWNER', // First user is owner
          isCompanyAdmin: true,
        },
      });
    }

    // Update onboarding progress
    const completedSteps = (onboarding.completedSteps as number[]) || [];
    if (!completedSteps.includes(2)) {
      completedSteps.push(2);
    }

    await this.prisma.supplierOnboarding.update({
      where: { id: onboarding.id },
      data: {
        currentStep: Math.max(onboarding.currentStep, 3),
        completedSteps,
        lastActivityAt: new Date(),
      },
    });

    this.logger.log(
      `Password created for user ${user.id} in onboarding ${onboarding.id}`,
    );

    return {
      success: true,
      message: 'Senha criada com sucesso',
      userId: user.id,
    };
  }

  // ==================== STEP 3: COMPANY DATA ====================

  /**
   * Step 3: Salvar dados da empresa
   *
   * - Salva dados de qualificação do negócio
   * - Atualiza SupplierOnboarding e SupplierCredential
   */
  async saveCompanyData(token: string, data: CompanyDataDto) {
    // Validar token e buscar invitation
    const invitation = await this.prisma.credentialInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      throw new NotFoundException('Convite não encontrado');
    }

    // Buscar credential
    const credential = await this.prisma.supplierCredential.findUnique({
      where: { id: invitation.credentialId },
    });

    if (!credential || !credential.supplierOnboardingId) {
      throw new NotFoundException(
        'Onboarding não encontrado. Inicie o processo primeiro.',
      );
    }

    // Buscar onboarding
    const onboarding = await this.prisma.supplierOnboarding.findUnique({
      where: { id: credential.supplierOnboardingId },
    });

    if (!onboarding) {
      throw new NotFoundException('Onboarding não encontrado');
    }

    // Buscar supplier com profile
    let supplier: Company | null = null;
    let supplierProfile: SupplierProfile | null = null;
    if (credential.supplierId) {
      supplier = await this.prisma.company.findUnique({
        where: { id: credential.supplierId },
      });
      supplierProfile = await this.prisma.supplierProfile.findUnique({
        where: { companyId: credential.supplierId },
      });
    }

    // Create or update supplier profile with business qualification data
    if (supplier) {
      if (supplierProfile) {
        // Update existing profile
        await this.prisma.supplierProfile.update({
          where: { id: supplierProfile.id },
          data: {
            businessQualification: data as any,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new profile
        await this.prisma.supplierProfile.create({
          data: {
            companyId: supplier.id,
            businessQualification: data as any,
          },
        });
      }
    }

    // Update onboarding progress
    const completedSteps = (onboarding.completedSteps as number[]) || [];
    if (!completedSteps.includes(3)) {
      completedSteps.push(3);
    }

    await this.prisma.supplierOnboarding.update({
      where: { id: onboarding.id },
      data: {
        currentStep: Math.max(onboarding.currentStep, 4),
        completedSteps,
        lastActivityAt: new Date(),
      },
    });

    this.logger.log(`Company data saved for onboarding ${onboarding.id}`);

    return {
      success: true,
      message: 'Dados da empresa salvos com sucesso',
      onboardingId: onboarding.id,
      currentStep: 4,
    };
  }

  // ==================== STEP 5: CAPABILITIES ====================

  /**
   * Step 5: Salvar capacidades produtivas
   *
   * - Salva tipos de produtos, especialidades, capacidade
   * - Atualiza SupplierProfile
   */
  async saveCapabilities(token: string, data: CapabilitiesDto) {
    // Validar token e buscar invitation
    const invitation = await this.prisma.credentialInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      throw new NotFoundException('Convite não encontrado');
    }

    // Buscar credential
    const credential = await this.prisma.supplierCredential.findUnique({
      where: { id: invitation.credentialId },
    });

    if (!credential || !credential.supplierOnboardingId) {
      throw new NotFoundException(
        'Onboarding não encontrado. Inicie o processo primeiro.',
      );
    }

    // Buscar onboarding
    const onboarding = await this.prisma.supplierOnboarding.findUnique({
      where: { id: credential.supplierOnboardingId },
    });

    if (!onboarding) {
      throw new NotFoundException('Onboarding não encontrado');
    }

    // Buscar supplier com profile
    let supplier: Company | null = null;
    let supplierProfile: SupplierProfile | null = null;
    if (credential.supplierId) {
      supplier = await this.prisma.company.findUnique({
        where: { id: credential.supplierId },
      });
      supplierProfile = await this.prisma.supplierProfile.findUnique({
        where: { companyId: credential.supplierId },
      });
    }

    // Update supplier profile with capabilities
    if (supplier) {
      const dailyCapacity = data.dailyCapacity
        || Math.round(data.activeWorkers * data.hoursPerDay * 60);

      const profileData = {
        productTypes: data.productTypes,
        specialties: data.specialties || [],
        activeWorkers: data.activeWorkers,
        hoursPerDay: data.hoursPerDay,
        dailyCapacity,
        currentOccupancy: data.currentOccupancy ?? 0,
        updatedAt: new Date(),
      };

      if (supplierProfile) {
        await this.prisma.supplierProfile.update({
          where: { id: supplierProfile.id },
          data: profileData,
        });
      } else {
        await this.prisma.supplierProfile.create({
          data: {
            companyId: supplier.id,
            ...profileData,
          },
        });
      }
    }

    // Update onboarding progress
    const completedSteps = (onboarding.completedSteps as number[]) || [];
    if (!completedSteps.includes(5)) {
      completedSteps.push(5);
    }

    await this.prisma.supplierOnboarding.update({
      where: { id: onboarding.id },
      data: {
        currentStep: Math.max(onboarding.currentStep, 6),
        completedSteps,
        lastActivityAt: new Date(),
      },
    });

    this.logger.log(`Capabilities saved for onboarding ${onboarding.id}`);

    return {
      success: true,
      message: 'Capacidades produtivas salvas com sucesso',
      onboardingId: onboarding.id,
      currentStep: 6,
    };
  }

  // ==================== UPDATE STEP PROGRESS ====================

  /**
   * Atualiza progresso de um step específico
   */
  async updateStepProgress(token: string, stepNumber: number) {
    if (stepNumber < 1 || stepNumber > 6) {
      throw new BadRequestException('Step inválido. Deve ser entre 1 e 6.');
    }

    // Validar token e buscar invitation
    const invitation = await this.prisma.credentialInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      throw new NotFoundException('Convite não encontrado');
    }

    // Buscar credential com onboarding
    const credential = await this.prisma.supplierCredential.findUnique({
      where: { id: invitation.credentialId },
      include: {
        onboarding: true,
      },
    });

    if (!credential || !credential.onboarding) {
      throw new NotFoundException(
        'Onboarding não encontrado. Inicie o processo primeiro.',
      );
    }

    const onboarding = credential.onboarding;
    const completedSteps = (onboarding.completedSteps as number[]) || [];

    if (!completedSteps.includes(stepNumber)) {
      completedSteps.push(stepNumber);
      completedSteps.sort((a, b) => a - b);
    }

    // Calculate next step
    const nextStep = Math.min(stepNumber + 1, 6);

    await this.prisma.supplierOnboarding.update({
      where: { id: onboarding.id },
      data: {
        currentStep: Math.max(onboarding.currentStep, nextStep),
        completedSteps,
        lastActivityAt: new Date(),
      },
    });

    // Check if onboarding is complete (all steps done)
    const allStepsComplete = [1, 2, 3, 4, 5, 6].every((step) =>
      completedSteps.includes(step),
    );

    if (allStepsComplete) {
      // Mark credential as CONTRACT_PENDING (next step after onboarding)
      await this.prisma.supplierCredential.update({
        where: { id: invitation.credentialId },
        data: { status: SupplierCredentialStatus.CONTRACT_PENDING },
      });

      await this.prisma.credentialStatusHistory.create({
        data: {
          credentialId: invitation.credentialId,
          fromStatus: SupplierCredentialStatus.ONBOARDING_STARTED,
          toStatus: SupplierCredentialStatus.CONTRACT_PENDING,
          performedById: 'SYSTEM',
          reason: 'Onboarding concluído pelo fornecedor',
        },
      });

      this.logger.log(`Onboarding ${onboarding.id} completed`);
    }

    return {
      success: true,
      stepNumber,
      currentStep: Math.max(onboarding.currentStep, nextStep),
      completedSteps,
      isComplete: allStepsComplete,
    };
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Formata CNPJ para exibição
   */
  private formatCNPJ(cnpj: string): string {
    const clean = cnpj.replace(/\D/g, '');
    if (clean.length !== 14) return cnpj;

    return clean.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      '$1.$2.$3/$4-$5',
    );
  }
}
