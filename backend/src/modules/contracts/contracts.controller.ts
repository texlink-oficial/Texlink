import {
    Controller,
    Get,
    Post,
    Param,
    Body,
    HttpCode,
    HttpStatus,
    Ip,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
} from '@nestjs/swagger';
import { ContractsService } from './contracts.service';
import { GenerateContractDto } from './dto/generate-contract.dto';
import { SignContractDto } from './dto/sign-contract.dto';

/**
 * Controller público de Contratos
 *
 * Endpoints sem autenticação para permitir acesso via token de convite
 */
@ApiTags('Contratos (Onboarding)')
@Controller('onboarding')
export class ContractsController {
    constructor(private readonly contractsService: ContractsService) {}

    /**
     * Gerar contrato (público)
     */
    @Post(':token/contract/generate')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Gerar contrato de fornecimento (público)',
        description:
            'Gera um PDF do contrato com base no template padrão. ' +
            'Atualiza status do credenciamento para CONTRACT_PENDING.',
    })
    @ApiParam({
        name: 'token',
        description: 'Token único do convite',
    })
    @ApiResponse({
        status: 201,
        description: 'Contrato gerado com sucesso',
    })
    @ApiResponse({
        status: 404,
        description: 'Credenciamento não encontrado',
    })
    async generateContract(
        @Param('token') token: string,
        @Body() dto: GenerateContractDto,
    ) {
        // Buscar credentialId pelo token
        const invitation = await this.getInvitationByToken(token);

        return this.contractsService.generateContract(
            invitation.credentialId,
            dto.terms,
        );
    }

    /**
     * Visualizar contrato (público)
     */
    @Get(':token/contract')
    @ApiOperation({
        summary: 'Visualizar contrato (público)',
        description: 'Retorna os dados do contrato gerado',
    })
    @ApiParam({
        name: 'token',
        description: 'Token único do convite',
    })
    @ApiResponse({
        status: 200,
        description: 'Dados do contrato',
    })
    @ApiResponse({
        status: 404,
        description: 'Contrato não encontrado',
    })
    async getContract(@Param('token') token: string) {
        const invitation = await this.getInvitationByToken(token);
        return this.contractsService.getContract(invitation.credentialId);
    }

    /**
     * Assinar contrato (público)
     */
    @Post(':token/contract/sign')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Assinar contrato (público)',
        description:
            'Registra a assinatura eletrônica do fornecedor no contrato. ' +
            'Atualiza status para CONTRACT_SIGNED e ativa o fornecedor (ACTIVE).',
    })
    @ApiParam({
        name: 'token',
        description: 'Token único do convite',
    })
    @ApiResponse({
        status: 200,
        description: 'Contrato assinado com sucesso',
    })
    @ApiResponse({
        status: 400,
        description: 'Contrato já foi assinado',
    })
    @ApiResponse({
        status: 404,
        description: 'Contrato não encontrado',
    })
    async signContract(
        @Param('token') token: string,
        @Body() dto: SignContractDto,
        @Ip() ipAddress: string,
    ) {
        if (!dto.accepted) {
            throw new Error('É necessário aceitar os termos do contrato');
        }

        const invitation = await this.getInvitationByToken(token);

        return this.contractsService.signContract(
            invitation.credentialId,
            'SUPPLIER', // ID será substituído por auth real futuramente
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
