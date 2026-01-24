import api from './api';
import { MOCK_MODE, simulateDelay } from './mockMode';
import {
  TeamMember,
  Invitation,
  RoleInfo,
  PermissionCategory,
  CompanyRole,
  Permission,
  ALL_PERMISSIONS,
  ROLE_NAMES,
  ROLE_DESCRIPTIONS,
  PERMISSION_NAMES,
} from '../types/permissions';

// =============================================================================
// MOCK DATA
// =============================================================================

const MOCK_TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'member-001',
    userId: 'demo-brand-001',
    email: 'demo-brand@texlink.com',
    name: 'Maria Santos',
    userRole: 'BRAND',
    isActive: true,
    companyRole: 'ADMIN',
    isCompanyAdmin: true,
    permissionOverrides: [],
    effectivePermissions: ALL_PERMISSIONS,
    joinedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'member-002',
    userId: 'user-002',
    email: 'carlos.ops@fashion.com',
    name: 'Carlos Operações',
    userRole: 'BRAND',
    isActive: true,
    companyRole: 'OPERATIONS_MANAGER',
    isCompanyAdmin: false,
    permissionOverrides: [],
    effectivePermissions: [
      'ORDERS_VIEW', 'ORDERS_CREATE', 'ORDERS_EDIT', 'ORDERS_UPDATE_STATUS', 'ORDERS_ACCEPT_REJECT',
      'SUPPLIERS_VIEW', 'SUPPLIERS_ADD', 'SUPPLIERS_RATE',
      'MESSAGES_VIEW', 'MESSAGES_SEND',
      'REPORTS_VIEW', 'REPORTS_EXPORT',
      'CAPACITY_VIEW', 'CAPACITY_MANAGE',
    ],
    joinedAt: '2024-03-20T14:30:00Z',
  },
  {
    id: 'member-003',
    userId: 'user-003',
    email: 'ana.financeiro@fashion.com',
    name: 'Ana Financeiro',
    userRole: 'BRAND',
    isActive: true,
    companyRole: 'FINANCIAL_MANAGER',
    isCompanyAdmin: false,
    permissionOverrides: [],
    effectivePermissions: [
      'FINANCIAL_VIEW', 'FINANCIAL_MANAGE', 'FINANCIAL_EXPORT',
      'REPORTS_VIEW', 'REPORTS_EXPORT',
      'ORDERS_VIEW',
    ],
    joinedAt: '2024-05-10T09:00:00Z',
  },
  {
    id: 'member-004',
    userId: 'user-004',
    email: 'pedro.vendas@fashion.com',
    name: 'Pedro Vendas',
    userRole: 'BRAND',
    isActive: true,
    companyRole: 'SALES',
    isCompanyAdmin: false,
    permissionOverrides: [
      { id: 'override-001', permission: 'REPORTS_EXPORT', granted: true, createdAt: '2024-06-01T10:00:00Z' },
    ],
    effectivePermissions: [
      'ORDERS_VIEW', 'ORDERS_CREATE',
      'SUPPLIERS_VIEW', 'SUPPLIERS_ADD',
      'MESSAGES_VIEW', 'MESSAGES_SEND',
      'REPORTS_VIEW', 'REPORTS_EXPORT',
    ],
    joinedAt: '2024-06-01T11:00:00Z',
  },
];

