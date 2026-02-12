import React, { useState } from 'react';
import { X, Edit3 } from 'lucide-react';
import { adminService } from '../../services/admin.service';
import { useToast } from '../../contexts/ToastContext';

interface Company {
    id: string;
    legalName: string;
    tradeName: string | null;
    document: string;
    email?: string | null;
    phone?: string | null;
    city: string;
    state: string;
    status: string;
}

interface Props {
    company: Company;
    onClose: () => void;
    onSuccess: () => void;
}

const BRAZILIAN_STATES = [
    'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
];

export default function EditCompanyModal({ company, onClose, onSuccess }: Props) {
    const toast = useToast();

    const [legalName, setLegalName] = useState(company.legalName);
    const [tradeName, setTradeName] = useState(company.tradeName || '');
    const [city, setCity] = useState(company.city);
    const [state, setState] = useState(company.state);
    const [phone, setPhone] = useState(company.phone || '');
    const [email, setEmail] = useState(company.email || '');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!legalName.trim()) {
            setError('Razão Social é obrigatória.');
            return;
        }
        if (!city.trim()) {
            setError('Cidade é obrigatória.');
            return;
        }
        if (!state) {
            setError('Estado é obrigatório.');
            return;
        }

        setIsLoading(true);
        try {
            await adminService.updateCompany(company.id, {
                legalName: legalName.trim(),
                tradeName: tradeName.trim() || undefined,
                city: city.trim(),
                state,
                phone: phone.trim() || undefined,
                email: email.trim() || undefined,
            });
            toast.success('Empresa atualizada', 'Dados da empresa atualizados com sucesso');
            onSuccess();
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || 'Erro ao atualizar empresa.';
            setError(typeof msg === 'string' ? msg : 'Erro ao atualizar empresa.');
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
                        <Edit3 className="w-5 h-5 text-sky-500" />
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Editar Empresa</h2>
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-700 dark:text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        {/* CNPJ (read-only) */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">CNPJ</label>
                            <input
                                type="text"
                                value={company.document.length === 14
                                    ? company.document.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
                                    : company.document}
                                disabled
                                className="w-full h-10 px-4 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400 font-mono cursor-not-allowed"
                            />
                        </div>

                        {/* Razão Social */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Razão Social *</label>
                            <input
                                type="text"
                                value={legalName}
                                onChange={(e) => setLegalName(e.target.value)}
                                className="w-full h-10 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                            />
                        </div>

                        {/* Nome Fantasia */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Nome Fantasia</label>
                            <input
                                type="text"
                                value={tradeName}
                                onChange={(e) => setTradeName(e.target.value)}
                                className="w-full h-10 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                            />
                        </div>

                        {/* Cidade + Estado */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Cidade *</label>
                                <input
                                    type="text"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    className="w-full h-10 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Estado *</label>
                                <select
                                    value={state}
                                    onChange={(e) => setState(e.target.value)}
                                    className="w-full h-10 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all appearance-none cursor-pointer"
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
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Telefone</label>
                                <input
                                    type="text"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="(00) 00000-0000"
                                    className="w-full h-10 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="empresa@email.com"
                                    className="w-full h-10 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                                />
                            </div>
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
                            {isLoading ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
