import { Injectable, Logger } from '@nestjs/common';
import {
  ILegalProvider,
  LegalAnalysisResult,
} from './legal-provider.interface';

/**
 * Mock Legal Provider
 *
 * Provides simulated legal analysis for development and testing.
 * Returns realistic-looking data based on CNPJ patterns.
 */
@Injectable()
export class MockLegalProvider implements ILegalProvider {
  readonly name = 'MOCK_LEGAL';

  private readonly logger = new Logger(MockLegalProvider.name);

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async analyze(cnpj: string): Promise<LegalAnalysisResult> {
    const cleanCnpj = cnpj.replace(/\D/g, '');

    this.logger.log(
      `[MOCK] Analyzing legal issues for CNPJ: ${this.maskCnpj(cleanCnpj)}`,
    );

    // Simulate API delay
    await this.delay(300 + Math.random() * 200);

    // Use CNPJ digits to generate deterministic but varied results
    const cnpjSum = cleanCnpj
      .split('')
      .reduce((sum, digit) => sum + parseInt(digit, 10), 0);

    // 15% chance of having legal issues (based on CNPJ pattern)
    const hasLegalIssues = cnpjSum % 7 === 0;
    const activeLawsuitsCount = hasLegalIssues ? (cnpjSum % 3) + 1 : 0;

    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    const recommendations: string[] = [];

    if (!hasLegalIssues) {
      recommendations.push('Nenhum processo judicial ativo encontrado');
      recommendations.push('Empresa com situação jurídica regular');
    } else {
      const totalValue = activeLawsuitsCount * (50000 + (cnpjSum % 10) * 10000);

      if (activeLawsuitsCount === 1 && totalValue < 100000) {
        riskLevel = 'MEDIUM';
        recommendations.push('Processo judicial ativo identificado');
        recommendations.push('Recomendado acompanhamento do caso');
      } else if (activeLawsuitsCount <= 2) {
        riskLevel = 'HIGH';
        recommendations.push('Múltiplos processos judiciais identificados');
        recommendations.push('Recomendada análise detalhada antes de aprovação');
        recommendations.push('Considerar garantias adicionais');
      } else {
        riskLevel = 'CRITICAL';
        recommendations.push('Alto volume de processos judiciais');
        recommendations.push('Risco elevado de inadimplência');
        recommendations.push('Não recomendado crédito sem garantias reais');
      }

      return {
        hasLegalIssues: true,
        activeLawsuitsCount,
        totalLawsuitValue: totalValue,
        lawsuits: this.generateMockLawsuits(activeLawsuitsCount, cnpjSum),
        riskLevel,
        recommendations,
        source: this.name,
        timestamp: new Date(),
      };
    }

    return {
      hasLegalIssues: false,
      activeLawsuitsCount: 0,
      riskLevel,
      recommendations,
      source: this.name,
      timestamp: new Date(),
    };
  }

  private generateMockLawsuits(count: number, seed: number) {
    const types = ['TRABALHISTA', 'CÍVEL', 'TRIBUTÁRIO', 'CONSUMIDOR'];
    const courts = [
      'TRT 2ª Região',
      'TJSP',
      'TRF 3ª Região',
      'Juizado Especial Cível',
    ];
    const statuses = ['EM ANDAMENTO', 'AGUARDANDO JULGAMENTO', 'RECURSO'];

    return Array.from({ length: count }, (_, i) => ({
      number: `${1000000 + seed + i}-${20 + (i % 5)}.${2020 + (i % 4)}.8.26.0100`,
      court: courts[(seed + i) % courts.length],
      type: types[(seed + i) % types.length],
      status: statuses[(seed + i) % statuses.length],
      filingDate: new Date(
        Date.now() - (365 + (seed % 730)) * 24 * 60 * 60 * 1000,
      ),
      value: 50000 + ((seed + i) % 10) * 10000,
      description: `Processo ${types[(seed + i) % types.length].toLowerCase()} em andamento`,
    }));
  }

  private maskCnpj(cnpj: string): string {
    if (cnpj.length !== 14) return cnpj;
    return `${cnpj.slice(0, 5)}.***/****-**`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
