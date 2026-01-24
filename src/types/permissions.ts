/**
 * Tipos para o sistema de permissões
 */

// Roles pré-definidos para membros da empresa
export type CompanyRole =
  | 'ADMIN'
  | 'OPERATIONS_MANAGER'
  | 'FINANCIAL_MANAGER'
  | 'SALES'
  | 'PRODUCTION_MANAGER'
  | 'VIEWER';

// Permissões granulares
export type Permission =
  // Pedidos
  | 'ORDERS_VIEW'
  | 'ORDERS_CREATE'
  | 'ORDERS_EDIT'
  | 'ORDERS_DELETE'
  | 'ORDERS_ACCEPT_REJECT'
  | 'ORDERS_UPDATE_STATUS'
  // Fornecedores/Parceiros
  | 'SUPPLIERS_VIEW'
  | 'SUPPLIERS_ADD'
  | 'SUPPLIERS_REMOVE'
  | 'SUPPLIERS_RATE'
  // Financeiro
  | 'FINANCIAL_VIEW'
  | 'FINANCIAL_MANAGE'
  | 'FINANCIAL_EXPORT'
  // Mensagens
  | 'MESSAGES_VIEW'
  | 'MESSAGES_SEND'
  // Relatórios
  | 'REPORTS_VIEW'
  | 'REPORTS_EXPORT'
  // Gestão de Equipe
  | 'TEAM_VIEW'
  | 'TEAM_INVITE'
  | 'TEAM_MANAGE'
  | 'TEAM_MANAGE_PERMISSIONS'
  // Configurações
  | 'SETTINGS_VIEW'
  | 'SETTINGS_EDIT'
  // Capacidade (Facção)
  | 'CAPACITY_VIEW'
  | 'CAPACITY_MANAGE';

// Status de convite
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED';

// Informações de um membro da equipe
export interface TeamMember {
  id: string;
  userId: string;
  email: string;
  name: string;
  userRole: string;
  isActive: boolean;
  companyRole: CompanyRole;
  isCompanyAdmin: boolean;
  permissionOverrides: PermissionOverride[];
  effectivePermissions: Permission[];
  joinedAt: string;
}

// Override de permissão individual
export interface PermissionOverride {
  id: string;
  permission: Permission;
  granted: boolean;
  createdAt: string;
}

// Informação de um convite
export interface Invitation {
  id: string;
  email: string;
  companyRole: CompanyRole;
  token: string;
  inviteUrl: string;
  expiresAt: string;
  isExpired?: boolean;
  invitedBy: string;
  createdAt: string;
  company?: {
    id: string;
    tradeName: string;
    type: string;
  };
}

// Informação de um role
export interface RoleInfo {
  role: CompanyRole;
  name: string;
  description: string;
  permissions: Permission[];
}

// Categoria de permissão para UI
export interface PermissionCategory {
  key: string;
  name: string;
  permissions: {
    permission: Permission;
    name: string;
  }[];
}

// Nomes dos roles em português
export const ROLE_NAMES: Record<CompanyRole, string> = {
  ADMIN: 'Administrador',
  OPERATIONS_MANAGER: 'Gerente de Operações',
  FINANCIAL_MANAGER: 'Gerente Financeiro',
  SALES: 'Vendas/Comercial',
  PRODUCTION_MANAGER: 'Gerente de Produção',
  VIEWER: 'Visualizador',
};

// Descrições dos roles
export const ROLE_DESCRIPTIONS: Record<CompanyRole, string> = {
  ADMIN: 'Acesso total a todas as funcionalidades e gestão de equipe',
  OPERATIONS_MANAGER: 'Gerencia pedidos, fornecedores e operações do dia a dia',
  FINANCIAL_MANAGER: 'Gerencia pagamentos, relatórios financeiros e exportações',
  SALES: 'Cria pedidos, gerencia fornecedores e comunicação',
  PRODUCTION_MANAGER: 'Gerencia produção, capacidade e aceita pedidos (facção)',
  VIEWER: 'Apenas visualização, sem permissões de edição',
};

// Nomes das permissões em português
export const PERMISSION_NAMES: Record<Permission, string> = {
  ORDERS_VIEW: 'Ver Pedidos',
  ORDERS_CREATE: 'Criar Pedidos',
  ORDERS_EDIT: 'Editar Pedidos',
  ORDERS_DELETE: 'Excluir Pedidos',
  ORDERS_ACCEPT_REJECT: 'Aceitar/Rejeitar Pedidos',
  ORDERS_UPDATE_STATUS: 'Atualizar Status de Pedidos',
  SUPPLIERS_VIEW: 'Ver Fornecedores',
  SUPPLIERS_ADD: 'Adicionar Fornecedores',
  SUPPLIERS_REMOVE: 'Remover Fornecedores',
  SUPPLIERS_RATE: 'Avaliar Fornecedores',
  FINANCIAL_VIEW: 'Ver Financeiro',
  FINANCIAL_MANAGE: 'Gerenciar Financeiro',
  FINANCIAL_EXPORT: 'Exportar Dados Financeiros',
  MESSAGES_VIEW: 'Ver Mensagens',
  MESSAGES_SEND: 'Enviar Mensagens',
  REPORTS_VIEW: 'Ver Relatórios',
  REPORTS_EXPORT: 'Exportar Relatórios',
  TEAM_VIEW: 'Ver Equipe',
  TEAM_INVITE: 'Convidar Membros',
  TEAM_MANAGE: 'Gerenciar Equipe',
  TEAM_MANAGE_PERMISSIONS: 'Gerenciar Permissões',
  SETTINGS_VIEW: 'Ver Configurações',
  SETTINGS_EDIT: 'Editar Configurações',
  CAPACITY_VIEW: 'Ver Capacidade',
  CAPACITY_MANAGE: 'Gerenciar Capacidade',
};

// Lista de todos os roles
export const ALL_COMPANY_ROLES: CompanyRole[] = [
  'ADMIN',
  'OPERATIONS_MANAGER',
  'FINANCIAL_MANAGER',
  'SALES',
  'PRODUCTION_MANAGER',
  'VIEWER',
];

// Lista de todas as permissões
export const ALL_PERMISSIONS: Permission[] = [
  'ORDERS_VIEW',
  'ORDERS_CREATE',
  'ORDERS_EDIT',
  'ORDERS_DELETE',
  'ORDERS_ACCEPT_REJECT',
  'ORDERS_UPDATE_STATUS',
  'SUPPLIERS_VIEW',
  'SUPPLIERS_ADD',
  'SUPPLIERS_REMOVE',
  'SUPPLIERS_RATE',
  'FINANCIAL_VIEW',
  'FINANCIAL_MANAGE',
  'FINANCIAL_EXPORT',
  'MESSAGES_VIEW',
  'MESSAGES_SEND',
  'REPORTS_VIEW',
  'REPORTS_EXPORT',
  'TEAM_VIEW',
  'TEAM_INVITE',
  'TEAM_MANAGE',
  'TEAM_MANAGE_PERMISSIONS',
  'SETTINGS_VIEW',
  'SETTINGS_EDIT',
  'CAPACITY_VIEW',
  'CAPACITY_MANAGE',
];
