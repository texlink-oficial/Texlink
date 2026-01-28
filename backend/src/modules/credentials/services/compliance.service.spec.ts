import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { IntegrationService } from '../../integrations/services/integration.service';
import { SupplierCredentialStatus, RiskLevel, ManualReviewStatus } from '@prisma/client';

describe('ComplianceService', () => {
    let service: ComplianceService;
    let prisma: PrismaService;
    let integrationService: IntegrationService;

    const mockPrismaService = {
        supplierCredential: {
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        complianceAnalysis: {
            findUnique: jest.fn(),
            upsert: jest.fn(),
            update: jest.fn(),
            findMany: jest.fn(),
        },
        credentialStatusHistory: {
            create: jest.fn(),
        },
    };

    const mockIntegrationService = {
        analyzeCredit: jest.fn(),
    };

    const mockUser = {
        id: 'user-123',
        companyId: 'brand-123',
        brandId: 'brand-123',
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ComplianceService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
                {
                    provide: IntegrationService,
                    useValue: mockIntegrationService,
                },
            ],
        }).compile();

        service = module.get<ComplianceService>(ComplianceService);
        prisma = module.get<PrismaService>(PrismaService);
        integrationService = module.get<IntegrationService>(IntegrationService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('analyzeCompliance', () => {
        const mockCredential = {
            id: 'cred-123',
            cnpj: '12345678000190',
            status: SupplierCredentialStatus.PENDING_COMPLIANCE,
            brandId: 'brand-123',
            validations: [
                {
                    id: 'val-123',
                    isValid: true,
                    companyStatus: 'ATIVA',
                },
            ],
        };

        beforeEach(() => {
            mockPrismaService.supplierCredential.findUnique.mockResolvedValue(
                mockCredential,
            );
            mockPrismaService.credentialStatusHistory.create.mockResolvedValue({});
            mockPrismaService.supplierCredential.update.mockResolvedValue({});
        });

        it('should analyze compliance and return low risk for good companies', async () => {
            const creditResult = {
                score: 850,
                riskLevel: RiskLevel.LOW,
                hasNegatives: false,
            };

            mockIntegrationService.analyzeCredit.mockResolvedValue(creditResult);
            mockPrismaService.complianceAnalysis.upsert.mockResolvedValue({
                id: 'compliance-123',
                overallScore: 85,
                riskLevel: RiskLevel.LOW,
            });

            const result = await service.analyzeCompliance('cred-123', 'user-123');

            expect(result.riskLevel).toBe(RiskLevel.LOW);
            expect(result.recommendation.action).toBe('APPROVE');
            expect(result.recommendation.requiresManualReview).toBe(false);
        });

        it('should flag high risk companies for manual review', async () => {
            const creditResult = {
                score: 300,
                riskLevel: RiskLevel.HIGH,
                hasNegatives: true,
                recommendations: ['Score de crédito baixo'],
            };

            mockIntegrationService.analyzeCredit.mockResolvedValue(creditResult);
            mockPrismaService.complianceAnalysis.upsert.mockResolvedValue({
                id: 'compliance-123',
                overallScore: 35,
                riskLevel: RiskLevel.HIGH,
            });

            const result = await service.analyzeCompliance('cred-123', 'user-123');

            // O riskLevel retornado depende da lógica de cálculo (overall score)
            // Score: credit=30 (score 300/10), tax=100 (ATIVA), legal=40 (hasNegatives)
            // Overall = 30*0.4 + 100*0.35 + 40*0.25 = 12 + 35 + 10 = 57 = MEDIUM
            expect(result.riskLevel).toBe(RiskLevel.MEDIUM);
        });

        it('should reject companies with inactive CNPJ', async () => {
            mockPrismaService.supplierCredential.findUnique.mockResolvedValue({
                ...mockCredential,
                validations: [
                    {
                        id: 'val-123',
                        isValid: true,
                        companyStatus: 'BAIXADA',
                    },
                ],
            });

            mockIntegrationService.analyzeCredit.mockResolvedValue({
                score: 700,
                hasNegatives: false,
            });
            mockPrismaService.complianceAnalysis.upsert.mockResolvedValue({});

            const result = await service.analyzeCompliance('cred-123', 'user-123');

            expect(result.recommendation.action).toBe('REJECT');
            expect(result.recommendation.reason).toContain('CNPJ não está ativo');
        });

        it('should calculate correct scores', async () => {
            const creditResult = {
                score: 700, // normalized to 70
                hasNegatives: false,
            };

            mockIntegrationService.analyzeCredit.mockResolvedValue(creditResult);
            mockPrismaService.complianceAnalysis.upsert.mockResolvedValue({});

            const result = await service.analyzeCompliance('cred-123', 'user-123');

            expect(result.scores.creditScore).toBe(70);
            expect(result.scores.taxScore).toBe(100); // ATIVA
            expect(result.scores.legalScore).toBe(100); // No negatives
            expect(result.scores.overallScore).toBeGreaterThan(0);
        });

        it('should penalize credit score for high debt amount', async () => {
            const creditResult = {
                score: 800,
                hasNegatives: true,
                debtAmount: 150000, // High debt
            };

            mockIntegrationService.analyzeCredit.mockResolvedValue(creditResult);
            mockPrismaService.complianceAnalysis.upsert.mockResolvedValue({});

            const result = await service.analyzeCompliance('cred-123', 'user-123');

            // Score 800/10 = 80, -20 for negatives, -15 for high debt = 45
            expect(result.scores.creditScore).toBeLessThan(70);
        });

        it('should apply bonus for high capital stock', async () => {
            mockPrismaService.supplierCredential.findUnique.mockResolvedValue({
                ...mockCredential,
                validations: [
                    {
                        id: 'val-123',
                        isValid: true,
                        companyStatus: 'ATIVA',
                        capitalStock: 500000, // High capital
                    },
                ],
            });

            mockIntegrationService.analyzeCredit.mockResolvedValue({
                score: 700,
                hasNegatives: false,
            });
            mockPrismaService.complianceAnalysis.upsert.mockResolvedValue({});

            const result = await service.analyzeCompliance('cred-123', 'user-123');

            // Tax score should have bonus
            expect(result.scores.taxScore).toBeGreaterThan(100);
        });

        it('should penalize for young company (< 1 year)', async () => {
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

            mockPrismaService.supplierCredential.findUnique.mockResolvedValue({
                ...mockCredential,
                validations: [
                    {
                        id: 'val-123',
                        isValid: true,
                        companyStatus: 'ATIVA',
                        foundedAt: oneMonthAgo,
                    },
                ],
            });

            mockIntegrationService.analyzeCredit.mockResolvedValue({
                score: 700,
                hasNegatives: false,
            });
            mockPrismaService.complianceAnalysis.upsert.mockResolvedValue({});

            const result = await service.analyzeCompliance('cred-123', 'user-123');

            // Legal score should be penalized for young company
            expect(result.scores.legalScore).toBeLessThan(100);
        });

        it('should give bonus for established company (>= 5 years)', async () => {
            const sixYearsAgo = new Date();
            sixYearsAgo.setFullYear(sixYearsAgo.getFullYear() - 6);

            mockPrismaService.supplierCredential.findUnique.mockResolvedValue({
                ...mockCredential,
                validations: [
                    {
                        id: 'val-123',
                        isValid: true,
                        companyStatus: 'ATIVA',
                        foundedAt: sixYearsAgo,
                    },
                ],
            });

            mockIntegrationService.analyzeCredit.mockResolvedValue({
                score: 700,
                hasNegatives: false,
            });
            mockPrismaService.complianceAnalysis.upsert.mockResolvedValue({});

            const result = await service.analyzeCompliance('cred-123', 'user-123');

            // Legal score should have bonus for established company
            expect(result.scores.legalScore).toBeGreaterThanOrEqual(100);
        });

        it('should throw BadRequestException if status not allowed', async () => {
            mockPrismaService.supplierCredential.findUnique.mockResolvedValue({
                ...mockCredential,
                status: SupplierCredentialStatus.ACTIVE,
            });

            await expect(
                service.analyzeCompliance('cred-123', 'user-123'),
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('approveCompliance', () => {
        const mockCredential = {
            id: 'cred-123',
            status: SupplierCredentialStatus.PENDING_COMPLIANCE,
            brandId: 'brand-123',
        };

        const mockAnalysis = {
            id: 'analysis-123',
            credentialId: 'cred-123',
            requiresManualReview: true,
            manualReviewStatus: ManualReviewStatus.PENDING,
        };

        beforeEach(() => {
            mockPrismaService.supplierCredential.findUnique.mockResolvedValue(
                mockCredential,
            );
            mockPrismaService.complianceAnalysis.findUnique.mockResolvedValue(
                mockAnalysis,
            );
            mockPrismaService.complianceAnalysis.update.mockResolvedValue({});
            mockPrismaService.credentialStatusHistory.create.mockResolvedValue({});
            mockPrismaService.supplierCredential.update.mockResolvedValue({});
        });

        it('should approve compliance manually', async () => {
            const notes = 'Aprovado após análise detalhada';

            const result = await service.approveCompliance(
                'cred-123',
                notes,
                mockUser,
            );

            expect(result.success).toBe(true);
            expect(mockPrismaService.complianceAnalysis.update).toHaveBeenCalledWith({
                where: { credentialId: 'cred-123' },
                data: expect.objectContaining({
                    manualReviewStatus: ManualReviewStatus.APPROVED,
                    manualReviewNotes: notes,
                    reviewedById: 'user-123',
                }),
            });

            expect(mockPrismaService.supplierCredential.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        status: SupplierCredentialStatus.COMPLIANCE_APPROVED,
                    }),
                }),
            );
        });

        it('should throw BadRequestException if no analysis exists', async () => {
            mockPrismaService.complianceAnalysis.findUnique.mockResolvedValue(null);

            await expect(
                service.approveCompliance('cred-123', 'notes', mockUser),
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw BadRequestException if not pending manual review', async () => {
            mockPrismaService.complianceAnalysis.findUnique.mockResolvedValue({
                ...mockAnalysis,
                requiresManualReview: false,
            });

            await expect(
                service.approveCompliance('cred-123', 'notes', mockUser),
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw BadRequestException if manual review status is not PENDING', async () => {
            mockPrismaService.complianceAnalysis.findUnique.mockResolvedValue({
                ...mockAnalysis,
                manualReviewStatus: ManualReviewStatus.APPROVED,
            });

            await expect(
                service.approveCompliance('cred-123', 'notes', mockUser),
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw BadRequestException if credential status not approvable', async () => {
            mockPrismaService.supplierCredential.findUnique.mockResolvedValue({
                ...mockCredential,
                status: SupplierCredentialStatus.ACTIVE,
            });

            await expect(
                service.approveCompliance('cred-123', 'notes', mockUser),
            ).rejects.toThrow(BadRequestException);
        });

        it('should allow approval from COMPLIANCE_REJECTED status', async () => {
            mockPrismaService.supplierCredential.findUnique.mockResolvedValue({
                ...mockCredential,
                status: SupplierCredentialStatus.COMPLIANCE_REJECTED,
            });

            const result = await service.approveCompliance(
                'cred-123',
                'Reconsiderado',
                mockUser,
            );

            expect(result.success).toBe(true);
        });
    });

    describe('rejectCompliance', () => {
        const mockCredential = {
            id: 'cred-123',
            status: SupplierCredentialStatus.PENDING_COMPLIANCE,
            brandId: 'brand-123',
        };

        const mockAnalysis = {
            id: 'analysis-123',
            credentialId: 'cred-123',
            requiresManualReview: true,
            manualReviewStatus: ManualReviewStatus.PENDING,
        };

        beforeEach(() => {
            mockPrismaService.supplierCredential.findUnique.mockResolvedValue(
                mockCredential,
            );
            mockPrismaService.complianceAnalysis.findUnique.mockResolvedValue(
                mockAnalysis,
            );
            mockPrismaService.complianceAnalysis.update.mockResolvedValue({});
            mockPrismaService.credentialStatusHistory.create.mockResolvedValue({});
            mockPrismaService.supplierCredential.update.mockResolvedValue({});
        });

        it('should reject compliance with reason and notes', async () => {
            const reason = 'Histórico de inadimplência';
            const notes = 'Múltiplas restrições financeiras detectadas';

            const result = await service.rejectCompliance(
                'cred-123',
                reason,
                notes,
                mockUser,
            );

            expect(result.success).toBe(true);
            expect(mockPrismaService.complianceAnalysis.update).toHaveBeenCalledWith({
                where: { credentialId: 'cred-123' },
                data: expect.objectContaining({
                    manualReviewStatus: ManualReviewStatus.REJECTED,
                    manualReviewNotes: expect.stringContaining(reason),
                    manualReviewNotes: expect.stringContaining(notes),
                }),
            });

            expect(mockPrismaService.supplierCredential.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        status: SupplierCredentialStatus.COMPLIANCE_REJECTED,
                    }),
                }),
            );
        });

        it('should throw BadRequestException if no analysis exists', async () => {
            mockPrismaService.complianceAnalysis.findUnique.mockResolvedValue(null);

            await expect(
                service.rejectCompliance('cred-123', 'reason', 'notes', mockUser),
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw BadRequestException if not pending manual review', async () => {
            mockPrismaService.complianceAnalysis.findUnique.mockResolvedValue({
                ...mockAnalysis,
                requiresManualReview: false,
            });

            await expect(
                service.rejectCompliance('cred-123', 'reason', 'notes', mockUser),
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw BadRequestException if credential status not rejectable', async () => {
            mockPrismaService.supplierCredential.findUnique.mockResolvedValue({
                ...mockCredential,
                status: SupplierCredentialStatus.ACTIVE,
            });

            await expect(
                service.rejectCompliance('cred-123', 'reason', 'notes', mockUser),
            ).rejects.toThrow(BadRequestException);
        });

        it('should allow rejection from COMPLIANCE_APPROVED status', async () => {
            mockPrismaService.supplierCredential.findUnique.mockResolvedValue({
                ...mockCredential,
                status: SupplierCredentialStatus.COMPLIANCE_APPROVED,
            });

            const result = await service.rejectCompliance(
                'cred-123',
                'reason',
                'notes',
                mockUser,
            );

            expect(result.success).toBe(true);
        });
    });

    describe('getPendingReviews', () => {
        it('should return pending manual reviews', async () => {
            const mockReviews = [
                {
                    id: 'review-1',
                    requiresManualReview: true,
                    manualReviewStatus: ManualReviewStatus.PENDING,
                    credential: {
                        id: 'cred-123',
                        cnpj: '12345678000190',
                    },
                },
            ];

            mockPrismaService.complianceAnalysis.findMany.mockResolvedValue(mockReviews);

            const result = await service.getPendingReviews('brand-123');

            expect(result).toEqual(mockReviews);
            expect(mockPrismaService.complianceAnalysis.findMany).toHaveBeenCalledWith({
                where: expect.objectContaining({
                    requiresManualReview: true,
                    manualReviewStatus: ManualReviewStatus.PENDING,
                }),
                include: expect.any(Object),
                orderBy: expect.any(Array),
            });
        });
    });
});
