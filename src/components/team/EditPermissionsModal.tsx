import React, { useState, useEffect } from 'react';
import { X, Shield, Check, Minus, Plus, RotateCcw, Info, ShieldAlert, Loader2 } from 'lucide-react';
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
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8 shadow-2xl">
          <Loader2 className="w-10 h-10 text-brand-600 dark:text-brand-400 animate-spin mx-auto" />
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-4 font-medium">Carregando permissões...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-lg">
              <Shield className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Editar Permissões</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{member.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 border-b border-blue-100/50 dark:border-blue-900/20">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <p className="text-blue-800 dark:text-blue-300">
                Cargo atual: <strong className="text-blue-900 dark:text-blue-200">{ROLE_NAMES[member.companyRole]}</strong>
              </p>
              <p className="text-blue-700 dark:text-blue-400 mt-1">
                Clique nas permissões para adicionar exceções individuais. Elas têm prioridade sobre as regras padrão do cargo.
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-700 dark:text-red-400 text-sm flex gap-2 mb-6 font-medium">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div className="space-y-8">
            {categories.map(category => (
              <div key={category.key}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-4 bg-brand-500 rounded-full" />
                  <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                    {category.name}
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {category.permissions.map(({ permission }) => {
                    const { hasFromRole, override } = getPermissionState(permission);
                    const isEffective = getEffectiveState(permission);

                    return (
                      <button
                        key={permission}
                        onClick={() => cycleOverride(permission)}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left group ${override !== 'inherit'
                            ? override === 'grant'
                              ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800/30'
                              : 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30'
                            : isEffective
                              ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-700'
                              : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 opacity-60 hover:opacity-100'
                          }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Status indicator */}
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border transition-all ${override === 'grant'
                                ? 'bg-green-500 dark:bg-green-600 border-green-400 text-white'
                                : override === 'deny'
                                  ? 'bg-red-500 dark:bg-red-600 border-red-400 text-white'
                                  : isEffective
                                    ? 'bg-brand-50 dark:bg-brand-900/30 border-brand-200 dark:border-brand-800 text-brand-600 dark:text-brand-400'
                                    : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400'
                              }`}
                          >
                            {override === 'grant' ? (
                              <Plus className="w-4 h-4" />
                            ) : override === 'deny' ? (
                              <Minus className="w-4 h-4" />
                            ) : isEffective ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Minus className="w-4 h-4" />
                            )}
                          </div>

                          <span
                            className={`text-sm font-bold truncate ${isEffective || override === 'grant'
                                ? 'text-gray-900 dark:text-white'
                                : 'text-gray-400 dark:text-gray-500'
                              }`}
                          >
                            {PERMISSION_NAMES[permission]}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 pl-2">
                          {override !== 'inherit' && (
                            <span
                              className={`text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded shadow-sm ${override === 'grant'
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                }`}
                            >
                              {override === 'grant' ? 'Add' : 'Deny'}
                            </span>
                          )}
                          {hasFromRole && override === 'inherit' && (
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium italic">Função</span>
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
        <div className="flex items-center justify-between p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-800/30">
          <button
            onClick={resetOverrides}
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Limpar Exceções
          </button>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="px-8 py-2.5 bg-brand-600 text-white text-sm font-bold rounded-xl hover:bg-brand-700 shadow-lg shadow-brand-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Salvando...
                </div>
              ) : 'Salvar Alterações'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditPermissionsModal;