const MOCK_INVITATIONS: Invitation[] = [
  {
    id: 'inv-001',
    email: 'novo.membro@email.com',
    companyRole: 'VIEWER',
    token: 'abc123-token-xyz',
    inviteUrl: '/convite/abc123-token-xyz',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    isExpired: false,
    invitedBy: 'Maria Santos',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const MOCK_ROLES: RoleInfo[] = [
  { role: 'ADMIN', name: ROLE_NAMES.ADMIN, description: ROLE_DESCRIPTIONS.ADMIN, permissions: ALL_PERMISSIONS },
  {
    role: 'OPERATIONS_MANAGER',
    name: ROLE_NAMES.OPERATIONS_MANAGER,
    description: ROLE_DESCRIPTIONS.OPERATIONS_MANAGER,
    permissions: [
      'ORDERS_VIEW', 'ORDERS_CREATE', 'ORDERS_EDIT', 'ORDERS_UPDATE_STATUS', 'ORDERS_ACCEPT_REJECT',
      'SUPPLIERS_VIEW', 'SUPPLIERS_ADD', 'SUPPLIERS_RATE',
      'MESSAGES_VIEW', 'MESSAGES_SEND',
      'REPORTS_VIEW', 'REPORTS_EXPORT',
      'CAPACITY_VIEW', 'CAPACITY_MANAGE',
    ],
  },
  {
    role: 'FINANCIAL_MANAGER',
    name: ROLE_NAMES.FINANCIAL_MANAGER,
    description: ROLE_DESCRIPTIONS.FINANCIAL_MANAGER,
    permissions: [
      'FINANCIAL_VIEW', 'FINANCIAL_MANAGE', 'FINANCIAL_EXPORT',
      'REPORTS_VIEW', 'REPORTS_EXPORT',
      'ORDERS_VIEW',
    ],
  },
  {
    role: 'SALES',
    name: ROLE_NAMES.SALES,
    description: ROLE_DESCRIPTIONS.SALES,
    permissions: [
      'ORDERS_VIEW', 'ORDERS_CREATE',
      'SUPPLIERS_VIEW', 'SUPPLIERS_ADD',
      'MESSAGES_VIEW', 'MESSAGES_SEND',
      'REPORTS_VIEW',
    ],
  },
  {
    role: 'PRODUCTION_MANAGER',
    name: ROLE_NAMES.PRODUCTION_MANAGER,
    description: ROLE_DESCRIPTIONS.PRODUCTION_MANAGER,
    permissions: [
      'ORDERS_VIEW', 'ORDERS_ACCEPT_REJECT', 'ORDERS_UPDATE_STATUS',
      'CAPACITY_VIEW', 'CAPACITY_MANAGE',
      'MESSAGES_VIEW', 'MESSAGES_SEND',
      'REPORTS_VIEW',
    ],
  },
  {
    role: 'VIEWER',
    name: ROLE_NAMES.VIEWER,
    description: ROLE_DESCRIPTIONS.VIEWER,
    permissions: [
      'ORDERS_VIEW', 'SUPPLIERS_VIEW', 'FINANCIAL_VIEW',
      'MESSAGES_VIEW', 'REPORTS_VIEW', 'CAPACITY_VIEW',
      'TEAM_VIEW', 'SETTINGS_VIEW',
    ],
  },
];

const MOCK_PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    key: 'orders',
    name: 'Pedidos',
    permissions: [
      { permission: 'ORDERS_VIEW', name: PERMISSION_NAMES.ORDERS_VIEW },
      { permission: 'ORDERS_CREATE', name: PERMISSION_NAMES.ORDERS_CREATE },
      { permission: 'ORDERS_EDIT', name: PERMISSION_NAMES.ORDERS_EDIT },
      { permission: 'ORDERS_DELETE', name: PERMISSION_NAMES.ORDERS_DELETE },
      { permission: 'ORDERS_ACCEPT_REJECT', name: PERMISSION_NAMES.ORDERS_ACCEPT_REJECT },
      { permission: 'ORDERS_UPDATE_STATUS', name: PERMISSION_NAMES.ORDERS_UPDATE_STATUS },
    ],
  },
  {
    key: 'suppliers',
    name: 'Fornecedores',
    permissions: [
      { permission: 'SUPPLIERS_VIEW', name: PERMISSION_NAMES.SUPPLIERS_VIEW },
      { permission: 'SUPPLIERS_ADD', name: PERMISSION_NAMES.SUPPLIERS_ADD },
      { permission: 'SUPPLIERS_REMOVE', name: PERMISSION_NAMES.SUPPLIERS_REMOVE },
      { permission: 'SUPPLIERS_RATE', name: PERMISSION_NAMES.SUPPLIERS_RATE },
    ],
  },
  {
    key: 'financial',
    name: 'Financeiro',
    permissions: [
      { permission: 'FINANCIAL_VIEW', name: PERMISSION_NAMES.FINANCIAL_VIEW },
      { permission: 'FINANCIAL_MANAGE', name: PERMISSION_NAMES.FINANCIAL_MANAGE },
      { permission: 'FINANCIAL_EXPORT', name: PERMISSION_NAMES.FINANCIAL_EXPORT },
    ],
  },
  {
    key: 'messages',
    name: 'Mensagens',
    permissions: [
      { permission: 'MESSAGES_VIEW', name: PERMISSION_NAMES.MESSAGES_VIEW },
      { permission: 'MESSAGES_SEND', name: PERMISSION_NAMES.MESSAGES_SEND },
    ],
  },
  {
    key: 'reports',
    name: 'Relatórios',
    permissions: [
      { permission: 'REPORTS_VIEW', name: PERMISSION_NAMES.REPORTS_VIEW },
      { permission: 'REPORTS_EXPORT', name: PERMISSION_NAMES.REPORTS_EXPORT },
    ],
  },
  {
    key: 'team',
    name: 'Equipe',
    permissions: [
      { permission: 'TEAM_VIEW', name: PERMISSION_NAMES.TEAM_VIEW },
      { permission: 'TEAM_INVITE', name: PERMISSION_NAMES.TEAM_INVITE },
      { permission: 'TEAM_MANAGE', name: PERMISSION_NAMES.TEAM_MANAGE },
      { permission: 'TEAM_MANAGE_PERMISSIONS', name: PERMISSION_NAMES.TEAM_MANAGE_PERMISSIONS },
    ],
  },
  {
    key: 'settings',
    name: 'Configurações',
    permissions: [
      { permission: 'SETTINGS_VIEW', name: PERMISSION_NAMES.SETTINGS_VIEW },
      { permission: 'SETTINGS_EDIT', name: PERMISSION_NAMES.SETTINGS_EDIT },
    ],
  },
  {
    key: 'capacity',
    name: 'Capacidade',
    permissions: [
      { permission: 'CAPACITY_VIEW', name: PERMISSION_NAMES.CAPACITY_VIEW },
      { permission: 'CAPACITY_MANAGE', name: PERMISSION_NAMES.CAPACITY_MANAGE },
    ],
  },
];

