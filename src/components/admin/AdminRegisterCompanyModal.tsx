import React, { useState } from 'react';
import { X, Building2, ChevronRight, Loader2 } from 'lucide-react';
import { adminService } from '../../services/admin.service';
import { useToast } from '../../contexts/ToastContext';
import { PRODUCT_TYPE_OPTIONS, MACHINE_OPTIONS } from '../../constants/supplierOptions';

interface Props {
    type: 'BRAND' | 'SUPPLIER';
    onClose: () => void;
    onSuccess: () => void;
}

const BRAZILIAN_STATES = [
    'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
];

const TIME_IN_MARKET_OPTIONS = [
    'Menos de 1 ano',
    '1 a 3 anos',
    '3 a 5 anos',
    '5 a 10 anos',
    'Mais de 10 anos',
];

const VOLUME_OPTIONS = [
    { label: 'Até 500 peças', value: 500 },
    { label: '500 a 2.000 peças', value: 2000 },
    { label: '2.000 a 5.000 peças', value: 5000 },
    { label: '5.000 a 10.000 peças', value: 10000 },
    { label: 'Mais de 10.000 peças', value: 15000 },
];

function formatCNPJ(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 14);
    return digits
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
}

function formatPhone(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 10) {
        return digits.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim();
    }
    return digits.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim();
}

