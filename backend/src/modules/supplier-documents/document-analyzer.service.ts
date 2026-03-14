import { Injectable, Logger } from '@nestjs/common';

export interface DocumentAnalysisResult {
  expiresAt: string | null; // ISO date string YYYY-MM-DD
  confidence: 'high' | 'medium' | 'low';
  rawText?: string;
}

@Injectable()
export class DocumentAnalyzerService {
  private readonly logger = new Logger(DocumentAnalyzerService.name);
  private readonly apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    if (this.apiKey) {
      this.logger.log('Document analyzer initialized with Gemini API');
    } else {
      this.logger.warn(
        'GEMINI_API_KEY not set — document date extraction disabled',
      );
    }
  }

  get isAvailable(): boolean {
    return !!this.apiKey;
  }

  async extractExpirationDate(
    fileBuffer: Buffer,
    mimeType: string,
    documentType: string,
  ): Promise<DocumentAnalysisResult> {
    if (!this.apiKey) {
      return { expiresAt: null, confidence: 'low' };
    }

    try {
      const base64 = fileBuffer.toString('base64');
      const mediaType = this.mapMediaType(mimeType);
      if (!mediaType) {
        this.logger.warn(`Unsupported media type for analysis: ${mimeType}`);
        return { expiresAt: null, confidence: 'low' };
      }

      const documentLabel = this.getDocumentLabel(documentType);

      const body = {
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: mediaType,
                  data: base64,
                },
              },
              {
                text: `Analise este documento brasileiro do tipo "${documentLabel}".

Extraia APENAS a data de validade/vencimento do documento.

Responda SOMENTE em JSON puro, sem markdown e sem code blocks:
{"expiresAt": "YYYY-MM-DD", "confidence": "high|medium|low", "rawText": "texto encontrado próximo à data"}

Se não encontrar data de validade, responda:
{"expiresAt": null, "confidence": "low", "rawText": null}

Dicas para encontrar a data:
- Procure por: "Válido até", "Validade", "Vencimento", "Data de validade", "Válida até"
- Em CNDs: "Válida até DD/MM/YYYY"
- Em laudos NR: campo "Próxima revisão" ou "Validade"
- Em licenças: "Válida até" ou "Data de vencimento"
- Em guias mensais: use o último dia do mês de competência como vencimento`,
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 256,
          temperature: 0,
        },
      };

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Gemini API error: ${response.status} ${errorText}`);
        return { expiresAt: null, confidence: 'low' };
      }

      const data = await response.json();
      const text =
        data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

      // Extract JSON from response (handle potential markdown wrapping)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.warn(`Could not parse Gemini response: ${text}`);
        return { expiresAt: null, confidence: 'low' };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (parsed.expiresAt && /^\d{4}-\d{2}-\d{2}$/.test(parsed.expiresAt)) {
        this.logger.log(
          `Extracted expiration date: ${parsed.expiresAt} (${parsed.confidence}) for ${documentType}`,
        );
        return {
          expiresAt: parsed.expiresAt,
          confidence: parsed.confidence || 'medium',
          rawText: parsed.rawText || undefined,
        };
      }

      return { expiresAt: null, confidence: 'low', rawText: parsed.rawText };
    } catch (error) {
      this.logger.error(`Failed to analyze document: ${error}`);
      return { expiresAt: null, confidence: 'low' };
    }
  }

  private mapMediaType(mimeType: string): string | null {
    const supported = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
    ];
    return supported.includes(mimeType) ? mimeType : null;
  }

  private getDocumentLabel(type: string): string {
    const labels: Record<string, string> = {
      CND_FEDERAL: 'Certidão Negativa de Débitos (CND Federal)',
      CRF_FGTS: 'Certificado de Regularidade do FGTS (CRF)',
      LICENCA_FUNCIONAMENTO: 'Licença de Funcionamento',
      AVCB: 'Auto de Vistoria do Corpo de Bombeiros (AVCB)',
      LICENCA_AMBIENTAL: 'Licença Ambiental',
      LAUDO_NR1_GRO_PGR: 'Laudo NR-1 (GRO/PGR)',
      LAUDO_NR7_PCMSO: 'Laudo NR-7 (PCMSO)',
      LAUDO_NR10_SEGURANCA_ELETRICA: 'Laudo NR-10 (Segurança Elétrica)',
      LAUDO_NR15_INSALUBRIDADE: 'Laudo NR-15 (Insalubridade)',
      LAUDO_NR17_AET: 'Laudo NR-17 (Análise Ergonômica)',
      GUIA_INSS: 'Guia de Recolhimento INSS',
      GUIA_FGTS: 'Guia de Recolhimento FGTS',
      GUIA_SIMPLES_DAS: 'Guia DAS (Simples Nacional)',
      RELATORIO_EMPREGADOS: 'Relatório de Empregados',
    };
    return labels[type] || type;
  }
}
