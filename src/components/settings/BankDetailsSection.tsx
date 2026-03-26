import React, { useState, useEffect, useRef } from 'react';
import {
    CreditCard,
    Building,
    User,
    Wallet,
    Save,
    Loader2,
    X,
    Check,
    Search,
    ChevronDown,
} from 'lucide-react';
import { settingsService } from '../../services/settings.service';
import { BankAccount, AccountType, PixKeyType, ACCOUNT_TYPE_LABELS, PIX_KEY_TYPE_LABELS } from '../../types';

// Brazilian banks - full list ordered alphabetically by name
const BANKS = [
    { code: '654', name: 'Banco Digimais' },
    { code: '246', name: 'Banco ABC Brasil' },
    { code: '121', name: 'Banco Agibank' },
    { code: '025', name: 'Banco Alfa' },
    { code: '065', name: 'Banco Luso Brasileiro' },
    { code: '213', name: 'Banco Arbi' },
    { code: '330', name: 'Banco Bari' },
    { code: '107', name: 'Banco Bocom BBM' },
    { code: '036', name: 'Banco Bradesco BBI' },
    { code: '237', name: 'Banco Bradesco' },
    { code: '394', name: 'Banco Bradesco Financiamentos' },
    { code: '063', name: 'Banco Bradescard' },
    { code: '218', name: 'Banco BS2' },
    { code: '208', name: 'Banco BTG Pactual' },
    { code: '336', name: 'Banco C6' },
    { code: '626', name: 'Banco C6 Consignado' },
    { code: '473', name: 'Banco Caixa Geral - Brasil' },
    { code: '266', name: 'Banco Cédula' },
    { code: '739', name: 'Banco Cetelem' },
    { code: '233', name: 'Banco Cifra' },
    { code: '745', name: 'Banco Citibank' },
    { code: '241', name: 'Banco Clássico' },
    { code: '756', name: 'Banco Cooperativo do Brasil (Bancoob/Sicoob)' },
    { code: '748', name: 'Banco Cooperativo Sicredi' },
    { code: '505', name: 'Banco Credit Suisse' },
    { code: '222', name: 'Banco Credit Agricole Brasil' },
    { code: '003', name: 'Banco da Amazônia' },
    { code: '083', name: 'Banco da China Brasil' },
    { code: '707', name: 'Banco Daycoval' },
    { code: '335', name: 'Banco Digio' },
    { code: '001', name: 'Banco do Brasil' },
    { code: '037', name: 'Banco do Estado do Pará' },
    { code: '047', name: 'Banco do Estado de Sergipe' },
    { code: '004', name: 'Banco do Nordeste' },
    { code: '094', name: 'Banco Finaxis' },
    { code: '224', name: 'Banco Fibra' },
    { code: '125', name: 'Banco Genial' },
    { code: '612', name: 'Banco Guanabara' },
    { code: '012', name: 'Banco Inbursa' },
    { code: '653', name: 'Banco Indusval' },
    { code: '604', name: 'Banco Industrial do Brasil' },
    { code: '077', name: 'Banco Inter' },
    { code: '630', name: 'Banco Intercap' },
    { code: '249', name: 'Banco Investcred Unibanco' },
    { code: '341', name: 'Banco Itaú Unibanco' },
    { code: '652', name: 'Banco Itaú Unibanco Holding' },
    { code: '029', name: 'Banco Itaú Consignado' },
    { code: '217', name: 'Banco John Deere' },
    { code: '376', name: 'Banco JP Morgan' },
    { code: '757', name: 'Banco KEB Hana do Brasil' },
    { code: '600', name: 'Banco Luso Brasileiro' },
    { code: '243', name: 'Banco Máxima' },
    { code: '389', name: 'Banco Mercantil de Investimentos' },
    { code: '323', name: 'Banco Mercantil do Brasil' },
    { code: '370', name: 'Banco Mizuho do Brasil' },
    { code: '746', name: 'Banco Modal' },
    { code: '066', name: 'Banco Morgan Stanley' },
    { code: '456', name: 'Banco MUFG Brasil' },
    { code: '735', name: 'Banco Neon' },
    { code: '169', name: 'Banco Olé Bonsucesso Consignado' },
    { code: '212', name: 'Banco Original' },
    { code: '079', name: 'Banco Original do Agronegócio' },
    { code: '712', name: 'Banco Ourinvest' },
    { code: '623', name: 'Banco Pan' },
    { code: '611', name: 'Banco Paulista' },
    { code: '643', name: 'Banco Pine' },
    { code: '747', name: 'Banco Rabobank Internacional Brasil' },
    { code: '633', name: 'Banco Rendimento' },
    { code: '741', name: 'Banco Ribeirão Preto' },
    { code: '120', name: 'Banco Rodobens' },
    { code: '422', name: 'Banco Safra' },
    { code: '074', name: 'Banco Safra' },
    { code: '033', name: 'Banco Santander' },
    { code: '743', name: 'Banco Semear' },
    { code: '276', name: 'Banco Senff' },
    { code: '754', name: 'Banco Sistema' },
    { code: '366', name: 'Banco Société Générale Brasil' },
    { code: '637', name: 'Banco Sofisa' },
    { code: '299', name: 'Banco Sorocred' },
    { code: '082', name: 'Banco Topázio' },
    { code: '634', name: 'Banco Triângulo' },
    { code: '655', name: 'Banco Votorantim' },
    { code: '610', name: 'Banco VR' },
    { code: '119', name: 'Banco Western Union' },
    { code: '348', name: 'Banco XP' },
    { code: '318', name: 'Banco BMG' },
    { code: '752', name: 'Banco BNP Paribas Brasil' },
    { code: '320', name: 'Banco CCB Brasil' },
    { code: '753', name: 'Banco Comercial Uruguai' },
    { code: '021', name: 'Banestes' },
    { code: '041', name: 'Banrisul' },
    { code: '755', name: 'Bank of America Merrill Lynch' },
    { code: '081', name: 'BancoSeguro' },
    { code: '080', name: 'B&T CC' },
    { code: '144', name: 'Bexs Banco de Câmbio' },
    { code: '301', name: 'BPP Instituição de Pagamento' },
    { code: '070', name: 'BRB - Banco de Brasília' },
    { code: '173', name: 'BRL Trust DTVM' },
    { code: '092', name: 'BRK Financeira' },
    { code: '104', name: 'Caixa Econômica Federal' },
    { code: '477', name: 'Citibank' },
    { code: '136', name: 'Confederação Nacional das Cooperativas Centrais Unicred' },
    { code: '085', name: 'Cooperativa Central de Crédito - Ailos' },
    { code: '279', name: 'Cooperativa Central de Crédito - CCLA' },
    { code: '114', name: 'Central Cooperativa de Crédito no Estado do Espírito Santo' },
    { code: '091', name: 'Cooperativa Central Unicred' },
    { code: '097', name: 'Cooperativa Central de Crédito Noroeste Brasileiro' },
    { code: '089', name: 'Cooperativa de Crédito Rural da Região da Mogiana' },
    { code: '281', name: 'Cooperativa de Crédito Rural Coopavel' },
    { code: '403', name: 'Cora SCD' },
    { code: '010', name: 'Credicoamo' },
    { code: '098', name: 'Credialiança' },
    { code: '069', name: 'Crefisa' },
    { code: '133', name: 'Cresol Confederação' },
    { code: '487', name: 'Deutsche Bank' },
    { code: '364', name: 'EFÍ (Gerencianet)' },
    { code: '265', name: 'Banco Fator' },
    { code: '269', name: 'HSBC Brasil' },
    { code: '488', name: 'JPMorgan Chase Bank' },
    { code: '399', name: 'Kirton Bank' },
    { code: '128', name: 'MS Bank' },
    { code: '260', name: 'Nu Pagamentos (Nubank)' },
    { code: '613', name: 'Omni Banco' },
    { code: '290', name: 'PagSeguro Internet' },
    { code: '254', name: 'Paraná Banco' },
    { code: '174', name: 'Pefisa' },
    { code: '380', name: 'PicPay Serviços' },
    { code: '093', name: 'Pólocred' },
    { code: '329', name: 'QI Sociedade de Crédito Direto' },
    { code: '270', name: 'Sagitur CC' },
    { code: '751', name: 'Scotiabank Brasil' },
    { code: '183', name: 'Socred' },
    { code: '197', name: 'Stone Pagamentos' },
    { code: '084', name: 'Uniprime Norte do Paraná' },
    { code: '099', name: 'Uniprime Central' },
    { code: '310', name: 'Vortx DTVM' },
    { code: '359', name: 'Zema Crédito' },
    { code: '280', name: 'Avista' },
    { code: '188', name: 'Ativa Investimentos' },
    { code: '461', name: 'Asaas IP' },
];