export default function AdminRegisterCompanyModal({ type, onClose, onSuccess }: Props) {
    const toast = useToast();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Step 1 - Owner + Company
    const [userName, setUserName] = useState('');
    const [email, setEmail] = useState('');
    const [userPhone, setUserPhone] = useState('');
    const [password, setPassword] = useState('');
    const [legalName, setLegalName] = useState('');
    const [tradeName, setTradeName] = useState('');
    const [document, setDocument] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [companyPhone, setCompanyPhone] = useState('');
    const [companyEmail, setCompanyEmail] = useState('');

    // Step 2 - Qualification
    const [productTypes, setProductTypes] = useState<string[]>([]);
    const [machines, setMachines] = useState<string[]>([]);
    const [specialties, setSpecialties] = useState<string[]>([]);
    const [qtdCostureiras, setQtdCostureiras] = useState('');
    const [tempoMercado, setTempoMercado] = useState('');
    const [monthlyVolume, setMonthlyVolume] = useState<number | undefined>();

    const isSupplier = type === 'SUPPLIER';
    const typeLabel = isSupplier ? 'Facção' : 'Marca';

    const validateStep1 = () => {
        if (!userName.trim() || userName.trim().length < 3) return 'Nome do proprietário deve ter pelo menos 3 caracteres.';
        if (!email.trim() || !email.includes('@')) return 'E-mail inválido.';
        if (!password || password.length < 6) return 'Senha deve ter pelo menos 6 caracteres.';
        if (!legalName.trim() || legalName.trim().length < 3) return 'Razão Social deve ter pelo menos 3 caracteres.';
        const cnpjDigits = document.replace(/\D/g, '');
        if (cnpjDigits.length !== 14) return 'CNPJ deve ter 14 dígitos.';
        if (!city.trim()) return 'Cidade é obrigatória.';
        if (!state) return 'Estado é obrigatório.';
        return null;
    };

    const handleNext = () => {
        const err = validateStep1();
        if (err) {
            setError(err);
            return;
        }
        setError('');
        setStep(2);
    };

    const handleSubmit = async () => {
        if (productTypes.length === 0) {
            setError('Selecione pelo menos um tipo de produto.');
            return;
        }
        setError('');
        setIsLoading(true);

        try {
            await adminService.registerCompany({
                email: email.trim(),
                password,
                userName: userName.trim(),
                userPhone: userPhone.replace(/\D/g, '') || undefined,
                legalName: legalName.trim(),
                tradeName: tradeName.trim() || undefined,
                document: document.replace(/\D/g, ''),
                type,
                city: city.trim(),
                state,
                companyPhone: companyPhone.replace(/\D/g, '') || undefined,
                companyEmail: companyEmail.trim() || undefined,
                productTypes,
                specialties: isSupplier ? undefined : (specialties.length > 0 ? specialties : undefined),
                tempoMercado: tempoMercado || undefined,
                machines: isSupplier ? (machines.length > 0 ? machines : undefined) : undefined,
                qtdCostureiras: isSupplier && qtdCostureiras ? parseInt(qtdCostureiras, 10) : undefined,
                monthlyVolume: !isSupplier ? monthlyVolume : undefined,
            });

            toast.success(`${typeLabel} registrada`, `${typeLabel} criada com sucesso e já está ativa.`);
            onSuccess();
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || `Erro ao registrar ${typeLabel.toLowerCase()}.`;
            setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        } finally {
            setIsLoading(false);
        }
    };

    const toggleChip = (value: string, list: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
        setter(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
    };

    const inputClass = "w-full h-10 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-sm";
    const labelClass = "block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5";

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-sky-500/10 rounded-lg flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-sky-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Registrar {typeLabel}</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Etapa {step} de 2</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Step indicator */}
                <div className="flex gap-2 px-6 pt-4">
                    <div className={`h-1 flex-1 rounded-full transition-colors ${step >= 1 ? 'bg-sky-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
                    <div className={`h-1 flex-1 rounded-full transition-colors ${step >= 2 ? 'bg-sky-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
                </div>

                {/* Body */}
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-700 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {step === 1 && (
                        <>
                            {/* Owner section */}
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Dados do Proprietário</p>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Nome Completo *</label>
                                    <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Nome do proprietário" className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>E-mail *</label>
                                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" className={inputClass} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Celular</label>
                                    <input type="text" value={userPhone} onChange={(e) => setUserPhone(formatPhone(e.target.value))} placeholder="(00) 00000-0000" className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Senha Inicial *</label>
                                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className={inputClass} />
                                </div>
                            </div>

                            <div className="border-t border-gray-100 dark:border-gray-700 my-2" />
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Dados da Empresa</p>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Razão Social *</label>
                                    <input type="text" value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="Razão Social Ltda" className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Nome Fantasia</label>
                                    <input type="text" value={tradeName} onChange={(e) => setTradeName(e.target.value)} placeholder="Nome Fantasia" className={inputClass} />
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>CNPJ *</label>
                                <input type="text" value={document} onChange={(e) => setDocument(formatCNPJ(e.target.value))} placeholder="00.000.000/0000-00" className={inputClass} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Cidade *</label>
                                    <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Cidade" className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Estado *</label>
                                    <select value={state} onChange={(e) => setState(e.target.value)} className={`${inputClass} appearance-none cursor-pointer`}>
                                        <option value="">Selecione</option>
                                        {BRAZILIAN_STATES.map((uf) => (
                                            <option key={uf} value={uf}>{uf}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Telefone Empresa</label>
                                    <input type="text" value={companyPhone} onChange={(e) => setCompanyPhone(formatPhone(e.target.value))} placeholder="(00) 00000-0000" className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>E-mail Empresa</label>
                                    <input type="email" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} placeholder="empresa@email.com" className={inputClass} />
                                </div>
                            </div>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tipos de Produto *</p>
                            <div className="flex flex-wrap gap-2">
                                {PRODUCT_TYPE_OPTIONS.map((opt) => (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={() => toggleChip(opt, productTypes, setProductTypes)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                            productTypes.includes(opt)
                                                ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
                                                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-sky-300 dark:hover:border-sky-600'
                                        }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>

                            {isSupplier ? (
                                <>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-4">Máquinas</p>
                                    <div className="flex flex-wrap gap-2">
                                        {MACHINE_OPTIONS.map((opt) => (
                                            <button
                                                key={opt}
                                                type="button"
                                                onClick={() => toggleChip(opt, machines, setMachines)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                                    machines.includes(opt)
                                                        ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
                                                        : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-sky-300 dark:hover:border-sky-600'
                                                }`}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>

                                    <div>
                                        <label className={labelClass}>Número de Costureiras</label>
                                        <input
                                            type="number"
                                            value={qtdCostureiras}
                                            onChange={(e) => setQtdCostureiras(e.target.value)}
                                            placeholder="Ex: 15"
                                            min={0}
                                            className={inputClass}
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-4">Especialidades</p>
                                    <div className="flex flex-wrap gap-2">
                                        {MACHINE_OPTIONS.map((opt) => (
                                            <button
                                                key={opt}
                                                type="button"
                                                onClick={() => toggleChip(opt, specialties, setSpecialties)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                                    specialties.includes(opt)
                                                        ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
                                                        : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-sky-300 dark:hover:border-sky-600'
                                                }`}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>

                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-4">Volume Mensal Desejado</p>
                                    <div className="flex flex-wrap gap-2">
                                        {VOLUME_OPTIONS.map((opt) => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => setMonthlyVolume(opt.value)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                                    monthlyVolume === opt.value
                                                        ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
                                                        : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-sky-300 dark:hover:border-sky-600'
                                                }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}

                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-4">Tempo de Mercado</p>
                            <div className="flex flex-wrap gap-2">
                                {TIME_IN_MARKET_OPTIONS.map((opt) => (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={() => setTempoMercado(opt)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                            tempoMercado === opt
                                                ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
                                                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-sky-300 dark:hover:border-sky-600'
                                        }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100 dark:border-gray-700">
                    <button
                        type="button"
                        onClick={step === 1 ? onClose : () => { setStep(1); setError(''); }}
                        disabled={isLoading}
                        className="px-6 py-2.5 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"
                    >
                        {step === 1 ? 'Cancelar' : 'Voltar'}
                    </button>

                    {step === 1 ? (
                        <button
                            type="button"
                            onClick={handleNext}
                            className="flex items-center gap-2 px-8 py-2.5 bg-sky-500 text-white text-sm font-bold rounded-xl hover:bg-sky-600 shadow-lg shadow-sky-500/20 active:scale-[0.98] transition-all"
                        >
                            Próximo
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-8 py-2.5 bg-sky-500 text-white text-sm font-bold rounded-xl hover:bg-sky-600 shadow-lg shadow-sky-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Registrando...
                                </>
                            ) : (
                                'Registrar'
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
