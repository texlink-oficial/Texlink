import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, AlertCircle, Upload, Loader2, Trash2 } from 'lucide-react';
import { onboardingService, type OnboardingDocument } from '../../../services/onboarding.service';
import { useToast } from '../../../contexts/ToastContext';

interface Step4DocumentsUploadProps {
  token: string;
  onComplete: () => void;
}

// Tipos de documentos requeridos
const REQUIRED_DOCUMENTS = [
  {
    type: 'alvara_funcionamento',
    name: 'Alvará de Funcionamento',
    description: 'Documento que comprova o funcionamento legal da empresa',
  },
  {
    type: 'certificado_bombeiros',
    name: 'Certificado do Corpo de Bombeiros',
    description: 'AVCB ou documento equivalente',
  },
  {
    type: 'certidao_fiscal',
    name: 'Certidão Negativa de Débitos Fiscais',
    description: 'Federal, estadual e municipal',
  },
  {
    type: 'certidao_trabalhista',
    name: 'Certidão Negativa de Débitos Trabalhistas',
    description: 'CNDT - Certidão Negativa de Débitos Trabalhistas',
  },
];

/**
 * Step 4: Upload de Documentos
 *
 * Permite que o fornecedor envie os documentos necessários
 * para validação pela marca.
 */
export function Step4DocumentsUpload({ token, onComplete }: Step4DocumentsUploadProps) {
  const toast = useToast();
  const [documents, setDocuments] = useState<OnboardingDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Carregar documentos existentes
  useEffect(() => {
    loadDocuments();
  }, [token]);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      const docs = await onboardingService.getDocuments(token);
      setDocuments(docs);
    } catch (err: any) {
      console.error('Erro ao carregar documentos:', err);
      setError('Erro ao carregar documentos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (type: string, name: string, file: File) => {
    setError('');
    setUploadingType(type);

    try {
      const newDoc = await onboardingService.uploadDocument(token, file, type, name);
      setDocuments((prev) => {
        // Remover doc anterior do mesmo tipo se existir
        const filtered = prev.filter((d) => d.type !== type);
        return [...filtered, newDoc];
      });

      toast.success(
        'Documento enviado!',
        `${name} foi enviado com sucesso e está aguardando validação.`
      );
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao fazer upload do documento';
      setError(errorMsg);
      toast.error('Erro no upload', errorMsg);
    } finally {
      setUploadingType(null);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Tem certeza que deseja remover este documento?')) return;

    try {
      await onboardingService.deleteDocument(token, docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      toast.success('Documento removido', 'O documento foi removido com sucesso.');
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao remover documento';
      setError(errorMsg);
      toast.error('Erro ao remover', errorMsg);
    }
  };

  // Calcular progresso
  const uploadedCount = REQUIRED_DOCUMENTS.filter((req) =>
    documents.some((doc) => doc.type === req.type)
  ).length;
  const totalCount = REQUIRED_DOCUMENTS.length;
  const progressPercent = Math.round((uploadedCount / totalCount) * 100);
  const allDocsUploaded = uploadedCount === totalCount;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <FileText className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Upload de Documentos
        </h2>
        <p className="text-gray-600">
          Envie os documentos necessários para validação
        </p>
      </div>

      {/* Barra de Progresso */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Progresso: {uploadedCount} de {totalCount} documentos
          </span>
          <span className="text-sm font-medium text-blue-600">
            {progressPercent}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Lista de Documentos */}
      <div className="space-y-4">
        {REQUIRED_DOCUMENTS.map((docType) => {
          const uploaded = documents.find((d) => d.type === docType.type);
          const isUploading = uploadingType === docType.type;

          return (
            <DocumentCard
              key={docType.type}
              type={docType.type}
              name={docType.name}
              description={docType.description}
              uploaded={uploaded}
              isUploading={isUploading}
              onUpload={(file) => handleUpload(docType.type, docType.name, file)}
              onDelete={() => uploaded && handleDelete(uploaded.id)}
            />
          );
        })}
      </div>

      {/* Info */}
      {allDocsUploaded ? (
        <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-green-900 mb-1">
                Todos os documentos enviados!
              </h4>
              <p className="text-sm text-green-700">
                Seus documentos serão analisados pela marca. Você receberá uma
                notificação quando a validação for concluída.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2 text-sm">
            📋 Formatos aceitos
          </h4>
          <p className="text-sm text-blue-700">
            PDF, JPEG, PNG, WEBP • Tamanho máximo: 10MB por arquivo
          </p>
        </div>
      )}
    </div>
  );
}

// ==================== COMPONENTE AUXILIAR ====================

interface DocumentCardProps {
  type: string;
  name: string;
  description: string;
  uploaded?: OnboardingDocument;
  isUploading: boolean;
  onUpload: (file: File) => void;
  onDelete: () => void;
}

function DocumentCard({
  name,
  description,
  uploaded,
  isUploading,
  onUpload,
  onDelete,
}: DocumentCardProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
    e.target.value = ''; // Reset input
  };

  const getValidationStatus = () => {
    if (!uploaded) return null;
    if (uploaded.isValid === true)
      return { color: 'green', icon: CheckCircle, text: 'Aprovado' };
    if (uploaded.isValid === false)
      return { color: 'red', icon: AlertCircle, text: 'Rejeitado' };
    return { color: 'yellow', icon: AlertCircle, text: 'Aguardando validação' };
  };

  const status = getValidationStatus();

  return (
    <div
      className={`border rounded-lg p-4 transition-all ${
        uploaded
          ? 'border-green-200 bg-green-50'
          : 'border-gray-200 bg-white hover:border-blue-300'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">{name}</h3>
          <p className="text-sm text-gray-600 mb-3">{description}</p>

          {uploaded ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <FileText className="w-4 h-4" />
                <span className="font-medium truncate">{uploaded.fileName}</span>
                <span className="text-gray-500">
                  ({(uploaded.fileSize / 1024).toFixed(1)} KB)
                </span>
              </div>

              {status && (
                <div
                  className={`flex items-center gap-2 text-sm text-${status.color}-700`}
                >
                  <status.icon className={`w-4 h-4 text-${status.color}-600`} />
                  {status.text}
                </div>
              )}

              {uploaded.isValid === false && uploaded.validationNotes && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2 mt-2">
                  <strong>Motivo:</strong> {uploaded.validationNotes}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Nenhum documento enviado</p>
          )}
        </div>

        <div className="flex-shrink-0">
          {isUploading ? (
            <div className="px-4 py-2 text-sm text-blue-600">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : uploaded ? (
            <div className="flex gap-2">
              <label className="px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 cursor-pointer transition-colors">
                <Upload className="w-4 h-4 inline mr-1" />
                Substituir
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <button
                onClick={onDelete}
                className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 cursor-pointer transition-colors inline-flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Enviar
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
