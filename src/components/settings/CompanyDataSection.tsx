import React, { useState, useEffect, useRef } from 'react';
import {
    Building2,
    MapPin,
    Phone,
    Mail,
    Upload,
    Save,
    Loader2,
    Camera,
    X,
    Lock,
} from 'lucide-react';
import { settingsService } from '../../services/settings.service';
import { CompanyData } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

const CompanyDataSection: React.FC = () => {
    const { user } = useAuth();
    const isSupplier = user?.role === 'SUPPLIER';
    const [data, setData] = useState<CompanyData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        legalName: '',
        tradeName: '',
        phone: '',
        email: '',
        city: '',
        state: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        zipCode: '',
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const company = await settingsService.getCompanyData();
            setData(company);
            setFormData({
                legalName: company.legalName || '',
                tradeName: company.tradeName || '',
                phone: company.phone || '',
                email: company.email || '',
                city: company.city || '',
                state: company.state || '',
                street: company.street || '',
                number: company.number || '',
                complement: company.complement || '',
                neighborhood: company.neighborhood || '',
                zipCode: formatCep(company.zipCode || ''),
            });
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar dados');
        } finally {
            setIsLoading(false);
        }
    };

    const formatCep = (value: string) => {
        const digits = value.replace(/\D/g, '');
        if (digits.length <= 5) return digits;
        return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'zipCode') {
            setFormData(prev => ({ ...prev, [name]: formatCep(value) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        try {
            setIsSaving(true);
            const updated = await settingsService.updateCompanyData({
                ...formData,
                zipCode: formData.zipCode.replace(/\D/g, ''),
            });
            setData(updated);
            setSuccess('Dados atualizados com sucesso!');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.message || 'Erro ao salvar dados');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogoClick = () => {
        fileInputRef.current?.click();
    };

    const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('Por favor, selecione uma imagem válida');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            setError('A imagem deve ter no máximo 2MB');
            return;
        }

        try {
            setIsUploadingLogo(true);
            setError(null);
            const result = await settingsService.uploadLogo(file);
            setData(prev => prev ? { ...prev, logoUrl: result.logoUrl } : null);
            setSuccess('Logo atualizada com sucesso!');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.message || 'Erro ao fazer upload da logo');
        } finally {
            setIsUploadingLogo(false);
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
                    <Building2 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Dados da Empresa</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Informações cadastrais e endereço da sua empresa
                    </p>
                </div>
            </div>

            {/* Logo Upload */}
            <div className="flex items-center gap-6">
                <div className="relative">
                    <div
                        onClick={handleLogoClick}
                        className="w-24 h-24 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors overflow-hidden"
                    >
                        {isUploadingLogo ? (
                            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                        ) : data?.logoUrl ? (
                            <img src={data.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                            <Camera className="w-8 h-8 text-gray-400" />
                        )}
                    </div>
                    <button
                        onClick={handleLogoClick}
                        className="absolute -bottom-2 -right-2 p-2 bg-brand-600 text-white rounded-full hover:bg-brand-700 transition-colors"
                    >
                        <Upload className="w-3 h-3" />
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleLogoChange}
                        className="hidden"
                    />
                </div>
                <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Logo da Empresa</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        JPG, PNG ou WebP. Máximo 2MB.
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
                    <Save className="w-4 h-4 flex-shrink-0" />
                    {success}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Company Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Razão Social
                            {isSupplier && <Lock className="inline w-3.5 h-3.5 ml-1.5 text-gray-400" />}
                        </label>
                        <input
                            type="text"
                            name="legalName"
                            value={formData.legalName}
                            onChange={handleChange}
                            readOnly={isSupplier}
                            title={isSupplier ? 'Alterações devem ser solicitadas ao suporte' : undefined}
                            className={`w-full px-4 py-2 border rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent ${isSupplier ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-not-allowed' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'}`}
                        />
                        {isSupplier && (
                            <p className="text-xs text-gray-400 mt-1">Alterações devem ser solicitadas ao suporte</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Nome Fantasia
                        </label>
                        <input
                            type="text"
                            name="tradeName"
                            value={formData.tradeName}
                            onChange={handleChange}
                            className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            CNPJ
                        </label>
                        <input
                            type="text"
                            value={data?.document || ''}
                            disabled
                            className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 cursor-not-allowed"
                        />
                    </div>
                </div>

                {/* Contact */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4" />
                                Telefone
                            </div>
                        </label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="(11) 99999-9999"
                            className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                E-mail
                            </div>
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Address */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="flex items-center gap-2 text-md font-medium text-gray-900 dark:text-white mb-4">
                        <MapPin className="w-4 h-4" />
                        Endereço
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                CEP
                            </label>
                            <input
                                type="text"
                                name="zipCode"
                                value={formData.zipCode}
                                onChange={handleChange}
                                placeholder="00000-000"
                                maxLength={9}
                                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Rua
                            </label>
                            <input
                                type="text"
                                name="street"
                                value={formData.street}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Número
                            </label>
                            <input
                                type="text"
                                name="number"
                                value={formData.number}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Complemento
                            </label>
                            <input
                                type="text"
                                name="complement"
                                value={formData.complement}
                                onChange={handleChange}
                                placeholder="Apto, Sala, Galpão..."
                                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Bairro
                            </label>
                            <input
                                type="text"
                                name="neighborhood"
                                value={formData.neighborhood}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Cidade
                            </label>
                            <input
                                type="text"
                                name="city"
                                value={formData.city}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Estado
                            </label>
                            <select
                                name="state"
                                value={formData.state}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            >
                                <option value="">Selecione</option>
                                {['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map(uf => (
                                    <option key={uf} value={uf}>{uf}</option>
                                ))}
                            </select>
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
                        Salvar Alterações
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CompanyDataSection;
