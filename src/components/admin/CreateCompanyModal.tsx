import React, { useState, useEffect } from 'react';
import { X, Building2, Factory, ShieldAlert } from 'lucide-react';
import { adminService, AdminUser } from '../../services/admin.service';
import { useToast } from '../../contexts/ToastContext';

interface CreateCompanyModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

const BRAZILIAN_STATES = [
    'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
];

const formatCNPJ = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 14);
    return digits
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
};

export default function CreateCompanyModal({ onClose, onSuccess }: CreateCompanyModalProps) {
    const toast = useToast();

    const [type, setType] = useState<'BRAND' | 'SUPPLIER'>('BRAND');
    const [legalName, setLegalName] = useState('');
    const [tradeName, setTradeName] = useState('');
    const [document, setDocument] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [ownerUserId, setOwnerUserId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [availableUsers, setAvailableUsers] = useState<AdminUser[]>([]);

    useEffect(() => {
        adminService.getAllUsers().then(setAvailableUsers).catch(() => {
            // Silently fail - owner selection is optional
        });
    }, []);

    const filteredUsers = availableUsers.filter((user) => {
        if (user.role === 'ADMIN') return true;
        if (type === 'BRAND' && user.role === 'BRAND') return true;
        if (type === 'SUPPLIER' && user.role === 'SUPPLIER') return true;
        return false;
    });

    const validate = (): boolean => {
        if (!legalName.trim()) {
            setError('Razão Social é obrigatória.');
            return false;
        }
        const digits = document.replace(/\D/g, '');
        if (digits.length < 14) {
            setError('CNPJ deve ter 14 dígitos.');
            return false;
        }
        if (!city.trim()) {
            setError('Cidade é obrigatória.');
            return false;
        }
        if (!state) {
            setError('Estado é obrigatório.');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!validate()) return;

        setIsLoading(true);
        try {
            await adminService.createCompany({
                legalName,
                tradeName: tradeName || undefined,
                document: document.replace(/\D/g, ''),
                type,
                city,
                state,
                phone: phone || undefined,
                email: email || undefined,
                ownerUserId: ownerUserId || undefined,
            });
            toast.success('Empresa criada', 'Empresa criada com sucesso');
            onSuccess();
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'Erro ao criar empresa.';
            setError(typeof message === 'string' ? message : 'Erro ao criar empresa.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-sky-500" />
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Nova Empresa</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        {/* Error */}
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-700 dark:text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Type Toggle */}
                        <div className="flex rounded-lg bg-gray-100 dark:bg-gray-900 p-1 border border-gray-200 dark:border-gray-700">
                            <button
                                type="button"
                                onClick={() => setType('BRAND')}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold rounded-md transition-all ${
                                    type === 'BRAND'
                                        ? 'bg-white dark:bg-gray-800 text-sky-600 dark:text-sky-400 shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                                }`}
                            >
                                <Building2 className="w-4 h-4" />
                                Marca
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('SUPPLIER')}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold rounded-md transition-all ${
                                    type === 'SUPPLIER'
                                        ? 'bg-white dark:bg-gray-800 text-sky-600 dark:text-sky-400 shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                                }`}
                            >
                                <Factory className="w-4 h-4" />
                                Facção
                            </button>
                        </div>

                        {/* Razão Social */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                Razão Social *
                            </label>
                            <input
                                type="text"
                                value={legalName}
                                onChange={(e) => setLegalName(e.target.value)}
                                placeholder="Ex: Empresa Ltda"
                                className="w-full h-10 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                            />
                        </div>

                        {/* Nome Fantasia */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                Nome Fantasia
                            </label>
                            <input
                                type="text"
                                value={tradeName}
                                onChange={(e) => setTradeName(e.target.value)}
                                placeholder="Ex: Minha Marca"
                                className="w-full h-10 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                            />
                        </div>

                        {/* CNPJ */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                CNPJ *
                            </label>
                            <input
                                type="text"
                                value={document}
                                onChange={(e) => setDocument(formatCNPJ(e.target.value))}
                                placeholder="00.000.000/0000-00"
                                className="w-full h-10 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                            />
                        </div>

                        {/* Cidade + Estado */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                    Cidade *
                                </label>
                                <input
                                    type="text"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    placeholder="Ex: Sao Paulo"
                                    className="w-full h-10 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                    Estado *
                                </label>
                                <select
                                    value={state}
                                    onChange={(e) => setState(e.target.value)}
                                    className="w-full h-10 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all appearance-none cursor-pointer"
                                >
                                    <option value="">Selecione</option>
                                    {BRAZILIAN_STATES.map((uf) => (
                                        <option key={uf} value={uf}>{uf}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Telefone + Email */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                    Telefone
                                </label>
                                <input
                                    type="text"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="(00) 00000-0000"
                                    className="w-full h-10 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="empresa@email.com"
                                    className="w-full h-10 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                                />
                            </div>
                        </div>

                        {/* Proprietario */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                Proprietario
                            </label>
                            <select
                                value={ownerUserId}
                                onChange={(e) => setOwnerUserId(e.target.value)}
                                className="w-full h-10 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all appearance-none cursor-pointer"
                            >
                                <option value="">Nenhum (criar sem proprietario)</option>
                                {filteredUsers.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.name} ({user.email}) - {user.role}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-6 py-2.5 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-8 py-2.5 bg-sky-500 text-white text-sm font-bold rounded-xl hover:bg-sky-600 shadow-lg shadow-sky-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Criando...' : 'Criar Empresa'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