// =============================================================================
// SERVICE
// =============================================================================

export const teamService = {
  // ==================== Team Members ====================

  async getTeamMembers(companyId: string): Promise<TeamMember[]> {
    if (MOCK_MODE) {
      await simulateDelay(500);
      return MOCK_TEAM_MEMBERS;
    }
    const response = await api.get<TeamMember[]>(`/companies/${companyId}/team`);
    return response.data;
  },

  async getMember(companyId: string, memberId: string): Promise<TeamMember> {
    if (MOCK_MODE) {
      await simulateDelay(300);
      const member = MOCK_TEAM_MEMBERS.find(m => m.id === memberId);
      if (!member) throw new Error('Membro não encontrado');
      return member;
    }
    const response = await api.get<TeamMember>(`/companies/${companyId}/team/${memberId}`);
    return response.data;
  },

  async inviteUser(companyId: string, data: { email: string; companyRole?: CompanyRole }): Promise<Invitation> {
    if (MOCK_MODE) {
      await simulateDelay(800);
      const newInvite: Invitation = {
        id: `inv-${Date.now()}`,
        email: data.email,
        companyRole: data.companyRole || 'VIEWER',
        token: `token-${Date.now()}`,
        inviteUrl: `/convite/token-${Date.now()}`,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        invitedBy: 'Maria Santos',
        createdAt: new Date().toISOString(),
      };
      return newInvite;
    }
    const response = await api.post<Invitation>(`/companies/${companyId}/team/invite`, data);
    return response.data;
  },

  async createUser(
    companyId: string,
    data: { email: string; name: string; password: string; companyRole?: CompanyRole; isCompanyAdmin?: boolean },
  ): Promise<TeamMember> {
    if (MOCK_MODE) {
      await simulateDelay(1000);
      const rolePermissions = MOCK_ROLES.find(r => r.role === (data.companyRole || 'VIEWER'))?.permissions || [];
      const newMember: TeamMember = {
        id: `member-${Date.now()}`,
        userId: `user-${Date.now()}`,
        email: data.email,
        name: data.name,
        userRole: 'BRAND',
        isActive: true,
        companyRole: data.companyRole || 'VIEWER',
        isCompanyAdmin: data.isCompanyAdmin || false,
        permissionOverrides: [],
        effectivePermissions: data.isCompanyAdmin ? ALL_PERMISSIONS : rolePermissions,
        joinedAt: new Date().toISOString(),
      };
      return newMember;
    }
    const response = await api.post<TeamMember>(`/companies/${companyId}/team/create`, data);
    return response.data;
  },

  async updateMember(
    companyId: string,
    memberId: string,
    data: { companyRole?: CompanyRole; isCompanyAdmin?: boolean },
  ): Promise<TeamMember> {
    if (MOCK_MODE) {
      await simulateDelay(500);
      const member = MOCK_TEAM_MEMBERS.find(m => m.id === memberId);
      if (!member) throw new Error('Membro não encontrado');
      return {
        ...member,
        companyRole: data.companyRole || member.companyRole,
        isCompanyAdmin: data.isCompanyAdmin ?? member.isCompanyAdmin,
      };
    }
    const response = await api.patch<TeamMember>(`/companies/${companyId}/team/${memberId}`, data);
    return response.data;
  },

  async updateMemberPermissions(
    companyId: string,
    memberId: string,
    data: { permissionOverrides?: { permission: Permission; granted: boolean }[]; clearOverrides?: boolean },
  ): Promise<TeamMember> {
    if (MOCK_MODE) {
      await simulateDelay(500);
      const member = MOCK_TEAM_MEMBERS.find(m => m.id === memberId);
      if (!member) throw new Error('Membro não encontrado');
      return member;
    }
    const response = await api.patch<TeamMember>(`/companies/${companyId}/team/${memberId}/permissions`, data);
    return response.data;
  },

  async removeMember(companyId: string, memberId: string): Promise<void> {
    if (MOCK_MODE) {
      await simulateDelay(500);
      return;
    }
    await api.delete(`/companies/${companyId}/team/${memberId}`);
  },

  // ==================== Invitations ====================

  async getPendingInvitations(companyId: string): Promise<Invitation[]> {
    if (MOCK_MODE) {
      await simulateDelay(400);
      return MOCK_INVITATIONS;
    }
    const response = await api.get<Invitation[]>(`/companies/${companyId}/team/invitations`);
    return response.data;
  },

  async cancelInvitation(companyId: string, invitationId: string): Promise<void> {
    if (MOCK_MODE) {
      await simulateDelay(300);
      return;
    }
    await api.delete(`/companies/${companyId}/team/invitations/${invitationId}`);
  },

  async resendInvitation(companyId: string, invitationId: string): Promise<Invitation> {
    if (MOCK_MODE) {
      await simulateDelay(500);
      const invite = MOCK_INVITATIONS[0];
      return {
        ...invite,
        token: `new-token-${Date.now()}`,
        inviteUrl: `/convite/new-token-${Date.now()}`,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
    }
    const response = await api.post<Invitation>(`/companies/${companyId}/team/invitations/${invitationId}/resend`);
    return response.data;
  },

  async getInvitationByToken(token: string): Promise<Invitation & { isValid: boolean }> {
    if (MOCK_MODE) {
      await simulateDelay(400);
      return {
        ...MOCK_INVITATIONS[0],
        token,
        isValid: true,
        company: {
          id: 'company-brand-001',
          tradeName: 'Fashion Style Ltda',
          type: 'BRAND',
        },
      };
    }
    const response = await api.get<Invitation & { isValid: boolean }>(`/invitations/${token}`);
    return response.data;
  },

  async acceptInvitation(
    token: string,
    data?: { name?: string; password?: string },
  ): Promise<{ success: boolean; requiresRegistration?: boolean }> {
    if (MOCK_MODE) {
      await simulateDelay(800);
      return { success: true };
    }
    const response = await api.post<{ success: boolean; requiresRegistration?: boolean }>(
      `/invitations/${token}/accept`,
      data || {},
    );
    return response.data;
  },

  async declineInvitation(token: string): Promise<void> {
    if (MOCK_MODE) {
      await simulateDelay(300);
      return;
    }
    await api.post(`/invitations/${token}/decline`);
  },

  async getMyPendingInvitations(): Promise<Invitation[]> {
    if (MOCK_MODE) {
      await simulateDelay(400);
      return [];
    }
    const response = await api.get<Invitation[]>('/invitations/pending');
    return response.data;
  },

  // ==================== Roles & Permissions Info ====================

  async getRoles(): Promise<RoleInfo[]> {
    if (MOCK_MODE) {
      await simulateDelay(200);
      return MOCK_ROLES;
    }
    const response = await api.get<RoleInfo[]>('/roles');
    return response.data;
  },

  async getRoleInfo(role: CompanyRole): Promise<RoleInfo> {
    if (MOCK_MODE) {
      await simulateDelay(200);
      const roleInfo = MOCK_ROLES.find(r => r.role === role);
      if (!roleInfo) throw new Error('Role não encontrado');
      return roleInfo;
    }
    const response = await api.get<RoleInfo>(`/roles/${role}`);
    return response.data;
  },

  async getPermissionCategories(): Promise<PermissionCategory[]> {
    if (MOCK_MODE) {
      await simulateDelay(200);
      return MOCK_PERMISSION_CATEGORIES;
    }
    const response = await api.get<PermissionCategory[]>('/permissions/categories');
    return response.data;
  },

  // ==================== User Permissions ====================

  async getMyPermissions(companyId: string): Promise<{
    companyRole: CompanyRole;
    isCompanyAdmin: boolean;
    effectivePermissions: Permission[];
  }> {
    if (MOCK_MODE) {
      await simulateDelay(300);
      return {
        companyRole: 'ADMIN',
        isCompanyAdmin: true,
        effectivePermissions: ALL_PERMISSIONS,
      };
    }
    const response = await api.get<{
      companyRole: CompanyRole;
      isCompanyAdmin: boolean;
      effectivePermissions: Permission[];
    }>(`/companies/${companyId}/my-permissions`);
    return response.data;
  },
};
