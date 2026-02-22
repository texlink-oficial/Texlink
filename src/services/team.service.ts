import api from './api';
import {
  TeamMember,
  Invitation,
  RoleInfo,
  PermissionCategory,
  CompanyRole,
  Permission,
} from '../types/permissions';

// =============================================================================
// SERVICE
// =============================================================================

export const teamService = {
  // ==================== Team Members ====================

  async getTeamMembers(companyId: string): Promise<TeamMember[]> {
    const response = await api.get<TeamMember[]>(`/companies/${companyId}/team`);
    return response.data;
  },

  async getMember(companyId: string, memberId: string): Promise<TeamMember> {
    const response = await api.get<TeamMember>(`/companies/${companyId}/team/${memberId}`);
    return response.data;
  },

  async inviteUser(companyId: string, data: { email: string; companyRole?: CompanyRole }): Promise<Invitation> {
    const response = await api.post<Invitation>(`/companies/${companyId}/team/invite`, data);
    return response.data;
  },

  async createUser(
    companyId: string,
    data: { email: string; name: string; password: string; companyRole?: CompanyRole; isCompanyAdmin?: boolean },
  ): Promise<TeamMember> {
    const response = await api.post<TeamMember>(`/companies/${companyId}/team/create`, data);
    return response.data;
  },

  async updateMember(
    companyId: string,
    memberId: string,
    data: { companyRole?: CompanyRole; isCompanyAdmin?: boolean },
  ): Promise<TeamMember> {
    const response = await api.patch<TeamMember>(`/companies/${companyId}/team/${memberId}`, data);
    return response.data;
  },

  async updateMemberPermissions(
    companyId: string,
    memberId: string,
    data: { permissionOverrides?: { permission: Permission; granted: boolean }[]; clearOverrides?: boolean },
  ): Promise<TeamMember> {
    const response = await api.patch<TeamMember>(`/companies/${companyId}/team/${memberId}/permissions`, data);
    return response.data;
  },

  async toggleMemberActive(companyId: string, memberId: string): Promise<{ isActive: boolean }> {
    const response = await api.patch<{ isActive: boolean }>(`/companies/${companyId}/team/${memberId}/toggle-active`);
    return response.data;
  },

  async removeMember(companyId: string, memberId: string): Promise<void> {
    await api.delete(`/companies/${companyId}/team/${memberId}`);
  },

  // ==================== Invitations ====================

  async getPendingInvitations(companyId: string): Promise<Invitation[]> {
    const response = await api.get<Invitation[]>(`/companies/${companyId}/team/invitations`);
    return response.data;
  },

  async cancelInvitation(companyId: string, invitationId: string): Promise<void> {
    await api.delete(`/companies/${companyId}/team/invitations/${invitationId}`);
  },

  async resendInvitation(companyId: string, invitationId: string): Promise<Invitation> {
    const response = await api.post<Invitation>(`/companies/${companyId}/team/invitations/${invitationId}/resend`);
    return response.data;
  },

  async getInvitationByToken(token: string): Promise<Invitation & { isValid: boolean }> {
    const response = await api.get<Invitation & { isValid: boolean }>(`/invitations/${token}`);
    return response.data;
  },

  async acceptInvitation(
    token: string,
    data?: { name?: string; password?: string },
  ): Promise<{ success: boolean; requiresRegistration?: boolean }> {
    const response = await api.post<{ success: boolean; requiresRegistration?: boolean }>(
      `/invitations/${token}/accept`,
      data || {},
    );
    return response.data;
  },

  async declineInvitation(token: string): Promise<void> {
    await api.post(`/invitations/${token}/decline`);
  },

  async getMyPendingInvitations(): Promise<Invitation[]> {
    const response = await api.get<Invitation[]>('/invitations/pending');
    return response.data;
  },

  // ==================== Roles & Permissions Info ====================

  async getRoles(): Promise<RoleInfo[]> {
    const response = await api.get<RoleInfo[]>('/roles');
    return response.data;
  },

  async getRoleInfo(role: CompanyRole): Promise<RoleInfo> {
    const response = await api.get<RoleInfo>(`/roles/${role}`);
    return response.data;
  },

  async getPermissionCategories(): Promise<PermissionCategory[]> {
    const response = await api.get<PermissionCategory[]>('/permissions/categories');
    return response.data;
  },

  // ==================== User Permissions ====================

  async getMyPermissions(companyId: string): Promise<{
    companyRole: CompanyRole;
    isCompanyAdmin: boolean;
    effectivePermissions: Permission[];
  }> {
    const response = await api.get<{
      companyRole: CompanyRole;
      isCompanyAdmin: boolean;
      effectivePermissions: Permission[];
    }>(`/companies/${companyId}/my-permissions`);
    return response.data;
  },
};
