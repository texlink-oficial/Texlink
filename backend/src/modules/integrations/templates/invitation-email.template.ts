/**
 * Supplier Invitation Email Template
 *
 * Generates HTML email for inviting suppliers to join the platform.
 */

export interface InvitationEmailData {
    brandName: string;
    brandLogoUrl?: string;
    supplierLegalName: string;
    supplierCnpj: string;
    contactName: string;
    customMessage?: string;
    acceptUrl: string;
    expiresAt: Date;
}

export const generateInvitationEmailHtml = (data: InvitationEmailData): string => {
    const expiryDate = new Date(data.expiresAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });

    const customMessageHtml = data.customMessage
        ? `
      <div style="background: #f8fafc; border-left: 4px solid #6366f1; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
        <p style="margin: 0; font-size: 14px; color: #475569; font-style: italic;">
          "${data.customMessage}"
        </p>
        <p style="margin: 8px 0 0 0; font-size: 12px; color: #94a3b8;">
          — Mensagem de ${data.brandName}
        </p>
      </div>
    `
        : '';

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Convite para ${data.supplierLegalName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; border-radius: 16px 16px 0 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    ${data.brandLogoUrl ? `<img src="${data.brandLogoUrl}" alt="${data.brandName}" style="height: 40px; margin-bottom: 16px;">` : ''}
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff;">
                      Convite para Parceria
                    </h1>
                    <p style="margin: 8px 0 0 0; font-size: 16px; color: rgba(255, 255, 255, 0.9);">
                      ${data.brandName} quer trabalhar com você!
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; color: #334155; line-height: 1.6;">
                Olá <strong>${data.contactName}</strong>,
              </p>
              
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #334155; line-height: 1.6;">
                A <strong>${data.brandName}</strong> está convidando a sua empresa para fazer parte da rede de fornecedores credenciados na plataforma <strong>TexLink</strong>.
              </p>

              <!-- Company Info Box -->
              <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 24px 0;">
                <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">
                  Empresa Convidada
                </p>
                <p style="margin: 0; font-size: 18px; font-weight: 600; color: #1e293b;">
                  ${data.supplierLegalName}
                </p>
                <p style="margin: 4px 0 0 0; font-size: 14px; color: #64748b;">
                  CNPJ: ${data.supplierCnpj}
                </p>
              </div>

              ${customMessageHtml}

              <!-- Benefits -->
              <p style="margin: 24px 0 16px 0; font-size: 14px; font-weight: 600; color: #334155;">
                Ao aceitar o convite, você terá acesso a:
              </p>
              <ul style="margin: 0 0 24px 0; padding-left: 20px; color: #475569; line-height: 1.8;">
                <li>Pedidos diretamente de ${data.brandName}</li>
                <li>Gestão integrada de produção</li>
                <li>Comunicação facilitada via plataforma</li>
                <li>Pagamentos seguros e rastreáveis</li>
              </ul>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 16px 0;">
                    <a href="${data.acceptUrl}" 
                       style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px 0 rgba(99, 102, 241, 0.4);">
                      Aceitar Convite
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiry Notice -->
              <div style="background: #fef3c7; border-radius: 8px; padding: 12px 16px; margin: 24px 0; text-align: center;">
                <p style="margin: 0; font-size: 14px; color: #92400e;">
                  ⏰ Este convite expira em <strong>${expiryDate}</strong>
                </p>
              </div>

              <p style="margin: 24px 0 0 0; font-size: 14px; color: #64748b; line-height: 1.6;">
                Se você não reconhece este convite ou acredita que recebeu este email por engano, 
                por favor ignore esta mensagem.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; padding: 24px 32px; border-radius: 0 0 16px 16px; border-top: 1px solid #e2e8f0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                      Este email foi enviado pela plataforma TexLink em nome de ${data.brandName}.
                    </p>
                    <p style="margin: 8px 0 0 0; font-size: 12px; color: #94a3b8;">
                      © ${new Date().getFullYear()} TexLink. Todos os direitos reservados.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

export const generateInvitationEmailSubject = (brandName: string): string => {
    return `${brandName} convida você para ser um fornecedor credenciado`;
};
