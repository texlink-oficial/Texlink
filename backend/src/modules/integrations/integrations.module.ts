import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

// CNPJ Providers
import { BrasilApiProvider } from './providers/cnpj/brasil-api.provider';
import { ReceitaWsProvider } from './providers/cnpj/receitaws.provider';

// Credit Providers
import { MockCreditProvider } from './providers/credit/mock-credit.provider';
import { SerasaCreditProvider } from './providers/credit/serasa.provider';
import { SPCCreditProvider } from './providers/credit/spc.provider';

// Notification Providers
import { SendGridProvider } from './providers/notification/sendgrid.provider';
import { TwilioWhatsappProvider } from './providers/notification/twilio-whatsapp.provider';

// Services
import { IntegrationService } from './services/integration.service';

/**
 * Módulo global de integrações externas
 *
 * Gerencia todos os providers de:
 * - Validação de CNPJ (Brasil API, ReceitaWS)
 * - Análise de Crédito (Serasa, SPC, Mock)
 * - Notificações (SendGrid para email, Twilio para WhatsApp)
 *
 * Configurações via variáveis de ambiente:
 * - CNPJ: RECEITAWS_URL, RECEITAWS_API_KEY
 * - Email: SENDGRID_API_KEY, SENDGRID_FROM_EMAIL, SENDGRID_FROM_NAME
 * - WhatsApp: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
 * - Crédito: CREDIT_PROVIDER (mock|serasa|spc)
 *   - Serasa: SERASA_API_URL, SERASA_CLIENT_ID, SERASA_CLIENT_SECRET
 *   - SPC: SPC_API_URL, SPC_USERNAME, SPC_PASSWORD
 */
@Global()
@Module({
  imports: [
    ConfigModule,
    HttpModule.register({
      timeout: 30000, // 30 segundos timeout padrão
      maxRedirects: 3,
    }),
  ],
  providers: [
    // CNPJ Providers
    BrasilApiProvider,
    ReceitaWsProvider,

    // Credit Providers
    MockCreditProvider,
    SerasaCreditProvider,
    SPCCreditProvider,

    // Notification Providers
    SendGridProvider,
    TwilioWhatsappProvider,

    // Main Service
    IntegrationService,
  ],
  exports: [
    // Export principal service
    IntegrationService,

    // Export providers individuais para casos especiais
    BrasilApiProvider,
    ReceitaWsProvider,
    MockCreditProvider,
    SerasaCreditProvider,
    SPCCreditProvider,
    SendGridProvider,
    TwilioWhatsappProvider,
  ],
})
export class IntegrationsModule {}
