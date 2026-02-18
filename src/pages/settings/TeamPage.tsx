import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  ShieldCheck,
  MoreVertical,
  Search,
  RefreshCw,
  Copy,
  Trash2,
  Edit3,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { PermissionGate, AdminOnly } from '../../components/auth/PermissionGate';
import { teamService } from '../../services/team.service';
import {
  TeamMember,
  Invitation,
  CompanyRole,
  ROLE_NAMES,
  ROLE_DESCRIPTIONS,
  ALL_COMPANY_ROLES,
} from '../../types/permissions';
import InviteUserModal from '../../components/team/InviteUserModal';
import CreateUserModal from '../../components/team/CreateUserModal';
import EditMemberModal from '../../components/team/EditMemberModal';
import EditPermissionsModal from '../../components/team/EditPermissionsModal';

const TeamPage: React.FC = () => {
  const { user } = useAuth();
  // Pick the company matching user role; fall back to first association
  const matchingCompanyUser =
    user?.companyUsers?.find((cu) => cu.company?.type === user?.role) ||
    user?.companyUsers?.[0];
  const companyId = matchingCompanyUser?.company?.id || '';

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<CompanyRole | 'ALL'>('ALL');
  const [activeTab, setActiveTab] = useState<'members' | 'invitations'>('members');

  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditMemberModal, setShowEditMemberModal] = useState(false);
  const [showEditPermissionsModal, setShowEditPermissionsModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  // Dropdown menus
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const loadData = async () => {
    if (!companyId) return;

    setIsLoading(true);
    setError(null);

    try {
      const [membersData, invitationsData] = await Promise.allSettled([
        teamService.getTeamMembers(companyId),
        teamService.getPendingInvitations(companyId),
      ]);

      // Handle members - even if it fails, use empty array
      if (membersData.status === 'fulfilled') {
        setMembers(membersData.value);
      } else {
        console.warn('Erro ao carregar membros:', membersData.reason);
        setMembers([]);
      }

      // Handle invitations - even if it fails, use empty array
      if (invitationsData.status === 'fulfilled') {
        setInvitations(invitationsData.value);
      } else {
        console.warn('Erro ao carregar convites:', invitationsData.reason);
        setInvitations([]);
      }
    } catch (err) {
      console.error('Erro ao carregar dados da equipe:', err);
      // Don't set error - just show empty state with create options
      setMembers([]);
      setInvitations([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [companyId]);

  // Filtrar membros
  const filteredMembers = members.filter(member => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || member.companyRole === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Handlers
  const handleEditMember = (member: TeamMember) => {
    setSelectedMember(member);
    setShowEditMemberModal(true);
    setOpenMenuId(null);
  };

  const handleEditPermissions = (member: TeamMember) => {
    setSelectedMember(member);
    setShowEditPermissionsModal(true);
    setOpenMenuId(null);
  };

  const handleRemoveMember = async (member: TeamMember) => {
    if (!confirm(`Tem certeza que deseja remover ${member.name} da equipe?`)) return;

    try {
      await teamService.removeMember(companyId, member.id);
      setMembers(prev => prev.filter(m => m.id !== member.id));
    } catch (err: any) {
      alert(err.message || 'Erro ao remover membro');
    }
    setOpenMenuId(null);
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!confirm('Tem certeza que deseja cancelar este convite?')) return;

    try {
      await teamService.cancelInvitation(companyId, invitationId);
      setInvitations(prev => prev.filter(i => i.id !== invitationId));
    } catch (err: any) {
      alert(err.message || 'Erro ao cancelar convite');
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    try {
      const newInvite = await teamService.resendInvitation(companyId, invitationId);
      setInvitations(prev => prev.map(i => (i.id === invitationId ? newInvite : i)));
      alert('Convite reenviado com sucesso!');
    } catch (err: any) {
      alert(err.message || 'Erro ao reenviar convite');
    }
  };

  const copyInviteLink = (inviteUrl: string) => {
    navigator.clipboard.writeText(`${window.location.origin}${inviteUrl}`);
    alert('Link copiado para a área de transferência!');
  };

  const handleMemberUpdated = (updatedMember: TeamMember) => {
    setMembers(prev => prev.map(m => (m.id === updatedMember.id ? updatedMember : m)));
  };

  const handleMemberCreated = (newMember: TeamMember) => {
    setMembers(prev => [...prev, newMember]);
  };

  const handleInviteSent = (newInvitation: Invitation) => {
    setInvitations(prev => [...prev, newInvitation]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg p-4 text-red-600 dark:text-red-400">
        <AlertCircle className="w-5 h-5 inline mr-2" />
        {error}
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Equipe</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Gerencie os membros e permissões da sua equipe
            </p>
          </div>

          <AdminOnly>
            <div className="flex gap-2">
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <Mail className="w-4 h-4" />
                Convidar por Email
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Criar Usuário
              </button>
            </div>
          </AdminOnly>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('members')}
            className={`pb-3 px-1 text-sm font-medium transition-colors ${activeTab === 'members'
              ? 'text-brand-600 dark:text-brand-400 border-b-2 border-brand-600 dark:border-brand-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white'
              }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Membros ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`pb-3 px-1 text-sm font-medium transition-colors ${activeTab === 'invitations'
              ? 'text-brand-600 dark:text-brand-400 border-b-2 border-brand-600 dark:border-brand-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white'
              }`}
          >
            <Mail className="w-4 h-4 inline mr-2" />
            Convites Pendentes ({invitations.length})
          </button>
        </div>

        {/* Members Tab */}
        {activeTab === 'members' && (
          <>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome ou email..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value as CompanyRole | 'ALL')}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              >
                <option value="ALL">Todos os Tipos de Acesso</option>
                {ALL_COMPANY_ROLES.map(role => (
                  <option key={role} value={role}>
                    {ROLE_NAMES[role]}
                  </option>
                ))}
              </select>
            </div>

            {/* Members List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Membro
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Entrada
                    </th>
                    <th className="text-right px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredMembers.map(member => (
                    <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/50 flex items-center justify-center text-brand-600 dark:text-brand-400 font-medium">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-900 dark:text-white font-medium">{member.name}</span>
                              {member.isCompanyAdmin && (
                                <span className="px-2 py-0.5 text-xs bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-full flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3" />
                                  Admin
                                </span>
                              )}
                            </div>
                            <span className="text-gray-500 dark:text-gray-400 text-sm">{member.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 text-xs bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 rounded-full">
                          {ROLE_NAMES[member.companyRole]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {member.isActive ? (
                          <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                            <CheckCircle className="w-4 h-4" />
                            Ativo
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-sm">
                            <XCircle className="w-4 h-4" />
                            Inativo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm">
                        {new Date(member.joinedAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <AdminOnly>
                          <div className="relative inline-block">
                            <button
                              onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)}
                              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {openMenuId === member.id && (
                              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-10">
                                <button
                                  onClick={() => handleEditMember(member)}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                >
                                  <Edit3 className="w-4 h-4" />
                                  Editar Role
                                </button>
                                <PermissionGate permission="TEAM_MANAGE_PERMISSIONS">
                                  <button
                                    onClick={() => handleEditPermissions(member)}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                  >
                                    <Shield className="w-4 h-4" />
                                    Editar Permissões
                                  </button>
                                </PermissionGate>
                                {member.userId !== user?.id && (
                                  <button
                                    onClick={() => handleRemoveMember(member)}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Remover
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </AdminOnly>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredMembers.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="mb-4">
                    {searchQuery || roleFilter !== 'ALL'
                      ? 'Nenhum membro encontrado com os filtros aplicados'
                      : 'Sua equipe ainda não tem membros'}
                  </p>
                  {!searchQuery && roleFilter === 'ALL' && (
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={() => setShowInviteModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        <Mail className="w-4 h-4" />
                        Convidar por Email
                      </button>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
                      >
                        <UserPlus className="w-4 h-4" />
                        Criar Usuário
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Invitations Tab */}
        {activeTab === 'invitations' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm relative">
            {invitations.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum convite pendente</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Convidado por
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Expira em
                    </th>
                    <th className="text-right px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {invitations.map(invitation => (
                    <tr key={invitation.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-gray-900 dark:text-white">{invitation.email}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 text-xs bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 rounded-full">
                          {ROLE_NAMES[invitation.companyRole]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm">{invitation.invitedBy}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className={invitation.isExpired ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}>
                            {new Date(invitation.expiresAt).toLocaleDateString('pt-BR')}
                            {invitation.isExpired && ' (Expirado)'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => copyInviteLink(invitation.inviteUrl)}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="Copiar link"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleResendInvitation(invitation.id)}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="Reenviar"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleCancelInvitation(invitation.id)}
                            className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Cancelar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        )}

        {/* Modals */}
        {showInviteModal && (
          <InviteUserModal
            companyId={companyId}
            onClose={() => setShowInviteModal(false)}
            onInviteSent={handleInviteSent}
          />
        )}

        {showCreateModal && (
          <CreateUserModal
            companyId={companyId}
            onClose={() => setShowCreateModal(false)}
            onUserCreated={handleMemberCreated}
          />
        )}

        {showEditMemberModal && selectedMember && (
          <EditMemberModal
            companyId={companyId}
            member={selectedMember}
            onClose={() => {
              setShowEditMemberModal(false);
              setSelectedMember(null);
            }}
            onMemberUpdated={handleMemberUpdated}
          />
        )}

        {showEditPermissionsModal && selectedMember && (
          <EditPermissionsModal
            companyId={companyId}
            member={selectedMember}
            onClose={() => {
              setShowEditPermissionsModal(false);
              setSelectedMember(null);
            }}
            onMemberUpdated={handleMemberUpdated}
          />
        )}

        {/* Click outside to close menu */}
        {openMenuId && <div className="fixed inset-0 z-0" onClick={() => setOpenMenuId(null)} />}
      </div>
    </div>
  );
};

export default TeamPage;
