import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  FileSignature,
  Clock,
  FileCheck,
  FileEdit,
  FileX,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { ContractCard } from '../../../components/contracts';
import {
  contractsService,
  type SupplierContract,
  type ContractStatus,
  type ContractType,
} from '../../../services/contracts.service';

type TabStatus = ContractStatus | 'all';

const tabs: { id: TabStatus; label: string; icon: React.ElementType }[] = [
  { id: 'all', label: 'Todos', icon: FileSignature },
  { id: 'PENDING_SUPPLIER_SIGNATURE', label: 'Aguardando Assinatura', icon: Clock },
  { id: 'SIGNED', label: 'Assinados', icon: FileCheck },
  { id: 'DRAFT', label: 'Rascunhos', icon: FileEdit },
  { id: 'EXPIRED', label: 'Expirados', icon: AlertTriangle },
  { id: 'CANCELLED', label: 'Cancelados', icon: FileX },
];

const typeOptions: { value: ContractType | ''; label: string }[] = [
  { value: '', label: 'Todos os tipos' },
  { value: 'SERVICE_AGREEMENT', label: 'Prestação de Serviços' },
  { value: 'NDA', label: 'Confidencialidade' },
  { value: 'CODE_OF_CONDUCT', label: 'Código de Conduta' },
  { value: 'AMENDMENT', label: 'Aditivo' },
];

export const ContractsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabStatus>('all');
  const [contracts, setContracts] = useState<SupplierContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ContractType | ''>('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchContracts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await contractsService.getForSupplier({
        status: activeTab !== 'all' ? activeTab : undefined,
        type: typeFilter || undefined,
        search: search || undefined,
      });
      setContracts(response.data);
    } catch (err) {
      setError('Erro ao carregar contratos');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, typeFilter, search]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchContracts();
    }, 300);
    return () => clearTimeout(debounce);
  }, [fetchContracts]);

  const getTabCount = (status: TabStatus) => {
    if (status === 'all') return contracts.length;
    return contracts.filter((c) => c.status === status).length;
  };

  const filteredContracts = activeTab === 'all'
    ? contracts
    : contracts.filter((c) => c.status === activeTab);

  const pendingSignatureCount = contracts.filter(
    (c) => c.status === 'PENDING_SUPPLIER_SIGNATURE'
  ).length;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contratos</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Visualize e gerencie contratos com suas marcas parceiras
        </p>
      </div>

      {/* Alert for pending signatures */}
      {pendingSignatureCount > 0 && (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                Você tem {pendingSignatureCount} contrato{pendingSignatureCount > 1 ? 's' : ''} aguardando sua assinatura
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Revise e assine os contratos para formalizar as parcerias
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar por título, ID ou marca..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2 whitespace-nowrap"
          >
            <Filter className="w-4 h-4" />
            Filtros
          </Button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Tipo de Contrato
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as ContractType | '')}
                className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              >
                {typeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
        <nav className="flex gap-1 -mb-px min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count = tab.id === 'all' ? null : getTabCount(tab.id);

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                  ${
                    isActive
                      ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {count != null && count > 0 && (
                  <span
                    className={`ml-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                      isActive
                        ? 'bg-brand-100 dark:bg-brand-900 text-brand-600 dark:text-brand-400'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-500">{error}</p>
          <Button variant="outline" onClick={fetchContracts} className="mt-4">
            Tentar novamente
          </Button>
        </div>
      ) : filteredContracts.length === 0 ? (
        <div className="text-center py-12">
          <FileSignature className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Nenhum contrato encontrado
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {activeTab === 'all'
              ? 'Você ainda não possui contratos registrados'
              : 'Não há contratos nesta categoria'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredContracts.map((contract) => (
            <ContractCard key={contract.id} contract={contract} viewType="supplier" />
          ))}
        </div>
      )}
    </div>
  );
};

export default ContractsListPage;
