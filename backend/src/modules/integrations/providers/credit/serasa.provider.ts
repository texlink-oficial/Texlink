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
 * Serasa Experian Credit Provider
 *
 * Structure ready for production integration.
 * Requires:
 * - SERASA_API_URL: API endpoint URL
 * - SERASA_CLIENT_ID: OAuth client ID
 * - SERASA_CLIENT_SECRET: OAuth client secret
 *
 * Documentation: https://developers.serasaexperian.com.br/
 */
@Injectable()
export class SerasaCreditProvider implements ICreditProvider {
  readonly name = 'SERASA';

  private readonly logger = new Logger(SerasaCreditProvider.name);
  private readonly apiUrl: string | undefined;
  private readonly clientId: string | undefined;
  private readonly clientSecret: string | undefined;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiUrl = this.configService.get<string>('SERASA_API_URL');
    this.clientId = this.configService.get<string>('SERASA_CLIENT_ID');
    this.clientSecret = this.configService.get<string>('SERASA_CLIENT_SECRET');

    if (this.apiUrl && this.clientId && this.clientSecret) {
      this.logger.log('Serasa provider configured and ready');
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!(this.apiUrl && this.clientId && this.clientSecret);
  }

  async analyze(cnpj: string): Promise<CreditAnalysisResult> {
    const cleanCnpj = cnpj.replace(/\D/g, '');

    if (!(await this.isAvailable())) {
      return {
        score: 0,
        riskLevel: RiskLevel.MEDIUM,
        hasNegatives: false,
        recommendations: ['Serasa não configurado. Configure as credenciais.'],
        source: this.name,
        timestamp: new Date(),
        error: 'Serasa provider not configured. Set SERASA_* environment variables.',
      };
    }

    try {
      // Get or refresh access token
      await this.ensureAccessToken();

      this.logger.log(`Analyzing credit for CNPJ: ${this.maskCnpj(cleanCnpj)}`);

      // Make API request to Serasa
      // NOTE: This is a placeholder structure. Actual endpoint and payload
      // will depend on the specific Serasa product/plan contracted.
      const response = await firstValueFrom(
        this.httpService.get(`${this.apiUrl}/consulta/cnpj/${cleanCnpj}`, {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      return this.parseSerasaResponse(response.data, cleanCnpj);
    } catch (error) {
      this.logger.error(`Serasa API error: ${error.message}`);

      // Return error result without throwing
      return {
        score: 0,
        riskLevel: RiskLevel.MEDIUM,
        hasNegatives: false,
        recommendations: [
          'Erro ao consultar Serasa. Tente novamente mais tarde.',
        ],
        source: this.name,
        timestamp: new Date(),
        error: error.message,
      };
    }
  }

  /**
   * Ensure we have a valid access token
   */
  private async ensureAccessToken(): Promise<void> {
    // Check if token is still valid (with 5 min buffer)
    if (
      this.accessToken &&
      this.tokenExpiry &&
      this.tokenExpiry > new Date(Date.now() + 5 * 60 * 1000)
    ) {
      return;
    }

    this.logger.log('Refreshing Serasa access token');

    // OAuth2 token request
    // NOTE: Adjust based on actual Serasa OAuth implementation
    const tokenResponse = await firstValueFrom(
      this.httpService.post(
        `${this.apiUrl}/oauth/token`,
        {
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      ),
    );

    this.accessToken = tokenResponse.data.access_token;
    // Set expiry (usually 1 hour, but check actual response)
    const expiresIn = tokenResponse.data.expires_in || 3600;
    this.tokenExpiry = new Date(Date.now() + expiresIn * 1000);

    this.logger.log('Serasa access token refreshed');
  }

  /**
   * Parse Serasa API response into standardized format
   * NOTE: Adjust based on actual Serasa response structure
   */
  private parseSerasaResponse(
    data: any,
    cnpj: string,
  ): CreditAnalysisResult {
    // This is a placeholder structure. Actual parsing will depend on
    // the specific Serasa product response format.
    const score = data.score || data.pontuacao || 500;
    const hasNegatives =
      data.temPendencias ||
      data.negativacoes?.length > 0 ||
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
    const negatives = data.negativacoes?.map((neg: any) => ({
      tipo: neg.tipo || neg.natureza,
      valor: neg.valor,
      dataOcorrencia: neg.data || neg.dataOcorrencia,
      credor: neg.credor || neg.empresa,
      cidade: neg.cidade,
      uf: neg.uf,
    }));

    // Parse protestos if present
    const protestos = data.protestos?.map((prot: any) => ({
      valor: prot.valor,
      dataProtesto: prot.data || prot.dataProtesto,
      cartorio: prot.cartorio,
      cidade: prot.cidade,
      uf: prot.uf,
    }));

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
      protestos: protestos?.length > 0 ? protestos : undefined,
      summary: data.resumo
        ? {
            totalDividas: data.resumo.totalDividas || 0,
            quantidadeNegativacoes: data.resumo.qtdNegativacoes || 0,
            quantidadeProtestos: data.resumo.qtdProtestos || 0,
            quantidadeChequesSemFundo: data.resumo.qtdCheques || 0,
            maiorDivida: data.resumo.maiorDivida || 0,
            dividaMaisAntiga: data.resumo.dividaMaisAntiga,
            dividaMaisRecente: data.resumo.dividaMaisRecente,
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
        recommendations.push('Empresa com excelente histórico de crédito');
        recommendations.push('Baixo risco para parceria comercial');
        recommendations.push('Condições de pagamento padrão recomendadas');
        break;

      case RiskLevel.MEDIUM:
        recommendations.push('Empresa com histórico de crédito moderado');
        recommendations.push('Considere solicitar garantias adicionais');
        if (hasNegatives) {
          recommendations.push(
            'Verificar se pendências foram regularizadas',
          );
        }
        break;

      case RiskLevel.HIGH:
        recommendations.push('Risco elevado - análise manual recomendada');
        recommendations.push('Exigir garantias ou pagamento antecipado');
        if (hasNegatives) {
          recommendations.push('Aguardar regularização das pendências');
        }
        break;

      case RiskLevel.CRITICAL:
        recommendations.push('Risco crítico - não recomendado parceria');
        recommendations.push('Empresa com múltiplas pendências ativas');
        recommendations.push('Solicitar regularização antes de prosseguir');
        break;
    }

    return recommendations;
  }

  private maskCnpj(cnpj: string): string {
    if (cnpj.length !== 14) return cnpj;
    return `${cnpj.slice(0, 5)}.***/****-**`;
  }
}
