/**
 * Result of a legal/judicial issues analysis
 */
export interface LegalAnalysisResult {
  /** Whether the company has any legal issues */
  hasLegalIssues: boolean;

  /** Number of active lawsuits */
  activeLawsuitsCount: number;

  /** Total value of lawsuits (if available) */
  totalLawsuitValue?: number;

  /** List of lawsuit details */
  lawsuits?: LawsuitInfo[];

  /** Risk level based on legal issues */
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  /** Recommendations based on findings */
  recommendations: string[];

  /** Source of the data */
  source: string;

  /** Timestamp of the analysis */
  timestamp: Date;

  /** Error message if analysis failed */
  error?: string;

  /** Raw response from API (for debugging) */
  rawResponse?: any;
}

export interface LawsuitInfo {
  /** Lawsuit number */
  number: string;

  /** Court/Tribunal */
  court: string;

  /** Type of lawsuit (civil, labor, tax, etc.) */
  type: string;

  /** Status (active, archived, etc.) */
  status: string;

  /** Filing date */
  filingDate?: Date;

  /** Value (if available) */
  value?: number;

  /** Brief description */
  description?: string;

  /** Parties involved */
  parties?: {
    plaintiff?: string;
    defendant?: string;
  };
}

/**
 * Interface for legal/judicial issues providers
 *
 * Providers should implement this interface to check for
 * lawsuits and legal issues against companies.
 */
export interface ILegalProvider {
  /** Provider name for logging and identification */
  readonly name: string;

  /** Check if provider is available (credentials configured) */
  isAvailable(): Promise<boolean>;

  /** Analyze legal issues for a given CNPJ */
  analyze(cnpj: string): Promise<LegalAnalysisResult>;
}
