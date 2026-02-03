import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import {
  ILegalProvider,
  LegalAnalysisResult,
  LawsuitInfo,
} from './legal-provider.interface';
import { firstValueFrom } from 'rxjs';

/**
 * Datajud CNJ Legal Provider
 *
 * Integrates with the public API of Datajud (CNJ - Conselho Nacional de Justiça)
 * to query judicial processes across all Brazilian courts.
 *
 * Features:
 * - Free public API
 * - Covers all Brazilian courts (Federal, State, Labor, Electoral, Military)
 * - Real-time process data from the National Judicial Database
 *
 * Requires:
 * - DATAJUD_API_KEY: Public API key (available at https://datajud-wiki.cnj.jus.br/api-publica/acesso)
 *
 * Documentation: https://datajud-wiki.cnj.jus.br/api-publica/
 */
@Injectable()
export class DatajudLegalProvider implements ILegalProvider {
  readonly name = 'DATAJUD_CNJ';

  private readonly logger = new Logger(DatajudLegalProvider.name);
  private readonly apiUrl = 'https://api-publica.datajud.cnj.jus.br';
  private readonly apiKey: string | undefined;

  // Tribunal aliases for searching
  private readonly tribunalAliases = [
    'api_publica_tjsp', // São Paulo
    'api_publica_tjrj', // Rio de Janeiro
    'api_publica_tjmg', // Minas Gerais
    'api_publica_tjrs', // Rio Grande do Sul
    'api_publica_tjpr', // Paraná
    'api_publica_tjsc', // Santa Catarina
    'api_publica_tjba', // Bahia
    'api_publica_tjpe', // Pernambuco
    'api_publica_tjce', // Ceará
    'api_publica_tjgo', // Goiás
    // Federal courts
    'api_publica_trf1',
    'api_publica_trf2',
    'api_publica_trf3',
    'api_publica_trf4',
    'api_publica_trf5',
    // Labor courts
    'api_publica_trt1',
    'api_publica_trt2',
    'api_publica_trt3',
    'api_publica_trt4',
    'api_publica_trt15',
  ];

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiKey = this.configService.get<string>('DATAJUD_API_KEY');

