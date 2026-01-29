import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    ParseUUIDPipe,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
    ApiQuery,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CredentialsService } from './credentials.service';
import { InvitationService } from './services/invitation.service';
import { ValidationService } from './services/validation.service';
import { ComplianceService } from './services/compliance.service';
import {
    CreateCredentialDto,
    UpdateCredentialDto,
    CredentialFiltersDto,
    SendInvitationDto,
    BulkSendInvitationDto,
    ApproveComplianceDto,
    RejectComplianceDto,
} from './dto';
import { ValidateDocumentDto } from '../onboarding/dto/validate-document.dto';
import { SupplierCredentialStatus } from '@prisma/client';

interface AuthUser {
    id: string;
    email: string;
    companyId: string;
    brandId?: string;
}

@ApiTags('Credenciamentos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('credentials')
export class CredentialsController {
    constructor(
        private readonly credentialsService: CredentialsService,
        private readonly invitationService: InvitationService,
        private readonly validationService: ValidationService,
        private readonly complianceService: ComplianceService,
    ) { }

    // ==================== CRUD ====================

    @Post()
    @ApiOperation({ summary: 'Criar novo credenciamento' })
    @ApiResponse({ status: 201, description: 'Credenciamento criado' })
    @ApiResponse({ status: 409, description: 'CNPJ já possui credenciamento' })
    async create(
        @Body() dto: CreateCredentialDto,
        @CurrentUser() user: AuthUser,
    ) {
        return this.credentialsService.create(dto, user);
    }

    @Get()
    @ApiOperation({ summary: 'Listar credenciamentos com filtros' })
    @ApiResponse({ status: 200, description: 'Lista paginada de credenciamentos' })
    async findAll(
        @Query() filters: CredentialFiltersDto,
        @CurrentUser() user: AuthUser,
    ) {
        const companyId = user.brandId || user.companyId;
        return this.credentialsService.findAll(companyId, filters);
    }

    @Get('stats')
    @ApiOperation({ summary: 'Estatísticas de credenciamentos' })
    @ApiResponse({ status: 200, description: 'Estatísticas retornadas' })
    async getStats(@CurrentUser() user: AuthUser) {
        const companyId = user.brandId || user.companyId;
        return this.credentialsService.getStats(companyId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Buscar credenciamento por ID' })
    @ApiParam({ name: 'id', description: 'ID do credenciamento' })
    @ApiResponse({ status: 200, description: 'Credenciamento encontrado' })
    @ApiResponse({ status: 404, description: 'Credenciamento não encontrado' })
    async findOne(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: AuthUser,
    ) {
        const companyId = user.brandId || user.companyId;
        return this.credentialsService.findOne(id, companyId);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Atualizar credenciamento' })
    @ApiParam({ name: 'id', description: 'ID do credenciamento' })
    @ApiResponse({ status: 200, description: 'Credenciamento atualizado' })
    @ApiResponse({ status: 400, description: 'Status não permite edição' })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateCredentialDto,
        @CurrentUser() user: AuthUser,
    ) {
        return this.credentialsService.update(id, dto, user);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Remover credenciamento' })
    @ApiParam({ name: 'id', description: 'ID do credenciamento' })
    @ApiResponse({ status: 200, description: 'Credenciamento removido' })
    @ApiResponse({ status: 400, description: 'Status não permite remoção' })
    async remove(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: AuthUser,
    ) {
        return this.credentialsService.remove(id, user);
    }

    // ==================== VALIDATION ====================

    @Post(':id/validate')
    @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 req/min por IP
    @ApiOperation({ summary: 'Iniciar validação de CNPJ' })
    @ApiParam({ name: 'id', description: 'ID do credenciamento' })
    @ApiResponse({ status: 200, description: 'Validação realizada' })
    @ApiResponse({ status: 429, description: 'Muitas requisições - limite: 10/min' })
    async validateCNPJ(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: AuthUser,
    ) {
        const companyId = user.brandId || user.companyId;

        // Busca credenciamento para validar propriedade
        const credential = await this.credentialsService.findOne(id, companyId);

        // Atualiza status para PENDING_VALIDATION
        await this.credentialsService.changeStatus(
            id,
            SupplierCredentialStatus.PENDING_VALIDATION,
            user.id,
            'Validação de CNPJ iniciada',
        );

        // Executa validação
        return this.validationService.validateCNPJ(credential.cnpj, id);
    }

    // ==================== COMPLIANCE ====================

    @Post(':id/compliance')
    @ApiOperation({ summary: 'Iniciar análise de compliance' })
    @ApiParam({ name: 'id', description: 'ID do credenciamento' })
    @ApiResponse({ status: 200, description: 'Análise realizada' })
    async analyzeCompliance(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: AuthUser,
    ) {
        const companyId = user.brandId || user.companyId;
        const credential = await this.credentialsService.findOne(id, companyId);

        return this.complianceService.analyzeCredit(credential.cnpj, id);
    }

    @Patch(':id/compliance/approve')
    @ApiOperation({ summary: 'Aprovar compliance manualmente' })
    @ApiParam({ name: 'id', description: 'ID do credenciamento' })
    @ApiResponse({ status: 200, description: 'Compliance aprovado' })
    @ApiResponse({ status: 400, description: 'Status não permite aprovação ou não requer revisão manual' })
    @ApiResponse({ status: 404, description: 'Credenciamento ou análise não encontrado' })
    async approveCompliance(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: ApproveComplianceDto,
        @CurrentUser() user: AuthUser,
    ) {
        return this.complianceService.approveCompliance(id, dto.notes, user);
    }

    @Patch(':id/compliance/reject')
    @ApiOperation({ summary: 'Rejeitar compliance manualmente' })
    @ApiParam({ name: 'id', description: 'ID do credenciamento' })
    @ApiResponse({ status: 200, description: 'Compliance rejeitado' })
    @ApiResponse({ status: 400, description: 'Status não permite rejeição ou não requer revisão manual' })
    @ApiResponse({ status: 404, description: 'Credenciamento ou análise não encontrado' })
    async rejectCompliance(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: RejectComplianceDto,
        @CurrentUser() user: AuthUser,
    ) {
        return this.complianceService.rejectCompliance(id, dto.reason, dto.notes, user);
    }

    @Get(':id/compliance')
    @ApiOperation({ summary: 'Consultar análise de compliance' })
    @ApiParam({ name: 'id', description: 'ID do credenciamento' })
    @ApiResponse({ status: 200, description: 'Análise retornada' })
    @ApiResponse({ status: 404, description: 'Análise não encontrada' })
    async getCompliance(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: AuthUser,
    ) {
        const companyId = user.brandId || user.companyId;
        return this.complianceService.getCompliance(id, companyId);
    }

    @Get('compliance/pending-reviews')
    @ApiOperation({ summary: 'Listar credenciamentos pendentes de revisão manual' })
    @ApiResponse({ status: 200, description: 'Lista de análises pendentes' })
    async getPendingReviews(@CurrentUser() user: AuthUser) {
        const companyId = user.brandId || user.companyId;
        return this.complianceService.getPendingReviews(companyId);
    }

    // ==================== INVITATIONS ====================

    @Post(':id/invite')
    @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 req/min por marca
    @ApiOperation({ summary: 'Enviar convite para credenciamento' })
    @ApiParam({ name: 'id', description: 'ID do credenciamento' })
    @ApiResponse({ status: 200, description: 'Convite enviado' })
    @ApiResponse({ status: 429, description: 'Muitas requisições - limite: 5/min' })
    async sendInvitation(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: SendInvitationDto,
        @CurrentUser() user: AuthUser,
    ) {
        return this.invitationService.sendInvitation(id, dto, user);
    }

    @Post('invite/bulk')
    @ApiOperation({ summary: 'Enviar convites em lote' })
    @ApiResponse({ status: 200, description: 'Convites enviados' })
    async sendBulkInvitations(
        @Body() dto: BulkSendInvitationDto,
        @CurrentUser() user: AuthUser,
    ) {
        return this.invitationService.sendBulkInvitations(dto, user);
    }

    // ==================== STATUS ====================

    @Patch(':id/status')
    @ApiOperation({ summary: 'Alterar status do credenciamento' })
    @ApiParam({ name: 'id', description: 'ID do credenciamento' })
    @ApiResponse({ status: 200, description: 'Status alterado' })
    async changeStatus(
        @Param('id', ParseUUIDPipe) id: string,
        @Body('status') status: SupplierCredentialStatus,
        @Body('reason') reason: string,
        @CurrentUser() user: AuthUser,
    ) {
        const companyId = user.brandId || user.companyId;

        // Valida que credenciamento pertence à marca
        await this.credentialsService.findOne(id, companyId);

        return this.credentialsService.changeStatus(id, status, user.id, reason);
    }

    // ==================== VALIDATION HISTORY ====================

    @Get(':id/validations')
    @ApiOperation({ summary: 'Histórico de validações' })
    @ApiParam({ name: 'id', description: 'ID do credenciamento' })
    async getValidationHistory(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: AuthUser,
    ) {
        const companyId = user.brandId || user.companyId;

        // Valida que credenciamento pertence à marca
        await this.credentialsService.findOne(id, companyId);

        return this.validationService.getValidationHistory(id);
    }

    // ==================== DOCUMENT VALIDATION ====================

    @Get('pending-documents')
    @ApiOperation({
        summary: 'Listar credenciamentos com documentos pendentes',
        description:
            'Retorna credenciamentos com documentos aguardando validação pela marca',
    })
    @ApiResponse({
        status: 200,
        description: 'Lista de credenciamentos com docs pendentes',
    })
    async getPendingDocuments(@CurrentUser() user: AuthUser) {
        return this.credentialsService.getCredentialsWithPendingDocuments(user);
    }

    @Get(':id/documents')
    @ApiOperation({
        summary: 'Listar documentos de um credenciamento',
        description: 'Retorna todos os documentos enviados no onboarding',
    })
    @ApiParam({ name: 'id', description: 'ID do credenciamento' })
    @ApiResponse({
        status: 200,
        description: 'Lista de documentos',
    })
    async getDocuments(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: AuthUser,
    ) {
        return this.credentialsService.getDocuments(id, user);
    }

    @Patch(':id/documents/:documentId')
    @ApiOperation({
        summary: 'Validar ou rejeitar documento',
        description:
            'Aprova ou rejeita um documento do onboarding. ' +
            'Quando todos os documentos forem aprovados, o fornecedor pode prosseguir para assinatura do contrato.',
    })
    @ApiParam({ name: 'id', description: 'ID do credenciamento' })
    @ApiParam({ name: 'documentId', description: 'ID do documento' })
    @ApiResponse({
        status: 200,
        description: 'Documento validado/rejeitado',
    })
    @ApiResponse({
        status: 403,
        description: 'Apenas marcas podem validar documentos',
    })
    async validateDocument(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('documentId', ParseUUIDPipe) documentId: string,
        @Body() dto: ValidateDocumentDto,
        @CurrentUser() user: AuthUser,
    ) {
        return this.credentialsService.validateDocument(
            id,
            documentId,
            dto.isValid,
            dto.validationNotes,
            user,
        );
    }

    @Post(':id/activate')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Ativar fornecedor',
        description:
            'Ativa o fornecedor manualmente após validação de documentos e assinatura de contrato. ' +
            'Status final: ACTIVE',
    })
    @ApiParam({ name: 'id', description: 'ID do credenciamento' })
    @ApiResponse({
        status: 200,
        description: 'Fornecedor ativado com sucesso',
    })
    @ApiResponse({
        status: 400,
        description: 'Contrato não assinado ou documentos não aprovados',
    })
    @ApiResponse({
        status: 403,
        description: 'Apenas marcas podem ativar fornecedores',
    })
    async activateSupplier(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: AuthUser,
    ) {
        return this.credentialsService.activateSupplier(id, user);
    }
}
