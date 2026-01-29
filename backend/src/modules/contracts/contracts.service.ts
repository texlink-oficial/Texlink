import {
    Injectable,
    Logger,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SupplierCredentialStatus } from '@prisma/client';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
    DEFAULT_CONTRACT_TEMPLATE,
    DEFAULT_PAYMENT_TERMS,
    DEFAULT_PENALTY_RATE,
} from './templates/default-contract.template';

@Injectable()
export class ContractsService {
    private readonly logger = new Logger(ContractsService.name);
    private readonly uploadsPath = path.join(process.cwd(), 'uploads', 'contracts');

    constructor(private readonly prisma: PrismaService) {
        // Criar diretório de uploads se não existir
        if (!fs.existsSync(this.uploadsPath)) {
            fs.mkdirSync(this.uploadsPath, { recursive: true });
        }
    }

    /**
     * Gera contrato em PDF para um credenciamento
     */
    async generateContract(
        credentialId: string,
        terms?: Record<string, any>,
    ) {
        // Buscar credential com dados necessários
        const credential = await this.prisma.supplierCredential.findUnique({
            where: { id: credentialId },
            include: {
                brand: true,
            },
        });

        // Verificar se já existe contrato
        const existingContract = await this.prisma.supplierContract.findUnique({
            where: { credentialId },
        });

        if (!credential) {
            throw new NotFoundException('Credenciamento não encontrado');
        }

        if (existingContract) {
            this.logger.log(
                `Contrato já existe para credential ${credentialId}, retornando existente`,
            );
            return existingContract;
        }

        // Preparar variáveis do template
        const variables = {
            brandName: credential.brand.legalName || credential.brand.tradeName,
            brandCnpj: this.formatCNPJ(credential.brand.document),
            brandAddress: this.formatAddress(credential.brand),
            supplierName: credential.legalName || credential.tradeName,
            supplierCnpj: this.formatCNPJ(credential.cnpj),
            supplierAddress: this.formatAddress(credential),
            date: new Date().toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
            }),
            paymentTerms: terms?.paymentTerms || DEFAULT_PAYMENT_TERMS,
            penaltyRate: terms?.penaltyRate || DEFAULT_PENALTY_RATE,
        };

        // Substituir variáveis no template
        let contractText = DEFAULT_CONTRACT_TEMPLATE;
        Object.entries(variables).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            contractText = contractText.replace(regex, value);
        });

        // Gerar PDF
        const fileName = `${credentialId}.pdf`;
        const filePath = path.join(this.uploadsPath, fileName);

        await this.generatePDF(contractText, filePath);

        // Calcular hash do documento
        const documentHash = await this.calculateFileHash(filePath);

        // Criar registro do contrato
        const contract = await this.prisma.supplierContract.create({
            data: {
                credentialId,
                templateId: 'default',
                templateVersion: '1.0',
                documentUrl: `/uploads/contracts/${fileName}`,
                documentHash,
                terms: terms as any,
                // Marca assina automaticamente (pode ser alterado futuramente)
                brandSignedAt: new Date(),
                brandSignedById: credential.brandId,
                brandSignatureIp: 'AUTO',
            },
        });

        // Atualizar status do credenciamento
        await this.updateCredentialStatus(
            credentialId,
            SupplierCredentialStatus.CONTRACT_PENDING,
            'Contrato gerado e aguardando assinatura da facção',
        );

        this.logger.log(
            `Contrato gerado com sucesso: ${contract.id} para credential ${credentialId}`,
        );

        return contract;
    }

    /**
     * Assinatura do contrato pela facção
     */
    async signContract(
        credentialId: string,
        supplierId: string,
        ipAddress: string,
    ) {
        // Buscar contrato
        const contract = await this.prisma.supplierContract.findUnique({
            where: { credentialId },
            include: {
                credential: true,
            },
        });

        if (!contract) {
            throw new NotFoundException(
                'Contrato não encontrado. Gere o contrato primeiro.',
            );
        }

        // Verificar se já foi assinado
        if (contract.supplierSignedAt) {
            throw new BadRequestException('Contrato já foi assinado');
        }

        // Atualizar assinatura
        await this.prisma.supplierContract.update({
            where: { id: contract.id },
            data: {
                supplierSignedAt: new Date(),
                supplierSignedById: supplierId,
                supplierSignatureIp: ipAddress,
            },
        });

        // Atualizar status do credenciamento para CONTRACT_SIGNED
        await this.updateCredentialStatus(
            credentialId,
            SupplierCredentialStatus.CONTRACT_SIGNED,
            'Contrato assinado pela facção',
        );

        // Ativar fornecedor automaticamente após assinatura
        await this.activateSupplier(credentialId);

        this.logger.log(
            `Contrato ${contract.id} assinado por ${supplierId} (IP: ${ipAddress})`,
        );

        return {
            success: true,
            signedAt: new Date(),
        };
    }

    /**
     * Buscar contrato por credentialId
     */
    async getContract(credentialId: string) {
        const contract = await this.prisma.supplierContract.findUnique({
            where: { credentialId },
            include: {
                credential: {
                    include: {
                        brand: {
                            select: {
                                tradeName: true,
                                legalName: true,
                                document: true,
                            },
                        },
                    },
                },
            },
        });

        if (!contract) {
            throw new NotFoundException('Contrato não encontrado');
        }

        return contract;
    }

    // ==================== RELATIONSHIP-BASED METHODS (N:M) ====================

    /**
     * Gera contrato para um relacionamento marca-facção
     * (Arquitetura N:M)
     */
    async generateContractForRelationship(
        relationshipId: string,
        terms?: Record<string, any>,
    ) {
        // Buscar relacionamento com supplier e brand
        const relationship = await this.prisma.supplierBrandRelationship.findUnique({
            where: { id: relationshipId },
            include: {
                supplier: true,
                brand: true,
            },
        });

        if (!relationship) {
            throw new NotFoundException('Relacionamento não encontrado');
        }

        // Verificar se já existe contrato para este relacionamento
        const existingContract = await this.prisma.supplierContract.findUnique({
            where: { relationshipId },
        });

        if (existingContract) {
            this.logger.log(
                `Contrato já existe para relationship ${relationshipId}, retornando existente`,
            );
            return existingContract;
        }

        // Preparar variáveis do template
        const variables = {
            brandName: relationship.brand.legalName || relationship.brand.tradeName,
            brandCnpj: this.formatCNPJ(relationship.brand.document),
            brandAddress: this.formatAddress(relationship.brand),
            supplierName: relationship.supplier.legalName || relationship.supplier.tradeName,
            supplierCnpj: this.formatCNPJ(relationship.supplier.document),
            supplierAddress: this.formatAddress(relationship.supplier),
            date: new Date().toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
            }),
            paymentTerms: terms?.paymentTerms || DEFAULT_PAYMENT_TERMS,
            penaltyRate: terms?.penaltyRate || DEFAULT_PENALTY_RATE,
        };

        // Substituir variáveis no template
        let contractText = DEFAULT_CONTRACT_TEMPLATE;
        Object.entries(variables).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            contractText = contractText.replace(regex, String(value));
        });

        // Gerar PDF
        const fileName = `contract-${relationshipId}.pdf`;
        const filePath = path.join(this.uploadsPath, fileName);

        await this.generatePDF(contractText, filePath);

        // Calcular hash do documento
        const fileBuffer = fs.readFileSync(filePath);
        const documentHash = crypto
            .createHash('sha256')
            .update(fileBuffer)
            .digest('hex');

        const documentUrl = `/uploads/contracts/${fileName}`;

        // Criar registro do contrato
        const contract = await this.prisma.supplierContract.create({
            data: {
                relationshipId,
                supplierId: relationship.supplierId,
                brandId: relationship.brandId,
                documentUrl,
                documentHash,
                terms: terms as any,
            },
        });

        this.logger.log(
            `Contrato gerado para relationship ${relationshipId}: ${documentUrl}`,
        );

        return contract;
    }

    /**
     * Assinar contrato de um relacionamento
     */
    async signContractForRelationship(
        relationshipId: string,
        supplierId: string,
        ipAddress: string,
    ) {
        // Buscar contrato
        const contract = await this.prisma.supplierContract.findUnique({
            where: { relationshipId },
        });

        if (!contract) {
            throw new NotFoundException(
                'Contrato não encontrado. Gere o contrato primeiro.',
            );
        }

        // Verificar se já foi assinado
        if (contract.supplierSignedAt) {
            throw new BadRequestException('Contrato já foi assinado');
        }

        // Atualizar assinatura
        await this.prisma.supplierContract.update({
            where: { id: contract.id },
            data: {
                supplierSignedAt: new Date(),
                supplierSignedById: supplierId,
                supplierSignatureIp: ipAddress,
            },
        });

        // Atualizar status do relacionamento para ACTIVE
        await this.prisma.supplierBrandRelationship.update({
            where: { id: relationshipId },
            data: {
                status: 'ACTIVE',
                activatedAt: new Date(),
            },
        });

        // Criar histórico
        await this.prisma.relationshipStatusHistory.create({
            data: {
                relationshipId,
                status: 'ACTIVE',
                notes: 'Contrato assinado pelo fornecedor',
                changedById: supplierId,
            },
        });

        this.logger.log(
            `Contrato do relationship ${relationshipId} assinado por supplier ${supplierId}`,
        );

        return contract;
    }

    /**
     * Buscar contrato por relacionamento
     */
    async getContractByRelationship(relationshipId: string) {
        const contract = await this.prisma.supplierContract.findUnique({
            where: { relationshipId },
            include: {
                relationship: {
                    include: {
                        brand: {
                            select: {
                                tradeName: true,
                                legalName: true,
                                document: true,
                            },
                        },
                        supplier: {
                            select: {
                                tradeName: true,
                                legalName: true,
                                document: true,
                            },
                        },
                    },
                },
            },
        });

        if (!contract) {
            throw new NotFoundException('Contrato não encontrado');
        }

        return contract;
    }

    // ==================== PRIVATE HELPERS ====================

    /**
     * Gera PDF usando PDFKit
     */
    private async generatePDF(text: string, outputPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    size: 'A4',
                    margins: {
                        top: 50,
                        bottom: 50,
                        left: 50,
                        right: 50,
                    },
                });

                const stream = fs.createWriteStream(outputPath);

                doc.pipe(stream);

                // Cabeçalho
                doc.fontSize(16)
                    .font('Helvetica-Bold')
                    .text('CONTRATO DE PRESTAÇÃO DE SERVIÇOS', { align: 'center' })
                    .moveDown();

                // Corpo do contrato
                doc.fontSize(10)
                    .font('Helvetica')
                    .text(text, {
                        align: 'justify',
                        lineGap: 2,
                    });

                // Rodapé
                doc.fontSize(8)
                    .text(
                        `\n\nDocumento gerado eletronicamente pela plataforma TexLink em ${new Date().toLocaleString('pt-BR')}`,
                        { align: 'center' },
                    );

                doc.end();

                stream.on('finish', resolve);
                stream.on('error', reject);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Calcula hash SHA-256 do arquivo
     */
    private async calculateFileHash(filePath: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash('sha256');
            const stream = fs.createReadStream(filePath);

            stream.on('data', (data) => hash.update(data));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
        });
    }

    /**
     * Atualiza status do credenciamento
     */
    private async updateCredentialStatus(
        credentialId: string,
        newStatus: SupplierCredentialStatus,
        reason: string,
    ) {
        const credential = await this.prisma.supplierCredential.findUnique({
            where: { id: credentialId },
        });

        if (!credential) return;

        await this.prisma.supplierCredential.update({
            where: { id: credentialId },
            data: { status: newStatus },
        });

        await this.prisma.credentialStatusHistory.create({
            data: {
                credentialId,
                fromStatus: credential.status,
                toStatus: newStatus,
                performedById: 'SYSTEM',
                reason,
            },
        });
    }

    /**
     * Ativa fornecedor após assinatura
     */
    private async activateSupplier(credentialId: string) {
        await this.updateCredentialStatus(
            credentialId,
            SupplierCredentialStatus.ACTIVE,
            'Fornecedor ativado após assinatura do contrato',
        );

        this.logger.log(`Fornecedor ${credentialId} ativado com sucesso`);
    }

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

    /**
     * Formata endereço para exibição
     */
    private formatAddress(entity: any): string {
        const parts = [
            entity.street,
            entity.number,
            entity.complement,
            entity.neighborhood,
            entity.city,
            entity.state,
            entity.zipCode,
        ].filter(Boolean);

        return parts.join(', ');
    }
}
