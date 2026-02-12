import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Upload,
  Building2,
  Calendar,
  DollarSign,
  Info,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Card } from '../../../components/ui/Card';
import { ContractTypeBadge } from '../../../components/contracts';
import {
  contractsService,
  type ContractType,
  type CreateContractDto,
  type UploadContractDto,
} from '../../../services/contracts.service';
import { relationshipsService } from '../../../services';
import type { SupplierBrandRelationship } from '../../../types/relationships';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';

type CreateMode = 'template' | 'upload';

const contractTypes: { value: ContractType; label: string; description: string }[] = [
  {
    value: 'SERVICE_AGREEMENT',
    label: 'Prestação de Serviços',
    description: 'Contrato padrão para produção de peças',
  },
  {
    value: 'NDA',
    label: 'Confidencialidade (NDA)',
    description: 'Termo de sigilo e não divulgação',
  },
  {
    value: 'CODE_OF_CONDUCT',
    label: 'Código de Conduta',
    description: 'Normas éticas e de responsabilidade social',
  },
  {
    value: 'AMENDMENT',
    label: 'Aditivo Contratual',
    description: 'Alteração de contrato existente',
  },
];

export const CreateContractPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addToast } = useToast();
  const { user } = useAuth();

  const [mode, setMode] = useState<CreateMode>('template');
  const [isLoading, setIsLoading] = useState(false);
  const [relationships, setRelationships] = useState<SupplierBrandRelationship[]>([]);
  const [loadingRelationships, setLoadingRelationships] = useState(true);

  // Form state
  const [relationshipId, setRelationshipId] = useState(searchParams.get('relationshipId') || '');
  const [contractType, setContractType] = useState<ContractType>('SERVICE_AGREEMENT');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    loadRelationships();
  }, []);

  const loadRelationships = async () => {
    try {
      setLoadingRelationships(true);
      const brandId = user?.brandId || user?.companyId;
      if (brandId) {
        const data = await relationshipsService.getByBrand(brandId);
        // Filter to only ACTIVE relationships
        setRelationships(data.filter((r) => r.status === 'ACTIVE'));
      }
    } catch (err) {
      console.error('Error loading relationships:', err);
    } finally {
      setLoadingRelationships(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!relationshipId || !validFrom || !validUntil) {
      addToast({ type: 'error', message: 'Preencha todos os campos obrigatorios' });
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'template') {
        const dto: CreateContractDto = {
          relationshipId,
          type: contractType,
          title: title || undefined,
          description: description || undefined,
          value: value ? parseFloat(value) : undefined,
          validFrom,
          validUntil,
        };
        const contract = await contractsService.create(dto);
        addToast({ type: 'success', message: 'Contrato criado com sucesso' });
        navigate(`/brand/contratos/${contract.id}`);
      } else {
        if (!file) {
          addToast({ type: 'error', message: 'Selecione um arquivo PDF' });
          setIsLoading(false);
          return;
        }
        const dto: UploadContractDto = {
          relationshipId,
          type: contractType,
          title: title || undefined,
          validFrom,
          validUntil,
        };
        const contract = await contractsService.upload(dto, file);
        addToast({ type: 'success', message: 'Contrato enviado com sucesso' });
        navigate(`/brand/contratos/${contract.id}`);
      }
    } catch (err) {
      addToast({ type: 'error', message: 'Erro ao criar contrato' });
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        addToast({ type: 'error', message: 'Apenas arquivos PDF sao aceitos' });
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        addToast({ type: 'error', message: 'Arquivo deve ter no maximo 10MB' });
        return;
      }
      setFile(selectedFile);
    }
  };

  const selectedRelationship = relationships.find((r) => r.id === relationshipId);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/brand/contratos')}
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Contratos
        </button>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Novo Contrato</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Crie um novo contrato para uma facção parceira
        </p>
      </div>

      {/* Mode Selection */}
      <div className="flex gap-3 mb-6">
        <button
          type="button"
          onClick={() => setMode('template')}
          className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
            mode === 'template'
              ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400'
              : 'border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-700'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span className="font-medium">Usar Template</span>
        </button>
        <button
          type="button"
          onClick={() => setMode('upload')}
          className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
            mode === 'upload'
              ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400'
              : 'border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-700'
          }`}
        >
          <Upload className="w-5 h-5" />
          <span className="font-medium">Upload PDF</span>
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <Card variant="default" padding="lg" className="space-y-6">
          {/* Relationship Selection */}
          <div>
            <label
              htmlFor="relationship"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              Facção Parceira <span className="text-red-500">*</span>
            </label>
            {loadingRelationships ? (
              <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
            ) : relationships.length === 0 ? (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>
                    Você não possui facções ativas vinculadas. Vincule uma facção antes de criar um
                    contrato.
                  </span>
                </div>
              </div>
            ) : (
              <select
                id="relationship"
                value={relationshipId}
                onChange={(e) => setRelationshipId(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              >
                <option value="">Selecione uma facção</option>
                {relationships.map((rel) => (
                  <option key={rel.id} value={rel.id}>
                    {rel.supplier?.tradeName || rel.supplier?.legalName || `Facção ${rel.supplierId}`}
                  </option>
                ))}
              </select>
            )}
            {selectedRelationship?.supplier && (
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Building2 className="w-4 h-4" />
                <span>{selectedRelationship.supplier.city}, {selectedRelationship.supplier.state}</span>
              </div>
            )}
          </div>

          {/* Contract Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo de Contrato <span className="text-red-500">*</span>
            </label>
            <div className="grid gap-2">
              {contractTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setContractType(type.value)}
                  className={`flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                    contractType === type.value
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-700'
                  }`}
                >
                  <div className="mt-0.5">
                    <ContractTypeBadge type={type.value} size="sm" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{type.label}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{type.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              Titulo do Contrato
            </label>
            <Input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Contrato de Produção - Coleção Verão 2026"
            />
          </div>

          {/* Description (only for template mode) */}
          {mode === 'template' && (
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              >
                Descricao
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descricao detalhada do contrato..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors resize-none"
              />
            </div>
          )}

          {/* Value (only for template mode and SERVICE_AGREEMENT) */}
          {mode === 'template' && contractType === 'SERVICE_AGREEMENT' && (
            <div>
              <label
                htmlFor="value"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              >
                Valor do Contrato
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="value"
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="0,00"
                  min="0"
                  step="0.01"
                  className="pl-10"
                />
              </div>
            </div>
          )}

          {/* Validity Period */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="validFrom"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              >
                Inicio da Vigencia <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="validFrom"
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  required
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="validUntil"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              >
                Fim da Vigencia <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="validUntil"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  min={validFrom || undefined}
                  required
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* File Upload (only for upload mode) */}
          {mode === 'upload' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Arquivo PDF <span className="text-red-500">*</span>
              </label>
              <div
                className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                  file
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-brand-400 dark:hover:border-brand-500'
                }`}
              >
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="w-8 h-8 text-brand-500" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900 dark:text-white">{file.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Clique ou arraste um arquivo PDF aqui
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Maximo 10MB</p>
                  </>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/brand/contratos')}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isLoading}
            disabled={!relationshipId || !validFrom || !validUntil || (mode === 'upload' && !file)}
          >
            Criar Contrato
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateContractPage;
