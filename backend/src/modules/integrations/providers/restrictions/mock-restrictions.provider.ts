import { Injectable, Logger } from '@nestjs/common';
import {
  IRestrictionsProvider,
  RestrictionsAnalysisResult,
  RestrictionType,
} from './restrictions-provider.interface';

/**
 * Mock Restrictions Provider
 *
 * Provides simulated restrictions analysis for development and testing.
 * Returns realistic-looking data based on CNPJ patterns.
 */
@Injectable()
export class MockRestrictionsProvider implements IRestrictionsProvider {
  readonly name = 'MOCK_RESTRICTIONS';

  private readonly logger = new Logger(MockRestrictionsProvider.name);

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async analyze(cnpj: string): Promise<RestrictionsAnalysisResult> {
    const cleanCnpj = cnpj.replace(/\D/g, '');

    this.logger.log(
      `[MOCK] Analyzing restrictions for CNPJ: ${this.maskCnpj(cleanCnpj)}`,
    );

    // Simulate API delay
    await this.delay(200 + Math.random() * 150);

    // Use CNPJ digits to generate deterministic but varied results
    const cnpjSum = cleanCnpj
      .split('')
      .reduce((sum, digit) => sum + parseInt(digit, 10), 0);

    // 10% chance of having restrictions (based on CNPJ pattern)
    const hasRestrictions = cnpjSum % 10 === 0;
    const totalRestrictions = hasRestrictions ? (cnpjSum % 2) + 1 : 0;

    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    const recommendations: string[] = [];

    if (!hasRestrictions) {
      recommendations.push('Nenhuma restrição encontrada em cadastros públicos');
      recommendations.push('Empresa apta a contratar com órgãos públicos');
      recommendations.push('Situação cadastral regular');
    } else {
      const restrictions = this.generateMockRestrictions(
        totalRestrictions,
        cnpjSum,
      );

      // Check for critical restrictions
      const hasCritical = restrictions.some(
        (r) => r.type === 'CEIS' || r.type === 'CNEP',
      );
      const hasCADIN = restrictions.some((r) => r.type === 'CADIN');

      if (hasCritical) {
        riskLevel = 'CRITICAL';
        recommendations.push('Empresa com restrições graves identificadas');
        recommendations.push('Impedida de contratar com administração pública');
        recommendations.push('Não recomendado estabelecer parceria');
      } else if (hasCADIN) {
        riskLevel = 'HIGH';
        recommendations.push('Empresa inscrita no CADIN');
        recommendations.push('Pendências com órgãos públicos federais');
        recommendations.push('Solicitar comprovante de regularização');
      } else {
        riskLevel = 'MEDIUM';
        recommendations.push('Restrições menores identificadas');
        recommendations.push('Verificar situação antes de prosseguir');
      }

      return {
        hasRestrictions: true,
        totalRestrictions,
        restrictions,
        riskLevel,
        recommendations,
        source: this.name,
        timestamp: new Date(),
      };
    }

    return {
      hasRestrictions: false,
      totalRestrictions: 0,
      riskLevel,
      recommendations,
      source: this.name,
      timestamp: new Date(),
    };
  }

  private generateMockRestrictions(count: number, seed: number) {
    const types: RestrictionType[] = ['CADIN', 'CEIS', 'CNEP', 'PGFN', 'TCU'];
    const origins = [
      'Ministério da Fazenda',
      'Controladoria-Geral da União',
      'Tribunal de Contas da União',
      'Procuradoria da Fazenda Nacional',
    ];

    return Array.from({ length: count }, (_, i) => ({
      type: types[(seed + i) % types.length],
      description: this.getDescriptionForType(types[(seed + i) % types.length]),
      origin: origins[(seed + i) % origins.length],
      startDate: new Date(
        Date.now() - (180 + (seed % 365)) * 24 * 60 * 60 * 1000,
      ),
      value:
        types[(seed + i) % types.length] === 'CADIN'
          ? 10000 + ((seed + i) % 50) * 1000
          : undefined,
      status: 'ACTIVE' as const,
      details: `Registro ${types[(seed + i) % types.length]}-${2020 + (i % 4)}-${100000 + seed}`,
    }));
  }

  private getDescriptionForType(type: RestrictionType): string {
    switch (type) {
      case 'CADIN':
        return 'Débito não quitado junto ao setor público federal';
      case 'CEIS':
        return 'Empresa declarada inidônea ou suspensa';
      case 'CNEP':
        return 'Punição por ato lesivo à administração pública';
      case 'TCU':
        return 'Irregularidade identificada pelo TCU';
      case 'PGFN':
        return 'Débito inscrito na dívida ativa da União';
      default:
        return 'Restrição cadastral identificada';
    }
  }

  private maskCnpj(cnpj: string): string {
    if (cnpj.length !== 14) return cnpj;
    return `${cnpj.slice(0, 5)}.***/****-**`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
