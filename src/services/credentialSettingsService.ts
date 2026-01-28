import api from './api';
import type {
    InvitationTemplate,
    CreateInvitationTemplateDto,
    UpdateInvitationTemplateDto,
} from '../types/invitation-templates';

/**
 * Serviço para gerenciar configurações de credenciamento e templates
 */
export const credentialSettingsService = {
    /**
     * Lista todos os templates de convite
     */
    async getInvitationTemplates(): Promise<InvitationTemplate[]> {
        const response = await api.get('/credential-settings/invitation-templates');
        return response.data;
    },

    /**
     * Busca template por ID
     */
    async getInvitationTemplate(id: string): Promise<InvitationTemplate> {
        const response = await api.get(`/credential-settings/invitation-templates/${id}`);
        return response.data;
    },

    /**
     * Cria novo template de convite
     */
    async createInvitationTemplate(
        data: CreateInvitationTemplateDto
    ): Promise<InvitationTemplate> {
        const response = await api.post('/credential-settings/invitation-templates', data);
        return response.data;
    },

    /**
     * Atualiza template existente
     */
    async updateInvitationTemplate(
        id: string,
        data: UpdateInvitationTemplateDto
    ): Promise<InvitationTemplate> {
        const response = await api.patch(
            `/credential-settings/invitation-templates/${id}`,
            data
        );
        return response.data;
    },

    /**
     * Remove template
     */
    async deleteInvitationTemplate(id: string): Promise<void> {
        await api.delete(`/credential-settings/invitation-templates/${id}`);
    },

    /**
     * Duplica um template (cria cópia)
     */
    async duplicateInvitationTemplate(id: string): Promise<InvitationTemplate> {
        const original = await this.getInvitationTemplate(id);

        const duplicatedData: CreateInvitationTemplateDto = {
            name: `${original.name} (Cópia)`,
            type: original.type,
            subject: original.subject,
            content: original.content,
        };

        return this.createInvitationTemplate(duplicatedData);
    },
};
