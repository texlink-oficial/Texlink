/**
 * Example component showing how to use credential components together
 * This file is for documentation purposes only - remove in production
 */
import React from 'react';
import { Eye, Edit, Trash, Send } from 'lucide-react';
import {
  CredentialCard,
  TimelineStatus,
  ValidationResultCard,
  ComplianceScore,
  RiskLevelIndicator,
  RiskLevelCard,
} from './index';

export const CredentialExample: React.FC = () => {
  // Example data
  const credential = {
    id: '123',
    cnpj: '12345678000190',
    tradeName: 'Confecções Silva',
    legalName: 'CONFECÇÕES SILVA LTDA',
    status: 'COMPLIANCE_APPROVED' as const,
    createdAt: '2024-01-15',
    internalCode: 'SUP-001',
    category: 'Costura',
  };

  const validation = {
    id: '123',
    isValid: true,
    source: 'RECEITA_FEDERAL',
    validatedAt: '2024-01-15',
    parsedData: {
      razaoSocial: 'CONFECÇÕES SILVA LTDA',
      nomeFantasia: 'Silva Confecções',
      endereco: {
        logradouro: 'Rua das Flores',
        numero: '123',
        bairro: 'Centro',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '01234-567',
      },
      situacaoCadastral: 'ATIVA',
    },
    companyStatus: 'ATIVA',
    foundedAt: '2010-05-20',
    capitalStock: 100000,
    companyType: 'LTDA',
    mainActivity: 'Confecção de peças do vestuário',
  };

  const statusHistory = [
    { status: 'DRAFT', createdAt: '2024-01-01' },
    { status: 'VALIDATING', createdAt: '2024-01-02' },
    { status: 'COMPLIANCE_APPROVED', createdAt: '2024-01-05' },
  ];

  const handleView = () => { if (import.meta.env.DEV) console.log('View credential'); };
  const handleEdit = () => { if (import.meta.env.DEV) console.log('Edit credential'); };
  const handleDelete = () => { if (import.meta.env.DEV) console.log('Delete credential'); };
  const handleSendInvite = () => { if (import.meta.env.DEV) console.log('Send invitation'); };

  return (
    <div className="p-8 space-y-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Credential Components Demo
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Examples of all credential components in action
        </p>
      </div>

      {/* Credential Card */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          1. Credential Card
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <CredentialCard
            credential={credential}
            onClick={handleView}
            actions={[
              {
                label: 'Visualizar',
                icon: <Eye className="h-4 w-4" />,
                onClick: handleView,
              },
              {
                label: 'Editar',
                icon: <Edit className="h-4 w-4" />,
                onClick: handleEdit,
              },
              {
                label: 'Enviar Convite',
                icon: <Send className="h-4 w-4" />,
                onClick: handleSendInvite,
              },
              {
                label: 'Excluir',
                icon: <Trash className="h-4 w-4" />,
                onClick: handleDelete,
                variant: 'danger',
              },
            ]}
          />
          <CredentialCard
            credential={{
              ...credential,
              status: 'DRAFT',
              internalCode: undefined,
              category: undefined,
            }}
            onClick={handleView}
          />
        </div>
      </section>

      {/* Timeline Status */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          2. Timeline Status
        </h2>
        <TimelineStatus currentStatus="COMPLIANCE_APPROVED" history={statusHistory} />
      </section>

      {/* Validation Result */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          3. Validation Result Card
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <ValidationResultCard validation={validation} />
          <ValidationResultCard
            validation={{
              id: '456',
              isValid: false,
              source: 'RECEITA_FEDERAL',
              validatedAt: '2024-01-15',
              errorMessage: 'CNPJ inválido ou não encontrado na base da Receita Federal',
            }}
          />
        </div>
      </section>

      {/* Compliance Score */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          4. Compliance Score
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <ComplianceScore overallScore={85} creditScore={90} fiscalScore={80} />
          <ComplianceScore overallScore={45} creditScore={50} fiscalScore={40} />
        </div>
      </section>

      {/* Risk Level Indicators */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          5. Risk Level Indicators
        </h2>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Badges (diferentes tamanhos)
            </h3>
            <div className="flex items-center gap-3">
              <RiskLevelIndicator riskLevel="LOW" size="sm" />
              <RiskLevelIndicator riskLevel="MEDIUM" size="md" />
              <RiskLevelIndicator riskLevel="HIGH" size="lg" />
              <RiskLevelIndicator riskLevel="CRITICAL" size="lg" />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Cards (expandidos com descrição)
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <RiskLevelCard riskLevel="LOW" />
              <RiskLevelCard riskLevel="MEDIUM" />
              <RiskLevelCard riskLevel="HIGH" />
              <RiskLevelCard riskLevel="CRITICAL" />
            </div>
          </div>
        </div>
      </section>

      {/* Combined Example */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          6. Combined View (Detail Page Example)
        </h2>
        <div className="space-y-6">
          <TimelineStatus currentStatus="COMPLIANCE_APPROVED" history={statusHistory} />

          <div className="grid md:grid-cols-2 gap-6">
            <ValidationResultCard validation={validation} />
            <ComplianceScore overallScore={85} creditScore={90} fiscalScore={80} />
          </div>

          <RiskLevelCard riskLevel="LOW" />
        </div>
      </section>
    </div>
  );
};

export default CredentialExample;
