import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import {
  IRestrictionsProvider,
  RestrictionsAnalysisResult,
  RestrictionInfo,
  RestrictionType,
} from './restrictions-provider.interface';
import { firstValueFrom } from 'rxjs';

/**
 * Portal da Transparência Restrictions Provider
 *
 * Integrates with the Brazilian Federal Government Transparency Portal API
 * to check for CEIS, CNEP, CEPIM, and other restrictions.
 *
 * Requires:
 * - PORTAL_TRANSPARENCIA_API_URL: API endpoint (default: https://api.portaldatransparencia.gov.br)
 * - PORTAL_TRANSPARENCIA_API_KEY: API key (chave-api-dados)
 *
 * Documentation: https://api.portaldatransparencia.gov.br/swagger-ui.html
 */
@Injectable()
export class PortalTransparenciaProvider implements IRestrictionsProvider {
  readonly name = 'PORTAL_TRANSPARENCIA';

  private readonly logger = new Logger(PortalTransparenciaProvider.name);
  private readonly apiUrl: string;
  private readonly apiKey: string | undefined;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiUrl = this.configService.get<string>(
      'PORTAL_TRANSPARENCIA_API_URL',
      'https://api.portaldatransparencia.gov.br',
    );
    this.apiKey = this.configService.get<string>(
      'PORTAL_TRANSPARENCIA_API_KEY',
    );