const BANKS_SORTED = [...BANKS].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

const BankDetailsSection: React.FC = () => {
    const [data, setData] = useState<BankAccount | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [bankSearch, setBankSearch] = useState('');
    const [showBankDropdown, setShowBankDropdown] = useState(false);
    const bankDropdownRef = useRef<HTMLDivElement>(null);

    const [formData, setFormData] = useState({
        bankCode: '',
        bankName: '',
        agency: '',
        accountNumber: '',
        accountType: 'CORRENTE' as AccountType,
        accountHolder: '',
        holderDocument: '',
        pixKeyType: '' as PixKeyType | '',
        pixKey: '',
    });

    useEffect(() => {
        loadData();
    }, []);

    // Close bank dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (bankDropdownRef.current && !bankDropdownRef.current.contains(e.target as Node)) {
                setShowBankDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const bankAccount = await settingsService.getBankAccount();
            setData(bankAccount);
            if (bankAccount) {
                setFormData({
                    bankCode: bankAccount.bankCode,
                    bankName: bankAccount.bankName,
                    agency: bankAccount.agency,
                    accountNumber: bankAccount.accountNumber,
                    accountType: bankAccount.accountType,
                    accountHolder: bankAccount.accountHolder,
                    holderDocument: formatDocument(bankAccount.holderDocument),
                    pixKeyType: bankAccount.pixKeyType || '',
                    pixKey: bankAccount.pixKey || '',
                });
                if (bankAccount.bankCode) {
                    setBankSearch(`${bankAccount.bankCode} - ${bankAccount.bankName}`);
                }
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar dados bancários');
        } finally {
            setIsLoading(false);
        }
    };

    const formatDocument = (value: string) => {
        const digits = value.replace(/\D/g, '');
        if (digits.length <= 11) {
            // CPF: 000.000.000-00
            return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        }
        // CNPJ: 00.000.000/0000-00
        return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    };

    // When dropdown opens with a selected bank, show full list; otherwise filter by search text
    const selectedDisplay = formData.bankCode ? `${formData.bankCode} - ${formData.bankName}` : '';
    const isShowingSelected = bankSearch === selectedDisplay;
    const filteredBanks = isShowingSelected
        ? BANKS_SORTED
        : BANKS_SORTED.filter(b => {
            const q = bankSearch.toLowerCase();
            return b.code.includes(q) || b.name.toLowerCase().includes(q);
        });

    const selectBank = (bank: { code: string; name: string }) => {
        setFormData(prev => ({ ...prev, bankCode: bank.code, bankName: bank.name }));
        setBankSearch(`${bank.code} - ${bank.name}`);
        setShowBankDropdown(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        if (name === 'holderDocument') {
            setFormData(prev => ({ ...prev, [name]: formatDocument(value) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (!formData.bankCode) {
            setError('Selecione um banco da lista.');
            return;
        }

        try {
            setIsSaving(true);
            const updated = await settingsService.updateBankAccount({
                bankCode: formData.bankCode,
                bankName: formData.bankName,
                agency: formData.agency,
                accountNumber: formData.accountNumber,
                accountType: formData.accountType,
                accountHolder: formData.accountHolder,
                holderDocument: formData.holderDocument.replace(/\D/g, ''),
                pixKeyType: formData.pixKeyType || undefined,
                pixKey: formData.pixKey || undefined,
            });
            setData(updated);
            setSuccess('Dados bancários atualizados com sucesso!');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.message || 'Erro ao salvar dados bancários');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-lg">
                    <CreditCard className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Dados Bancários</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Informações para recebimento de pagamentos
                    </p>
                </div>
            </div>

            {/* Alerts */}
            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                    <X className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {success && (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
                    <Check className="w-4 h-4 flex-shrink-0" />
                    {success}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Bank Info */}
                <div>
                    <h3 className="flex items-center gap-2 text-md font-medium text-gray-900 dark:text-white mb-4">
                        <Building className="w-4 h-4" />
                        Conta Bancária
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div ref={bankDropdownRef} className="relative">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Banco
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                <input
                                    type="text"
                                    value={bankSearch}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setBankSearch(val);
                                        setShowBankDropdown(true);
                                        // Clear selected bank when user edits the search text
                                        if (val !== selectedDisplay) {
                                            setFormData(prev => ({ ...prev, bankCode: '', bankName: '' }));
                                        }
                                    }}
                                    onFocus={() => setShowBankDropdown(true)}
                                    placeholder="Buscar por nome ou código..."
                                    className="w-full pl-9 pr-8 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                />
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                            {showBankDropdown && (
                                <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
                                    {filteredBanks.length === 0 ? (
                                        <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                            Nenhum banco encontrado
                                        </div>
                                    ) : (
                                        filteredBanks.map((bank, idx) => (
                                            <button
                                                key={`${bank.code}-${idx}`}
                                                type="button"
                                                onClick={() => selectBank(bank)}
                                                className={`w-full text-left px-4 py-2 text-sm hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors ${
                                                    formData.bankCode === bank.code && formData.bankName === bank.name
                                                        ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 font-medium'
                                                        : 'text-gray-900 dark:text-white'
                                                }`}
                                            >
                                                {bank.code} - {bank.name}
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Agência
                            </label>
                            <input
                                type="text"
                                name="agency"
                                value={formData.agency}
                                onChange={handleChange}
                                required
                                placeholder="0000"
                                maxLength={10}
                                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Conta
                            </label>
                            <input
                                type="text"
                                name="accountNumber"
                                value={formData.accountNumber}
                                onChange={handleChange}
                                required
                                placeholder="00000-0"
                                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Tipo de Conta
                            </label>
                            <select
                                name="accountType"
                                value={formData.accountType}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            >
                                {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map(type => (
                                    <option key={type} value={type}>
                                        {ACCOUNT_TYPE_LABELS[type]}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Account Holder */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="flex items-center gap-2 text-md font-medium text-gray-900 dark:text-white mb-4">
                        <User className="w-4 h-4" />
                        Titular da Conta
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Nome do Titular
                            </label>
                            <input
                                type="text"
                                name="accountHolder"
                                value={formData.accountHolder}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                CPF/CNPJ do Titular
                            </label>
                            <input
                                type="text"
                                name="holderDocument"
                                value={formData.holderDocument}
                                onChange={handleChange}
                                required
                                placeholder="000.000.000-00"
                                maxLength={18}
                                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* PIX */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="flex items-center gap-2 text-md font-medium text-gray-900 dark:text-white mb-4">
                        <Wallet className="w-4 h-4" />
                        Chave PIX (opcional)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Tipo de Chave
                            </label>
                            <select
                                name="pixKeyType"
                                value={formData.pixKeyType}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            >
                                <option value="">Selecione (opcional)</option>
                                {(Object.keys(PIX_KEY_TYPE_LABELS) as PixKeyType[]).map(type => (
                                    <option key={type} value={type}>
                                        {PIX_KEY_TYPE_LABELS[type]}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Chave PIX
                            </label>
                            <input
                                type="text"
                                name="pixKey"
                                value={formData.pixKey}
                                onChange={handleChange}
                                disabled={!formData.pixKeyType}
                                placeholder={formData.pixKeyType ? 'Digite sua chave PIX' : 'Selecione o tipo primeiro'}
                                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:bg-gray-100 disabled:dark:bg-gray-600 disabled:cursor-not-allowed"
                            />
                        </div>
                    </div>
                </div>

                {/* Submit */}
                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        Salvar Dados Bancários
                    </button>
                </div>
            </form>
        </div>
    );
};

export default BankDetailsSection;
