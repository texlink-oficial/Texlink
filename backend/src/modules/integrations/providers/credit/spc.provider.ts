import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { RiskLevel } from '@prisma/client';
import {
  ICreditProvider,
  CreditAnalysisResult,
} from './credit-provider.interface';
import { firstValueFrom } from 'rxjs';

/**
 * SPC Brasil Credit Provider
 *
 * Structure ready for production integration.
 * Requires:
 * - SPC_API_URL: API endpoint URL
 * - SPC_USERNAME: API username
 * - SPC_PASSWORD: API password
 *
 * Documentation: https://www.spcbrasil.org.br/
 */
@Injectable()
export class SPCCreditProvider implements ICreditProvider {
  readonly name = 'SPC';

  private readonly logger = new Logger(SPCCreditProvider.name);
  private readonly apiUrl: string | undefined;
  private readonly username: string | undefined;
  private readonly password: string | undefined;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiUrl = this.configService.get<string>('SPC_API_URL');
    this.username = this.configService.get<string>('SPC_USERNAME');
    this.password = this.configService.get<string>('SPC_PASSWORD');

    if (this.apiUrl && this.username && this.password) {
      this.logger.log('SPC provider configured and ready');
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!(this.apiUrl && this.username && this.password);
  }

  async analyze(cnpj: string): Promise<CreditAnalysisResult> {
    const cleanCnpj = cnpj.replace(/\D/g, '');

    if (!(await this.isAvailable())) {
      return {
        score: 0,
        riskLevel: RiskLevel.MEDIUM,
        hasNegatives: false,
        recommendations: ['SPC não configurado. Configure as credenciais.'],
        source: this.name,
        timestamp: new Date(),
        error: 'SPC provider not configured. Set SPC_* environment variables.',
      };
    }

    try {
      this.logger.log(`Analyzing credit for CNPJ: ${this.maskCnpj(cleanCnpj)}`);

      // Make API request to SPC
      // NOTE: This is a placeholder structure. Actual endpoint and payload
      // will depend on the specific SPC product/plan contracted.
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.apiUrl}/consultas/pj`,
          {
            cnpj: cleanCnpj,
            tipoConsulta: 'COMPLETA', // or specific product code
          },
          {
            auth: {
              username: this.username!,
              password: this.password!,
            },
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return this.parseSPCResponse(response.data, cleanCnpj);
    } catch (error) {
      this.logger.error(`SPC API error: ${error.message}`);

      return {
        score: 0,
        riskLevel: RiskLevel.MEDIUM,
        hasNegatives: false,
        recommendations: ['Erro ao consultar SPC. Tente novamente mais tarde.'],
        source: this.name,
        timestamp: new Date(),
        error: error.message,
      };
    }
  }

  /**
   * Parse SPC API response into standardized format
   * NOTE: Adjust based on actual SPC response structure
   */
  private parseSPCResponse(data: any, cnpj: string): CreditAnalysisResult {
    // This is a placeholder structure. Actual parsing will depend on
    // the specific SPC product response format.
    const score = data.score || data.pontuacao || 500;
    const hasNegatives =
      data.temRestricoes ||
      data.registros?.length > 0 ||
      false;

    // Calculate risk level based on score
    let riskLevel: RiskLevel;
    if (score >= 700) {
      riskLevel = RiskLevel.LOW;
    } else if (score >= 500) {
      riskLevel = RiskLevel.MEDIUM;
    } else if (score >= 300) {
      riskLevel = RiskLevel.HIGH;
    } else {
      riskLevel = RiskLevel.CRITICAL;
    }

    // Parse negatives if present
    const negatives = data.registros?.map((reg: any) => ({
      tipo: reg.tipo || reg.natureza,
      valor: reg.valor,
      dataOcorrencia: reg.data || reg.dataInclusao,
      credor: reg.credor || reg.associado,
      contrato: reg.contrato,
      cidade: reg.cidade,
      uf: reg.uf,
    }));

    // Parse cheques sem fundo if present
    const chequesSemFundo = data.cheques
      ? [{
          quantidade: data.cheques.quantidade || 0,
          dataUltimaOcorrencia: data.cheques.ultimaOcorrencia,
          banco: data.cheques.banco,
          motivo: data.cheques.motivo,
        }]
      : undefined;

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      score,
      hasNegatives,
      riskLevel,
    );

    return {
      score,
      riskLevel,
      hasNegatives,
      negatives: negatives?.length > 0 ? negatives : undefined,
      chequesSemFundo: chequesSemFundo && chequesSemFundo[0]?.quantidade > 0 ? chequesSemFundo : undefined,
      summary: data.resumo
        ? {
            totalDividas: data.resumo.totalValor || 0,
            quantidadeNegativacoes: data.resumo.quantidadeRegistros || 0,
            quantidadeProtestos: data.resumo.quantidadeProtestos || 0,
            quantidadeChequesSemFundo: data.cheques?.quantidade || 0,
            maiorDivida: data.resumo.maiorValor || 0,
            dividaMaisAntiga: data.resumo.registroMaisAntigo,
            dividaMaisRecente: data.resumo.registroMaisRecente,
          }
        : undefined,
      recommendations,
      source: this.name,
      timestamp: new Date(),
      rawResponse: data,
    };
  }

  private generateRecommendations(
    score: number,
    hasNegatives: boolean,
    riskLevel: RiskLevel,
  ): string[] {
    const recommendations: string[] = [];

    switch (riskLevel) {
      case RiskLevel.LOW:
        recommendations.push('Empresa sem restrições no SPC');
        recommendations.push('Histórico limpo - baixo risco');
        recommendations.push('Condições comerciais padrão aplicáveis');
        break;

      case RiskLevel.MEDIUM:
        recommendations.push('Histórico de crédito com algumas ressalvas');
        recommendations.push('Recomendado verificar referências comerciais');
        if (hasNegatives) {
          recommendations.push('Verificar status das pendências encontradas');
        }
        break;

      case RiskLevel.HIGH:
        recommendations.push('Restrições ativas encontradas');
        recommendations.push('Negociar garantias antes de fechar parceria');
        recommendations.push('Considerar limites de crédito reduzidos');
        break;

      case RiskLevel.CRITICAL:
        recommendations.push('Múltiplas restrições graves encontradas');
        recommendations.push('Não recomendado crédito sem garantias reais');
        recommendations.push('Empresa necessita regularização urgente');
        break;
    }

    return recommendations;
  }

  private maskCnpj(cnpj: string): string {
    if (cnpj.length !== 14) return cnpj;
    return `${cnpj.slice(0, 5)}.***/****-**`;
  }
}
