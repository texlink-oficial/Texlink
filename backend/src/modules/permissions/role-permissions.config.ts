import { CompanyRole, Permission } from '@prisma/client';

/**
 * Mapeamento de roles para permissões
 * Define quais permissões cada role pré-definido possui
 */
export const ROLE_PERMISSIONS: Record<CompanyRole, Permission[]> = {
  [CompanyRole.ADMIN]: Object.values(Permission), // Todas as permissões

  [CompanyRole.OPERATIONS_MANAGER]: [
    Permission.ORDERS_VIEW,
    Permission.ORDERS_CREATE,
    Permission.ORDERS_EDIT,
    Permission.ORDERS_UPDATE_STATUS,
    Permission.ORDERS_ACCEPT_REJECT,
    Permission.SUPPLIERS_VIEW,
    Permission.SUPPLIERS_ADD,
    Permission.SUPPLIERS_RATE,
    Permission.MESSAGES_VIEW,
    Permission.MESSAGES_SEND,
    Permission.REPORTS_VIEW,
    Permission.REPORTS_EXPORT,
    Permission.CAPACITY_VIEW,
    Permission.CAPACITY_MANAGE,
  ],

  [CompanyRole.FINANCIAL_MANAGER]: [
    Permission.FINANCIAL_VIEW,
    Permission.FINANCIAL_MANAGE,
    Permission.FINANCIAL_EXPORT,
    Permission.REPORTS_VIEW,
    Permission.REPORTS_EXPORT,
    Permission.ORDERS_VIEW,
  ],

  [CompanyRole.SALES]: [
    Permission.ORDERS_VIEW,
    Permission.ORDERS_CREATE,
    Permission.SUPPLIERS_VIEW,
    Permission.SUPPLIERS_ADD,
    Permission.MESSAGES_VIEW,
    Permission.MESSAGES_SEND,
    Permission.REPORTS_VIEW,
  ],

  [CompanyRole.PRODUCTION_MANAGER]: [
    Permission.ORDERS_VIEW,
    Permission.ORDERS_ACCEPT_REJECT,
    Permission.ORDERS_UPDATE_STATUS,
    Permission.CAPACITY_VIEW,
    Permission.CAPACITY_MANAGE,
    Permission.MESSAGES_VIEW,
    Permission.MESSAGES_SEND,
    Permission.REPORTS_VIEW,
  ],

  [CompanyRole.VIEWER]: [
    Permission.ORDERS_VIEW,
    Permission.SUPPLIERS_VIEW,
    Permission.FINANCIAL_VIEW,
    Permission.MESSAGES_VIEW,
    Permission.REPORTS_VIEW,
    Permission.CAPACITY_VIEW,
    Permission.TEAM_VIEW,
    Permission.SETTINGS_VIEW,
  ],
};

/**
 * Nomes dos roles em português
 */
export const ROLE_NAMES: Record<CompanyRole, string> = {
  [CompanyRole.ADMIN]: 'Administrador',
  [CompanyRole.OPERATIONS_MANAGER]: 'Gerente de Operações',
  [CompanyRole.FINANCIAL_MANAGER]: 'Gerente Financeiro',
  [CompanyRole.SALES]: 'Vendas/Comercial',
  [CompanyRole.PRODUCTION_MANAGER]: 'Gerente de Produção',
  [CompanyRole.VIEWER]: 'Visualizador',
};

/**
 * Descrições dos roles
 */
export const ROLE_DESCRIPTIONS: Record<CompanyRole, string> = {
  [CompanyRole.ADMIN]: 'Acesso total a todas as funcionalidades e gestão de equipe',
  [CompanyRole.OPERATIONS_MANAGER]: 'Gerencia pedidos, fornecedores e operações do dia a dia',
  [CompanyRole.FINANCIAL_MANAGER]: 'Gerencia pagamentos, relatórios financeiros e exportações',
  [CompanyRole.SALES]: 'Cria pedidos, gerencia fornecedores e comunicação',
  [CompanyRole.PRODUCTION_MANAGER]: 'Gerencia produção, capacidade e aceita pedidos (facção)',
  [CompanyRole.VIEWER]: 'Apenas visualização, sem permissões de edição',
};

