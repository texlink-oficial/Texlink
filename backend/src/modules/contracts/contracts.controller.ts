import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Ip,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  StreamableFile,
  NotFoundException,
  ForbiddenException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { ContractsService } from './contracts.service';
import {
  CreateContractDto,
  UploadContractDto,
  SendForSignatureDto,
  RequestRevisionDto,
  RespondRevisionDto,
  SignContractDto,
  SignContractOnboardingDto,
  ContractFilterDto,
  GenerateContractDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

/**
 * Controller de Contratos
 *
 * Gerencia contratos entre marcas e facções
 */
@ApiTags('Contratos')
@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  // ==================== BRAND ENDPOINTS ====================

  /**
   * Criar contrato a partir de template
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BRAND, UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar contrato',
    description: 'Cria um novo contrato a partir do template padrão',
  })
  @ApiResponse({ status: 201, description: 'Contrato criado com sucesso' })
  @ApiResponse({ status: 404, description: 'Relacionamento não encontrado' })
  async createContract(
    @Body() dto: CreateContractDto,
    @CurrentUser() user: any,
  ) {
    return this.contractsService.createContract(dto, user.id);
  }

  /**
   * Upload de contrato PDF customizado
   */
  @Post('upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BRAND, UserRole.ADMIN)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Upload de contrato',
    description: 'Faz upload de um PDF de contrato customizado',
  })
  @ApiResponse({ status: 201, description: 'Contrato uploaded com sucesso' })
  async uploadContract(
    @Body() dto: UploadContractDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    return this.contractsService.uploadContract(dto, file, user.id);
  }

  /**
   * Listar contratos da marca
   */
  @Get('brand')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BRAND, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Listar contratos da marca',
    description: 'Lista todos os contratos da marca com filtros opcionais',
  })
  @ApiResponse({ status: 200, description: 'Lista de contratos' })
  async findByBrand(
    @Query() filters: ContractFilterDto,
    @CurrentUser() user: any,
  ) {
    // Buscar companyId do usuário
    const brandId = user.companyId;
    return this.contractsService.findByBrand(brandId, filters);
  }

  /**
   * Listar contratos do fornecedor
   */
  @Get('supplier')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Listar contratos do fornecedor',
    description: 'Lista todos os contratos do fornecedor com filtros opcionais',
  })
  @ApiResponse({ status: 200, description: 'Lista de contratos' })
  async findBySupplier(
    @Query() filters: ContractFilterDto,
    @CurrentUser() user: any,
  ) {
    const supplierId = user.companyId;
    return this.contractsService.findBySupplier(supplierId, filters);
  }

  /**
   * Buscar contrato por ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Detalhes do contrato',
    description: 'Retorna os detalhes completos de um contrato',
  })
  @ApiParam({ name: 'id', description: 'ID do contrato' })
  @ApiResponse({ status: 200, description: 'Detalhes do contrato' })
  @ApiResponse({ status: 404, description: 'Contrato não encontrado' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.contractsService.findById(id, user.id);
  }

  /**
   * Download do PDF do contrato
   */
  @Get(':id/download')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Download do contrato',
    description: 'Faz download do PDF do contrato',
  })
  @ApiParam({ name: 'id', description: 'ID do contrato' })
  @ApiResponse({ status: 200, description: 'Arquivo PDF' })
  @ApiResponse({ status: 404, description: 'Contrato não encontrado' })
  @ApiResponse({ status: 403, description: 'Acesso negado ao arquivo' })
  async downloadContract(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const contract = await this.contractsService.findById(id, user.id);

    if (!contract.documentUrl) {
      throw new NotFoundException('Documento não disponível');
    }

    // SECURITY FIX: Validate path is within allowed uploads directory
    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    const requestedPath = path.resolve(process.cwd(), contract.documentUrl);

    if (!requestedPath.startsWith(uploadsDir + path.sep)) {
      throw new ForbiddenException('Acesso negado ao arquivo');
    }

    if (!fs.existsSync(requestedPath)) {
      throw new NotFoundException('Arquivo não encontrado');
    }

    const file = fs.createReadStream(requestedPath);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${contract.displayId}.pdf"`,
    });

    return new StreamableFile(file);
  }

  /**
   * Enviar contrato para assinatura
   */
  @Post(':id/send')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BRAND, UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enviar para assinatura',
    description: 'Envia o contrato para o fornecedor assinar',
  })
  @ApiParam({ name: 'id', description: 'ID do contrato' })
  @ApiResponse({ status: 200, description: 'Contrato enviado' })
  @ApiResponse({ status: 400, description: 'Contrato não pode ser enviado' })
  async sendForSignature(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { message?: string },
    @CurrentUser() user: any,
  ) {
    return this.contractsService.sendForSignature(id, user.id, dto.message);
  }

  /**
   * Assinar contrato como marca
   */
  @Post(':id/sign/brand')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BRAND, UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Assinar como marca',
    description: 'Registra a assinatura da marca no contrato',
  })
  @ApiParam({ name: 'id', description: 'ID do contrato' })
  @ApiResponse({ status: 200, description: 'Contrato assinado' })
  @ApiResponse({ status: 400, description: 'Contrato já foi assinado' })
  async signAsBrand(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { signerName: string; accepted: boolean },
    @CurrentUser() user: any,
    @Ip() ipAddress: string,
  ) {
    if (!dto.accepted) {
      throw new Error('É necessário aceitar os termos do contrato');
    }
    return this.contractsService.signAsBrand(
      id,
      user.id,
      dto.signerName,
      ipAddress,
    );
  }

  /**
   * Assinar contrato como fornecedor
   */
  @Post(':id/sign/supplier')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER, UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Assinar como fornecedor',
    description: 'Registra a assinatura do fornecedor no contrato',
  })
  @ApiParam({ name: 'id', description: 'ID do contrato' })
  @ApiResponse({ status: 200, description: 'Contrato assinado' })
  @ApiResponse({ status: 400, description: 'Contrato já foi assinado' })
  async signAsSupplier(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { signerName: string; accepted: boolean },
    @CurrentUser() user: any,
    @Ip() ipAddress: string,
  ) {
    if (!dto.accepted) {
      throw new Error('É necessário aceitar os termos do contrato');
    }
    return this.contractsService.signAsSupplier(
      id,
      user.id,
      dto.signerName,
      ipAddress,
    );
  }

  /**
   * Cancelar contrato
   */
  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BRAND, UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancelar contrato',
    description: 'Cancela um contrato não assinado',
  })
  @ApiParam({ name: 'id', description: 'ID do contrato' })
  @ApiResponse({ status: 200, description: 'Contrato cancelado' })
  @ApiResponse({ status: 400, description: 'Contrato não pode ser cancelado' })
  async cancelContract(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { reason?: string },
    @CurrentUser() user: any,
  ) {
    return this.contractsService.cancelContract(id, user.id, dto.reason);
  }

  // ==================== REVISION ENDPOINTS ====================

  /**
   * Solicitar revisão de contrato (fornecedor)
   */
  @Post('revisions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPPLIER, UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Solicitar revisão',
    description: 'Fornecedor solicita alteração no contrato',
  })
  @ApiResponse({ status: 201, description: 'Revisão solicitada' })
  @ApiResponse({ status: 400, description: 'Revisão não pode ser solicitada' })
  async requestRevision(
    @Body() dto: RequestRevisionDto,
    @CurrentUser() user: any,
  ) {
    return this.contractsService.requestRevision(dto, user.id);
  }

  /**
   * Responder revisão (marca)
   */
  @Post('revisions/:id/respond')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BRAND, UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Responder revisão',
    description: 'Marca responde à solicitação de revisão',
  })
  @ApiParam({ name: 'id', description: 'ID da revisão' })
  @ApiResponse({ status: 200, description: 'Revisão respondida' })
  @ApiResponse({ status: 400, description: 'Revisão já foi respondida' })
  async respondRevision(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Omit<RespondRevisionDto, 'revisionId'>,
    @CurrentUser() user: any,
  ) {
    return this.contractsService.respondToRevision(
      { ...dto, revisionId: id },
      user.id,
    );
  }

  // ==================== LEGACY ONBOARDING ENDPOINTS ====================

  /**
   * Gerar contrato (público - fluxo de onboarding)
   * @deprecated Use POST /contracts para novos contratos
   */
  @Post('onboarding/:token/generate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Gerar contrato (onboarding)',
    description:
      '[DEPRECATED] Gera um PDF do contrato com base no template padrão.',
  })
  @ApiParam({ name: 'token', description: 'Token único do convite' })
  @ApiResponse({ status: 201, description: 'Contrato gerado com sucesso' })
  @ApiResponse({ status: 404, description: 'Credenciamento não encontrado' })
  async generateContractLegacy(
    @Param('token') token: string,
    @Body() dto: GenerateContractDto,
  ) {
    const invitation = await this.getInvitationByToken(token);
    return this.contractsService.generateContract(
      invitation.credentialId,
      dto.terms,
    );
  }

  /**
   * Visualizar contrato (público - fluxo de onboarding)
   * @deprecated Use GET /contracts/:id para novos contratos
   */
  @Get('onboarding/:token')
  @ApiOperation({
    summary: 'Visualizar contrato (onboarding)',
    description: '[DEPRECATED] Retorna os dados do contrato gerado',
  })
  @ApiParam({ name: 'token', description: 'Token único do convite' })
  @ApiResponse({ status: 200, description: 'Dados do contrato' })
  @ApiResponse({ status: 404, description: 'Contrato não encontrado' })
  async getContractLegacy(@Param('token') token: string) {
    const invitation = await this.getInvitationByToken(token);
    return this.contractsService.getContract(invitation.credentialId);
  }

  /**
   * Assinar contrato (público - fluxo de onboarding)
   * @deprecated Use POST /contracts/:id/sign/supplier para novos contratos
   */
  @Post('onboarding/:token/sign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Assinar contrato (onboarding)',
    description:
      '[DEPRECATED] Registra a assinatura eletrônica do fornecedor no contrato.',
  })
  @ApiParam({ name: 'token', description: 'Token único do convite' })
  @ApiResponse({ status: 200, description: 'Contrato assinado com sucesso' })
  @ApiResponse({ status: 400, description: 'Contrato já foi assinado' })
  async signContractLegacy(
    @Param('token') token: string,
    @Body() dto: SignContractOnboardingDto,
    @Ip() ipAddress: string,
  ) {
    if (!dto.accepted) {
      throw new Error('É necessário aceitar os termos do contrato');
    }

    const invitation = await this.getInvitationByToken(token);

    return this.contractsService.signContract(
      invitation.credentialId,
      'SUPPLIER',
      ipAddress,
    );
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Busca convite pelo token (helper reutilizável)
   */
  private async getInvitationByToken(token: string) {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    try {
      const invitation = await prisma.credentialInvitation.findUnique({
        where: { token },
      });

      if (!invitation) {
        throw new Error('Token de convite inválido');
      }

      return invitation;
    } finally {
      await prisma.$disconnect();
    }
  }
}