    if (this.apiKey) {
      this.logger.log('Portal da Transparência provider configured and ready');
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async analyze(cnpj: string): Promise<RestrictionsAnalysisResult> {
    const cleanCnpj = cnpj.replace(/\D/g, '');

    if (!(await this.isAvailable())) {
      return {
        hasRestrictions: false,
        totalRestrictions: 0,
        riskLevel: 'LOW',
        recommendations: [
          'Portal da Transparência não configurado. Configure as credenciais.',
        ],
        source: this.name,
        timestamp: new Date(),
        error:
          'Portal da Transparência provider not configured. Set PORTAL_TRANSPARENCIA_API_KEY.',
      };
    }

    try {
      this.logger.log(
        `Analyzing restrictions for CNPJ: ${this.maskCnpj(cleanCnpj)}`,
      );

      // Query multiple endpoints in parallel
      const [ceis, cnep, cepim] = await Promise.all([
        this.queryCEIS(cleanCnpj),
        this.queryCNEP(cleanCnpj),
        this.queryCEPIM(cleanCnpj),
      ]);

      const allRestrictions = [...ceis, ...cnep, ...cepim];
      const activeRestrictions = allRestrictions.filter(
        (r) => r.status === 'ACTIVE',
      );

      return this.buildResult(activeRestrictions, allRestrictions);
    } catch (error) {
      this.logger.error(`Portal da Transparência API error: ${error.message}`);

      return {
        hasRestrictions: false,
        totalRestrictions: 0,
        riskLevel: 'LOW',
        recommendations: [
          'Erro ao consultar Portal da Transparência. Tente novamente mais tarde.',
        ],
        source: this.name,
        timestamp: new Date(),
        error: error.message,
      };
    }
  }

  /**
   * Query CEIS (Cadastro de Empresas Inidôneas e Suspensas)
   */
  private async queryCEIS(cnpj: string): Promise<RestrictionInfo[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.apiUrl}/api-de-dados/ceis?cnpjSancionado=${cnpj}`,
          { headers: this.getHeaders() },
        ),
      );

      return (response.data || []).map((item: any) => ({
        type: 'CEIS' as RestrictionType,
        description:
          item.textoFundamentacao ||
          'Empresa declarada inidônea ou suspensa',
        origin: item.orgaoSancionador?.nome || 'Órgão não informado',
        startDate: item.dataInicioSancao
          ? new Date(item.dataInicioSancao)
          : undefined,
        endDate: item.dataFimSancao
          ? new Date(item.dataFimSancao)
          : undefined,
        status: this.determineStatus(item.dataFimSancao),
        details: item.numeroProcesso
          ? `Processo: ${item.numeroProcesso}`
          : undefined,
      }));
    } catch (error) {
      this.logger.warn(`CEIS query failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Query CNEP (Cadastro Nacional de Empresas Punidas)
   */
  private async queryCNEP(cnpj: string): Promise<RestrictionInfo[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.apiUrl}/api-de-dados/cnep?cnpjSancionado=${cnpj}`,
          { headers: this.getHeaders() },
        ),
      );

      return (response.data || []).map((item: any) => ({
        type: 'CNEP' as RestrictionType,
        description:
          item.fundamentacaoLegal ||
          'Punição por ato lesivo à administração pública',
        origin: item.orgaoSancionador?.nome || 'Órgão não informado',
        startDate: item.dataInicioSancao
          ? new Date(item.dataInicioSancao)
          : undefined,
        endDate: item.dataFimSancao
          ? new Date(item.dataFimSancao)
          : undefined,
        value: item.valorMulta,
        status: this.determineStatus(item.dataFimSancao),
        details: item.numeroProcesso
          ? `Processo: ${item.numeroProcesso}`
          : undefined,
      }));
    } catch (error) {
      this.logger.warn(`CNEP query failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Query CEPIM (Cadastro de Entidades Privadas Sem Fins Lucrativos Impedidas)
   */
  private async queryCEPIM(cnpj: string): Promise<RestrictionInfo[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.apiUrl}/api-de-dados/cepim?cnpjSancionado=${cnpj}`,
          { headers: this.getHeaders() },
        ),
      );

      return (response.data || []).map((item: any) => ({
        type: 'CEPIM' as RestrictionType,
        description: item.motivoImpedimento || 'Entidade impedida',
        origin: item.orgaoSuperior?.nome || 'Órgão não informado',
        startDate: item.dataReferencia
          ? new Date(item.dataReferencia)
          : undefined,
        status: 'ACTIVE' as const,
        details: item.convenio ? `Convênio: ${item.convenio}` : undefined,
      }));
    } catch (error) {
      this.logger.warn(`CEPIM query failed: ${error.message}`);
      return [];
    }
  }

  private getHeaders() {
    return {
      'chave-api-dados': this.apiKey,
      Accept: 'application/json',
    };
  }

  private determineStatus(
    endDate?: string,
  ): 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' {
    if (!endDate) return 'ACTIVE';
    return new Date(endDate) > new Date() ? 'ACTIVE' : 'EXPIRED';
  }

  private buildResult(
    activeRestrictions: RestrictionInfo[],
    allRestrictions: RestrictionInfo[],
  ): RestrictionsAnalysisResult {
    const hasRestrictions = activeRestrictions.length > 0;

    // Determine risk level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    const recommendations: string[] = [];

    if (!hasRestrictions) {
      recommendations.push('Nenhuma restrição encontrada em cadastros federais');
      recommendations.push('Empresa apta a contratar com órgãos públicos');
    } else {
      const hasCEIS = activeRestrictions.some((r) => r.type === 'CEIS');
      const hasCNEP = activeRestrictions.some((r) => r.type === 'CNEP');

      if (hasCEIS || hasCNEP) {
        riskLevel = 'CRITICAL';
        recommendations.push('Empresa com restrições graves identificadas');
        recommendations.push(
          'Impedida de contratar com a administração pública federal',
        );
        recommendations.push(
          'Não recomendado estabelecer parceria comercial',
        );
      } else {
        riskLevel = 'HIGH';
        recommendations.push(
          `${activeRestrictions.length} restrição(ões) identificada(s)`,
        );
        recommendations.push('Verificar situação antes de prosseguir');
        recommendations.push('Solicitar documentação de regularização');
      }
    }

    return {
      hasRestrictions,
      totalRestrictions: activeRestrictions.length,
      restrictions: allRestrictions.length > 0 ? allRestrictions : undefined,
      riskLevel,
      recommendations,
      source: this.name,
      timestamp: new Date(),
    };
  }

  private maskCnpj(cnpj: string): string {
    if (cnpj.length !== 14) return cnpj;
    return `${cnpj.slice(0, 5)}.***/****-**`;
  }
}