/**
 * Nomes das permissões em português
 */
export const PERMISSION_NAMES: Record<Permission, string> = {
  [Permission.ORDERS_VIEW]: 'Ver Pedidos',
  [Permission.ORDERS_CREATE]: 'Criar Pedidos',
  [Permission.ORDERS_EDIT]: 'Editar Pedidos',
  [Permission.ORDERS_DELETE]: 'Excluir Pedidos',
  [Permission.ORDERS_ACCEPT_REJECT]: 'Aceitar/Rejeitar Pedidos',
  [Permission.ORDERS_UPDATE_STATUS]: 'Atualizar Status de Pedidos',
  [Permission.SUPPLIERS_VIEW]: 'Ver Fornecedores',
  [Permission.SUPPLIERS_ADD]: 'Adicionar Fornecedores',
  [Permission.SUPPLIERS_REMOVE]: 'Remover Fornecedores',
  [Permission.SUPPLIERS_RATE]: 'Avaliar Fornecedores',
  [Permission.FINANCIAL_VIEW]: 'Ver Financeiro',
  [Permission.FINANCIAL_MANAGE]: 'Gerenciar Financeiro',
  [Permission.FINANCIAL_EXPORT]: 'Exportar Dados Financeiros',
  [Permission.MESSAGES_VIEW]: 'Ver Mensagens',
  [Permission.MESSAGES_SEND]: 'Enviar Mensagens',
  [Permission.REPORTS_VIEW]: 'Ver Relatórios',
  [Permission.REPORTS_EXPORT]: 'Exportar Relatórios',
  [Permission.TEAM_VIEW]: 'Ver Equipe',
  [Permission.TEAM_INVITE]: 'Convidar Membros',
  [Permission.TEAM_MANAGE]: 'Gerenciar Equipe',
  [Permission.TEAM_MANAGE_PERMISSIONS]: 'Gerenciar Permissões',
  [Permission.SETTINGS_VIEW]: 'Ver Configurações',
  [Permission.SETTINGS_EDIT]: 'Editar Configurações',
  [Permission.CAPACITY_VIEW]: 'Ver Capacidade',
  [Permission.CAPACITY_MANAGE]: 'Gerenciar Capacidade',
};

/**
 * Categorias de permissões para UI
 */
export const PERMISSION_CATEGORIES = {
  orders: {
    name: 'Pedidos',
    permissions: [
      Permission.ORDERS_VIEW,
      Permission.ORDERS_CREATE,
      Permission.ORDERS_EDIT,
      Permission.ORDERS_DELETE,
      Permission.ORDERS_ACCEPT_REJECT,
      Permission.ORDERS_UPDATE_STATUS,
    ],
  },
  suppliers: {
    name: 'Fornecedores',
    permissions: [
      Permission.SUPPLIERS_VIEW,
      Permission.SUPPLIERS_ADD,
      Permission.SUPPLIERS_REMOVE,
      Permission.SUPPLIERS_RATE,
    ],
  },
  financial: {
    name: 'Financeiro',
    permissions: [
      Permission.FINANCIAL_VIEW,
      Permission.FINANCIAL_MANAGE,
      Permission.FINANCIAL_EXPORT,
    ],
  },
  messages: {
    name: 'Mensagens',
    permissions: [Permission.MESSAGES_VIEW, Permission.MESSAGES_SEND],
  },
  reports: {
    name: 'Relatórios',
    permissions: [Permission.REPORTS_VIEW, Permission.REPORTS_EXPORT],
  },
  team: {
    name: 'Equipe',
    permissions: [
      Permission.TEAM_VIEW,
      Permission.TEAM_INVITE,
      Permission.TEAM_MANAGE,
      Permission.TEAM_MANAGE_PERMISSIONS,
    ],
  },
  settings: {
    name: 'Configurações',
    permissions: [Permission.SETTINGS_VIEW, Permission.SETTINGS_EDIT],
  },
  capacity: {
    name: 'Capacidade',
    permissions: [Permission.CAPACITY_VIEW, Permission.CAPACITY_MANAGE],
  },
};
