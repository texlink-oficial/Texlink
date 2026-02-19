/**
 * Password Reset Email Template
 *
 * Generates HTML email for password reset requests.
 */

export interface PasswordResetEmailData {
  userName: string;
  resetUrl: string;
  expiresInHours: number;
}

export const generatePasswordResetEmailHtml = (
  data: PasswordResetEmailData,
): string => {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redefinir sua senha - Texlink</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff;">
                Redefinir sua senha
              </h1>
              <p style="margin: 8px 0 0 0; font-size: 16px; color: rgba(255, 255, 255, 0.9);">
                Texlink
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; color: #334155; line-height: 1.6;">
                Olá <strong>${data.userName}</strong>,
              </p>

              <p style="margin: 0 0 24px 0; font-size: 16px; color: #334155; line-height: 1.6;">
                Recebemos uma solicitação para redefinir a senha da sua conta na plataforma Texlink.
                Clique no botão abaixo para criar uma nova senha:
              </p>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 16px 0;">
                    <a href="${data.resetUrl}"
                       style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px 0 rgba(99, 102, 241, 0.4);">
                      Redefinir Senha
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiry Notice -->
              <div style="background: #fef3c7; border-radius: 8px; padding: 12px 16px; margin: 24px 0; text-align: center;">
                <p style="margin: 0; font-size: 14px; color: #92400e;">
                  Este link expira em <strong>${data.expiresInHours} horas</strong>.
                </p>
              </div>

              <p style="margin: 24px 0 0 0; font-size: 14px; color: #64748b; line-height: 1.6;">
                Se você não solicitou a redefinição de senha, ignore este e-mail.
                Sua senha permanecerá inalterada.
              </p>

              <p style="margin: 16px 0 0 0; font-size: 14px; color: #64748b; line-height: 1.6;">
                Caso o botão acima não funcione, copie e cole o seguinte link no seu navegador:
              </p>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #94a3b8; word-break: break-all;">
                ${data.resetUrl}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; padding: 24px 32px; border-radius: 0 0 16px 16px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                Este e-mail foi enviado pela plataforma Texlink.
              </p>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #94a3b8;">
                &copy; ${new Date().getFullYear()} Texlink. Todos os direitos reservados.
              </p>
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