    if (this.apiKey) {
      this.logger.log('Datajud CNJ provider configured and ready');
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async analyze(cnpj: string): Promise<LegalAnalysisResult> {
    const cleanCnpj = cnpj.replace(/\D/g, '');

    if (!(await this.isAvailable())) {
      return {
        hasLegalIssues: false,
        activeLawsuitsCount: 0,
        riskLevel: 'LOW',
        recommendations: [
          'Datajud não configurado. Configure DATAJUD_API_KEY.',
        ],
        source: this.name,
        timestamp: new Date(),
        error:
          'Datajud provider not configured. Set DATAJUD_API_KEY environment variable.',
      };
    }

    try {
      this.logger.log(
        `Searching legal issues for CNPJ: ${this.maskCnpj(cleanCnpj)}`,
      );

      // Search across multiple tribunals (limited to most common ones for performance)
      const searchTribunals = this.tribunalAliases.slice(0, 10); // Limit to 10 tribunals
      const allLawsuits: LawsuitInfo[] = [];

      // Search in parallel with a concurrency limit
      const results = await Promise.allSettled(
        searchTribunals.map((tribunal) =>
          this.searchTribunal(tribunal, cleanCnpj),
        ),
      );

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.length > 0) {
          allLawsuits.push(...result.value);
        }
      }

      return this.buildResult(allLawsuits);
    } catch (error) {
      this.logger.error(`Datajud API error: ${error.message}`);

      return {
        hasLegalIssues: false,
        activeLawsuitsCount: 0,
        riskLevel: 'LOW',
        recommendations: [
          'Erro ao consultar Datajud. Tente novamente mais tarde.',
        ],
        source: this.name,
        timestamp: new Date(),
        error: error.message,
      };
    }
  }

  /**
   * Search for processes in a specific tribunal
   */
  private async searchTribunal(
    tribunalAlias: string,
    cnpj: string,
  ): Promise<LawsuitInfo[]> {
    try {
      // Format CNPJ for search (with mask)
      const formattedCnpj = this.formatCnpj(cnpj);

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.apiUrl}/${tribunalAlias}/_search`,
          {
            query: {
              bool: {
                should: [
                  {
                    match: {
                      'dadosBasicos.polo.parte.pessoa.numeroDocumentoPrincipal':
                        cnpj,
                    },
                  },
                  {
                    match: {
                      'dadosBasicos.polo.parte.pessoa.numeroDocumentoPrincipal':
                        formattedCnpj,
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
            size: 100, // Limit results per tribunal
          },
          {
            headers: {
              Authorization: `APIKey ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 10000, // 10 second timeout per tribunal
          },
        ),
      );

      return this.parseSearchResults(response.data, tribunalAlias);
    } catch (error) {
      // Log but don't fail - some tribunals may not have data or be temporarily unavailable
      this.logger.debug(
        `No results from ${tribunalAlias}: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * Parse Elasticsearch-like response from Datajud
   */
  private parseSearchResults(data: any, tribunalAlias: string): LawsuitInfo[] {
    const hits = data?.hits?.hits || [];

    return hits.map((hit: any) => {
      const source = hit._source || {};
      const dadosBasicos = source.dadosBasicos || {};
      const movimentos = source.movimentos || [];

      // Get the most recent movement for status
      const lastMovimento = movimentos[0];
      const status = this.determineProcessStatus(lastMovimento, dadosBasicos);

      return {
        number: dadosBasicos.numero || hit._id,
        court: this.getTribunalName(tribunalAlias),
        type: dadosBasicos.classeProcessual?.nome || 'Não informado',
        status,
        filingDate: dadosBasicos.dataAjuizamento
          ? new Date(dadosBasicos.dataAjuizamento)
          : undefined,
        value: dadosBasicos.valorCausa,
        description:
          dadosBasicos.assunto?.[0]?.nome ||
          dadosBasicos.classeProcessual?.nome ||
          'Processo judicial',
        parties: this.extractParties(dadosBasicos.polo),
      };
    });
  }

  /**
   * Determine process status from movements
   */
  private determineProcessStatus(lastMovimento: any, dadosBasicos: any): string {
    if (!lastMovimento) {
      return dadosBasicos.situacao || 'EM ANDAMENTO';
    }

    const movimentoNome = lastMovimento.nome?.toLowerCase() || '';

    if (
      movimentoNome.includes('arquiv') ||
      movimentoNome.includes('baixa') ||
      movimentoNome.includes('transit')
    ) {
      return 'ARQUIVADO';
    }

    if (movimentoNome.includes('sentença') || movimentoNome.includes('julgamento')) {
      return 'JULGADO';
    }

    return 'EM ANDAMENTO';
  }

  /**
   * Extract parties from process poles
   */
  private extractParties(polos: any[]): { plaintiff?: string; defendant?: string } {
    if (!polos || !Array.isArray(polos)) {
      return {};
    }

    const parties: { plaintiff?: string; defendant?: string } = {};

    for (const polo of polos) {
      const tipoPolo = polo.polo?.toLowerCase() || '';
      const partes = polo.parte || [];

      if (partes.length > 0) {
        const nomeParte = partes[0]?.pessoa?.nome || partes[0]?.pessoa?.nomeFantasia;

        if (tipoPolo.includes('ativo') || tipoPolo.includes('autor') || tipoPolo.includes('requerente')) {
          parties.plaintiff = nomeParte;
        } else if (tipoPolo.includes('passivo') || tipoPolo.includes('réu') || tipoPolo.includes('requerido')) {
          parties.defendant = nomeParte;
        }
      }
    }

    return parties;
  }

  /**
   * Get tribunal friendly name from alias
   */
  private getTribunalName(alias: string): string {
    const names: Record<string, string> = {
      api_publica_tjsp: 'TJSP - Tribunal de Justiça de São Paulo',
      api_publica_tjrj: 'TJRJ - Tribunal de Justiça do Rio de Janeiro',
      api_publica_tjmg: 'TJMG - Tribunal de Justiça de Minas Gerais',
      api_publica_tjrs: 'TJRS - Tribunal de Justiça do Rio Grande do Sul',
      api_publica_tjpr: 'TJPR - Tribunal de Justiça do Paraná',
      api_publica_tjsc: 'TJSC - Tribunal de Justiça de Santa Catarina',
      api_publica_tjba: 'TJBA - Tribunal de Justiça da Bahia',
      api_publica_tjpe: 'TJPE - Tribunal de Justiça de Pernambuco',
      api_publica_tjce: 'TJCE - Tribunal de Justiça do Ceará',
      api_publica_tjgo: 'TJGO - Tribunal de Justiça de Goiás',
      api_publica_trf1: 'TRF1 - Tribunal Regional Federal 1ª Região',
      api_publica_trf2: 'TRF2 - Tribunal Regional Federal 2ª Região',
      api_publica_trf3: 'TRF3 - Tribunal Regional Federal 3ª Região',
      api_publica_trf4: 'TRF4 - Tribunal Regional Federal 4ª Região',
      api_publica_trf5: 'TRF5 - Tribunal Regional Federal 5ª Região',
      api_publica_trt1: 'TRT1 - Tribunal Regional do Trabalho 1ª Região',
      api_publica_trt2: 'TRT2 - Tribunal Regional do Trabalho 2ª Região',
      api_publica_trt3: 'TRT3 - Tribunal Regional do Trabalho 3ª Região',
      api_publica_trt4: 'TRT4 - Tribunal Regional do Trabalho 4ª Região',
      api_publica_trt15: 'TRT15 - Tribunal Regional do Trabalho 15ª Região',
    };

    return names[alias] || alias.replace('api_publica_', '').toUpperCase();
  }

  /**
   * Build final result from all lawsuits found
   */
  private buildResult(lawsuits: LawsuitInfo[]): LegalAnalysisResult {
    // Filter active lawsuits (not archived)
    const activeLawsuits = lawsuits.filter(
      (l) => l.status !== 'ARQUIVADO' && l.status !== 'BAIXADO',
    );

    const hasLegalIssues = activeLawsuits.length > 0;
    const totalValue = activeLawsuits.reduce(
      (sum, l) => sum + (l.value || 0),
      0,
    );

    // Determine risk level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (activeLawsuits.length === 0) {
      riskLevel = 'LOW';
    } else if (activeLawsuits.length <= 2 && totalValue < 100000) {
      riskLevel = 'MEDIUM';
    } else if (activeLawsuits.length <= 5 || totalValue < 500000) {
      riskLevel = 'HIGH';
    } else {
      riskLevel = 'CRITICAL';
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      activeLawsuits.length,
      totalValue,
      riskLevel,
      lawsuits,
    );

    return {
      hasLegalIssues,
      activeLawsuitsCount: activeLawsuits.length,
      totalLawsuitValue: totalValue > 0 ? totalValue : undefined,
      lawsuits: lawsuits.length > 0 ? lawsuits : undefined,
      riskLevel,
      recommendations,
      source: this.name,
      timestamp: new Date(),
    };
  }

  private generateRecommendations(
    activeLawsuitCount: number,
    totalValue: number,
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    allLawsuits: LawsuitInfo[],
  ): string[] {
    const recommendations: string[] = [];

    // Count by type
    const laborCount = allLawsuits.filter(
      (l) => l.court.includes('TRT') || l.type.toLowerCase().includes('trabalh'),
    ).length;

    switch (riskLevel) {
      case 'LOW':
        recommendations.push('Nenhum processo judicial ativo encontrado no Datajud');
        recommendations.push('Empresa com situação jurídica regular');
        break;

      case 'MEDIUM':
        recommendations.push(
          `${activeLawsuitCount} processo(s) judicial(is) ativo(s) identificado(s)`,
        );
        recommendations.push('Recomendado acompanhamento dos casos');
        if (laborCount > 0) {
          recommendations.push(
            `${laborCount} processo(s) trabalhista(s) - verificar passivos`,
          );
        }
        break;

      case 'HIGH':
        recommendations.push(
          `${activeLawsuitCount} processos judiciais ativos`,
        );
        if (totalValue > 0) {
          recommendations.push(
            `Valor total em litígio: R$ ${totalValue.toLocaleString('pt-BR')}`,
          );
        }
        recommendations.push('Recomendada análise detalhada antes de aprovação');
        recommendations.push('Considerar garantias adicionais');
        break;

      case 'CRITICAL':
        recommendations.push('Alto volume de processos judiciais');
        if (totalValue > 0) {
          recommendations.push(
            `Valor total em litígio: R$ ${totalValue.toLocaleString('pt-BR')}`,
          );
        }
        recommendations.push('Risco elevado de passivos judiciais');
        recommendations.push('Não recomendado crédito sem garantias reais');
        break;
    }

    return recommendations;
  }

  private formatCnpj(cnpj: string): string {
    if (cnpj.length !== 14) return cnpj;
    return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
  }

  private maskCnpj(cnpj: string): string {
    if (cnpj.length !== 14) return cnpj;
    return `${cnpj.slice(0, 5)}.***/****-**`;
  }
}
