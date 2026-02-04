/**
 * Supplier Invitation WhatsApp Template
 *
 * Generates WhatsApp message for inviting suppliers to join the platform.
 */

export interface InvitationWhatsAppData {
    brandName: string;
    supplierLegalName: string;
    contactName: string;
    customMessage?: string;
    acceptUrl: string;
    expiresAt: Date;
}

export const generateInvitationWhatsAppMessage = (data: InvitationWhatsAppData): string => {
    const expiryDate = new Date(data.expiresAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });

    const customMessagePart = data.customMessage
        ? `\n\n💬 *Mensagem de ${data.brandName}:*\n"${data.customMessage}"`
        : '';

    return `
🎉 *Convite para Parceria*

Olá ${data.contactName}!

A *${data.brandName}* está convidando a empresa *${data.supplierLegalName}* para fazer parte da rede de fornecedores credenciados na plataforma *TexLink*.${customMessagePart}

✅ *Benefícios:*
• Pedidos diretos da marca
• Gestão integrada de produção
• Pagamentos seguros

🔗 *Aceite o convite:*
${data.acceptUrl}

⏰ _Este convite expira em ${expiryDate}_

---
_Enviado via TexLink_
  `.trim();
};

/**
 * Short version for SMS fallback
 */
export const generateInvitationSmsMessage = (data: InvitationWhatsAppData): string => {
    return `${data.brandName} convida ${data.supplierLegalName} para ser fornecedor credenciado. Aceite: ${data.acceptUrl} (válido até ${new Date(data.expiresAt).toLocaleDateString('pt-BR')})`;
};
