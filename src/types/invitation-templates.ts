/**
 * Tipos relacionados a templates de convite de credenciamento
 */

export type InvitationType = 'EMAIL' | 'WHATSAPP' | 'SMS' | 'LINK';

export interface InvitationTemplate {
    id: string;
    companyId: string;
    name: string;
    type: InvitationType;
    subject?: string; // Obrigatório apenas para EMAIL
    content: string;
    isActive: boolean;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateInvitationTemplateDto {
    name: string;
    type: InvitationType;
    subject?: string;
    content: string;
}

export interface UpdateInvitationTemplateDto {
    name?: string;
    type?: InvitationType;
    subject?: string;
    content?: string;
}

/**
 * Variáveis permitidas nos templates
 */
export const TEMPLATE_VARIABLES = [
    { key: 'brand_name', label: 'Nome da Marca', description: 'Nome da marca/empresa' },
    { key: 'contact_name', label: 'Nome do Contato', description: 'Nome da pessoa de contato' },
    { key: 'company_name', label: 'Nome da Empresa', description: 'Nome da empresa fornecedora (opcional)' },
    { key: 'link', label: 'Link do Convite', description: 'URL para aceitar o convite' },
    { key: 'cnpj', label: 'CNPJ', description: 'CNPJ da empresa fornecedora' },
] as const;

/**
 * Helper para substituir variáveis no template
 */
export function replaceTemplateVariables(
    template: string,
    variables: Record<string, string>
): string {
    let result = template;
    Object.keys(variables).forEach((key) => {
        const placeholder = `{{${key}}}`;
        const value = variables[key] || '';
        result = result.replace(new RegExp(placeholder, 'g'), value);
    });
    return result;
}

/**
 * Helper para extrair variáveis do template
 */
export function extractTemplateVariables(template: string): string[] {
    const regex = /\{\{(\w+)\}\}/g;
    const matches = template.match(regex);
    if (!matches) return [];

    return matches.map(match => match.replace(/\{\{|\}\}/g, ''));
}

/**
 * Helper para validar variáveis do template
 */
export function validateTemplateVariables(template: string): {
    isValid: boolean;
    invalidVariables: string[];
} {
    const allowedKeys = TEMPLATE_VARIABLES.map(v => v.key);
    const usedVariables = extractTemplateVariables(template);
    const invalidVariables = usedVariables.filter(v => !allowedKeys.includes(v));

    return {
        isValid: invalidVariables.length === 0,
        invalidVariables,
    };
}
