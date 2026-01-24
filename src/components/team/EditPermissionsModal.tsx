import React, { useState, useEffect } from 'react';
import { X, Shield, Check, Minus, Plus, RotateCcw, Info } from 'lucide-react';
import { teamService } from '../../services/team.service';
import {
  Permission,
  PermissionCategory,
  TeamMember,
  ROLE_NAMES,
  PERMISSION_NAMES,
} from '../../types/permissions';

interface EditPermissionsModalProps {
  companyId: string;
  member: TeamMember;
  onClose: () => void;
  onMemberUpdated: (member: TeamMember) => void;
}

type OverrideState = 'inherit' | 'grant' | 'deny';

const EditPermissionsModal: React.FC<EditPermissionsModalProps> = ({
  companyId,
  member,
  onClose,
  onMemberUpdated,
}) => {
  const [categories, setCategories] = useState<PermissionCategory[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);
  const [overrides, setOverrides] = useState<Record<Permission, OverrideState>>({} as any);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar categorias e permissões do role
  useEffect(() => {
    const loadData = async () => {
      try {
        const [categoriesData, roleInfo] = await Promise.all([
          teamService.getPermissionCategories(),
          teamService.getRoleInfo(member.companyRole),
        ]);

        setCategories(categoriesData);
        setRolePermissions(roleInfo.permissions);

        // Inicializar overrides existentes
        const initialOverrides: Record<Permission, OverrideState> = {} as any;
        for (const override of member.permissionOverrides) {
          initialOverrides[override.permission] = override.granted ? 'grant' : 'deny';
        }
        setOverrides(initialOverrides);
      } catch (err) {
        console.error('Erro ao carregar permissões:', err);
        setError('Erro ao carregar permissões');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [member]);

  const getPermissionState = (permission: Permission): { hasFromRole: boolean; override: OverrideState } => {
    const hasFromRole = rolePermissions.includes(permission);
    const override = overrides[permission] || 'inherit';
    return { hasFromRole, override };
  };

  const getEffectiveState = (permission: Permission): boolean => {
    const { hasFromRole, override } = getPermissionState(permission);
    if (override === 'grant') return true;
    if (override === 'deny') return false;
    return hasFromRole;
  };

  const cycleOverride = (permission: Permission) => {
    const { hasFromRole, override } = getPermissionState(permission);

    let newOverride: OverrideState;
    if (hasFromRole) {
      // Se tem do role: inherit -> deny -> inherit
      newOverride = override === 'inherit' ? 'deny' : 'inherit';
    } else {
      // Se não tem do role: inherit -> grant -> inherit
      newOverride = override === 'inherit' ? 'grant' : 'inherit';
    }

    setOverrides(prev => ({
      ...prev,
      [permission]: newOverride,
    }));
  };

  const resetOverrides = () => {
    setOverrides({} as any);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      // Converter overrides para o formato da API
      const permissionOverrides = Object.entries(overrides)
        .filter(([_, state]) => state !== 'inherit')
        .map(([permission, state]) => ({
          permission: permission as Permission,
          granted: state === 'grant',
        }));

      // Verificar se precisa limpar ou enviar overrides
      const hasOverrides = permissionOverrides.length > 0;
      const hadOverrides = member.permissionOverrides.length > 0;

      const updatedMember = await teamService.updateMemberPermissions(companyId, member.id, {
        clearOverrides: hadOverrides && !hasOverrides,
        permissionOverrides: hasOverrides ? permissionOverrides : undefined,
      });

      onMemberUpdated(updatedMember);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar permissões');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = Object.keys(overrides).some(key => {
    const permission = key as Permission;
    const originalOverride = member.permissionOverrides.find(o => o.permission === permission);
    const currentOverride = overrides[permission];

    if (!originalOverride && currentOverride === 'inherit') return false;
    if (!originalOverride && currentOverride !== 'inherit') return true;
    if (originalOverride && currentOverride === 'inherit') return true;
    if (originalOverride) {
      const originalState = originalOverride.granted ? 'grant' : 'deny';
      return originalState !== currentOverride;
    }
    return false;
  });

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-brand-900 border border-brand-800 rounded-xl p-8">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-brand-900 border border-brand-800 rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-brand-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-800 rounded-lg">
              <Shield className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Editar Permissões</h2>
              <p className="text-sm text-gray-400">{member.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-brand-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="p-4 bg-brand-800/30 border-b border-brand-800 flex-shrink-0">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-gray-300">
                Role atual: <strong className="text-white">{ROLE_NAMES[member.companyRole]}</strong>
              </p>
              <p className="text-gray-400 mt-1">
                Clique nas permissões para adicionar overrides individuais. Overrides têm prioridade sobre as
                permissões do role.
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm mb-4">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {categories.map(category => (
              <div key={category.key}>
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
                  {category.name}
                </h3>
                <div className="grid gap-2">
                  {category.permissions.map(({ permission }) => {
                    const { hasFromRole, override } = getPermissionState(permission);
                    const isEffective = getEffectiveState(permission);

                    return (
                      <button
                        key={permission}
                        onClick={() => cycleOverride(permission)}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          override !== 'inherit'
                            ? override === 'grant'
                              ? 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20'
                              : 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20'
                            : isEffective
                              ? 'bg-brand-800/50 border-brand-700 hover:bg-brand-800'
                              : 'bg-brand-900/50 border-brand-800 hover:bg-brand-900'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Status indicator */}
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center ${
                              override === 'grant'
                                ? 'bg-green-500/20'
                                : override === 'deny'
                                  ? 'bg-red-500/20'
                                  : isEffective
                                    ? 'bg-brand-500/20'
                                    : 'bg-gray-700'
                            }`}
                          >
                            {override === 'grant' ? (
                              <Plus className="w-3 h-3 text-green-400" />
                            ) : override === 'deny' ? (
                              <Minus className="w-3 h-3 text-red-400" />
                            ) : isEffective ? (
                              <Check className="w-3 h-3 text-brand-400" />
                            ) : (
                              <Minus className="w-3 h-3 text-gray-500" />
                            )}
                          </div>

                          <span
                            className={
                              isEffective || override === 'grant' ? 'text-white' : 'text-gray-400'
                            }
                          >
                            {PERMISSION_NAMES[permission]}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {override !== 'inherit' && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${
                                override === 'grant'
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}
                            >
                              {override === 'grant' ? 'Concedido' : 'Negado'}
                            </span>
                          )}
                          {hasFromRole && override === 'inherit' && (
                            <span className="text-xs text-gray-500">do role</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-brand-800 flex-shrink-0">
          <button
            onClick={resetOverrides}
            className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Resetar Overrides
          </button>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditPermissionsModal;
