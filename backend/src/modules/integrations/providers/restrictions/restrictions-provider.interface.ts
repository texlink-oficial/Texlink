/**
 * Result of a restrictions analysis (CADIN, CEIS, CNEP, etc.)
 */
export interface RestrictionsAnalysisResult {
  /** Whether the company has any restrictions */
  hasRestrictions: boolean;

  /** Total number of active restrictions */
  totalRestrictions: number;

  /** List of restriction details */
  restrictions?: RestrictionInfo[];

  /** Risk level based on restrictions */
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

export interface RestrictionInfo {
  /** Type of restriction */
  type: RestrictionType;

  /** Description of the restriction */
  description: string;

  /** Organization that imposed the restriction */
  origin: string;

  /** Date when restriction was imposed */
  startDate?: Date;

  /** Date when restriction ends (if applicable) */
  endDate?: Date;

  /** Value involved (if applicable) */
  value?: number;

  /** Status of the restriction */
  status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED';

  /** Additional details */
  details?: string;
}

/**
 * Types of restrictions that can be found
 */
export type RestrictionType =
  | 'CADIN' // Cadastro Informativo de Créditos não Quitados do Setor Público Federal
  | 'CEIS' // Cadastro de Empresas Inidôneas e Suspensas
  | 'CNEP' // Cadastro Nacional de Empresas Punidas
  | 'CEPIM' // Cadastro de Entidades Privadas Sem Fins Lucrativos Impedidas
  | 'TCU' // Tribunal de Contas da União
  | 'BNDES' // Lista de Inabilitados BNDES
  | 'PGFN' // Procuradoria Geral da Fazenda Nacional
  | 'OTHER';

/**
 * Interface for restrictions providers
 *
 * Providers should implement this interface to check for
 * government and financial restrictions against companies.
 */
export interface IRestrictionsProvider {
  /** Provider name for logging and identification */
  readonly name: string;

  /** Check if provider is available (credentials configured) */
  isAvailable(): Promise<boolean>;

  /** Analyze restrictions for a given CNPJ */
  analyze(cnpj: string): Promise<RestrictionsAnalysisResult>;
}
