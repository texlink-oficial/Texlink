import { useState, useEffect, useCallback } from 'react';
import { credentialSettingsService } from '../services';
import type { InvitationTemplate } from '../types/invitation-templates';

interface UseTemplatesReturn {
    templates: InvitationTemplate[];
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    createTemplate: (data: any) => Promise<InvitationTemplate>;
    updateTemplate: (id: string, data: any) => Promise<InvitationTemplate>;
    deleteTemplate: (id: string) => Promise<void>;
    duplicateTemplate: (id: string) => Promise<InvitationTemplate>;
}

/**
 * Hook para gerenciar templates de convite
 */
export function useTemplates(): UseTemplatesReturn {
    const [templates, setTemplates] = useState<InvitationTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTemplates = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await credentialSettingsService.getInvitationTemplates();
            setTemplates(data);
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar templates');
            console.error('Error fetching templates:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    const createTemplate = useCallback(async (data: any) => {
        try {
            const newTemplate = await credentialSettingsService.createInvitationTemplate(data);
            setTemplates(prev => [...prev, newTemplate]);
            return newTemplate;
        } catch (err: any) {
            throw new Error(err.response?.data?.message || 'Erro ao criar template');
        }
    }, []);

    const updateTemplate = useCallback(async (id: string, data: any) => {
        try {
            const updatedTemplate = await credentialSettingsService.updateInvitationTemplate(id, data);
            setTemplates(prev => prev.map(t => t.id === id ? updatedTemplate : t));
            return updatedTemplate;
        } catch (err: any) {
            throw new Error(err.response?.data?.message || 'Erro ao atualizar template');
        }
    }, []);

    const deleteTemplate = useCallback(async (id: string) => {
        try {
            await credentialSettingsService.deleteInvitationTemplate(id);
            setTemplates(prev => prev.filter(t => t.id !== id));
        } catch (err: any) {
            throw new Error(err.response?.data?.message || 'Erro ao excluir template');
        }
    }, []);

    const duplicateTemplate = useCallback(async (id: string) => {
        try {
            const duplicated = await credentialSettingsService.duplicateInvitationTemplate(id);
            setTemplates(prev => [...prev, duplicated]);
            return duplicated;
        } catch (err: any) {
            throw new Error(err.response?.data?.message || 'Erro ao duplicar template');
        }
    }, []);

    return {
        templates,
        isLoading,
        error,
        refetch: fetchTemplates,
        createTemplate,
        updateTemplate,
        deleteTemplate,
        duplicateTemplate,
    };
}
