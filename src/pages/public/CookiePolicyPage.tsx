import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const CookiePolicyPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-white dark:bg-gray-900">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Voltar
                    </button>
                    <span className="text-xl font-bold text-brand-600 dark:text-brand-400">Texlink</span>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-6 py-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    Politica de Cookies
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                    Versao 1.0 — Fevereiro de 2026
                </p>

                {/* 1. O que sao Cookies */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        1. O que sao Cookies?
                    </h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        Cookies sao pequenos arquivos de texto armazenados no seu navegador quando voce visita um
                        site. Eles permitem que o site reconheca seu dispositivo e armazene informacoes sobre suas
                        preferencias ou acoes anteriores. Tecnologias semelhantes incluem pixels, web beacons e
                        armazenamento local (localStorage, sessionStorage).
                    </p>
                </section>

                {/* 2. Por que Usamos Cookies */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        2. Por que Usamos Cookies?
                    </h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                        A Texlink utiliza cookies e tecnologias semelhantes para:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                        <li>Manter voce autenticado na plataforma;</li>
                        <li>Lembrar suas preferencias de tema (claro/escuro) e idioma;</li>
                        <li>Garantir a seguranca da sua sessao;</li>
                        <li>Analisar o uso da plataforma para melhorias;</li>
                        <li>Fornecer funcionalidades essenciais em tempo real (chat, notificacoes).</li>
                    </ul>
                </section>

                {/* 3. Base Legal */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        3. Base Legal
                    </h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        Os cookies estritamente necessarios sao utilizados com base no <strong>interesse legitimo</strong> (LGPD Art. 7, IX),
                        pois sao indispensaveis para o funcionamento da plataforma. Para cookies de analytics e marketing,
                        solicitamos seu <strong>consentimento</strong> (LGPD Art. 7, I) atraves do banner de cookies exibido no
                        primeiro acesso.
                    </p>
                </section>

                {/* 4. Tipos de Cookies que Utilizamos */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        4. Tipos de Cookies que Utilizamos
                    </h2>

                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3 mt-6">
                        4.1 Cookies Estritamente Necessarios
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                        Essenciais para o funcionamento basico da plataforma. Nao podem ser desativados.
                    </p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse border border-gray-200 dark:border-gray-700 mb-6">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800">
                                    <th className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Cookie/Tecnologia</th>
                                    <th className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Finalidade</th>
                                    <th className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Duracao</th>
                                </tr>
                            </thead>
                            <tbody className="text-gray-700 dark:text-gray-300">
                                <tr>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3 font-mono text-xs">sessionStorage: token</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">Token JWT de autenticacao da sessao atual</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">Sessao</td>
                                </tr>
                                <tr className="bg-gray-50 dark:bg-gray-800/50">
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3 font-mono text-xs">localStorage: token</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">Token JWT persistente ("lembrar de mim")</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">7 dias</td>
                                </tr>
                                <tr>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3 font-mono text-xs">localStorage: user</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">Dados basicos do usuario logado (cache local)</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">Persistente</td>
                                </tr>
                                <tr className="bg-gray-50 dark:bg-gray-800/50">
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3 font-mono text-xs">IndexedDB: texlink-db</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">Armazenamento offline via Dexie (rascunhos, cache)</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">Persistente</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3 mt-6">
                        4.2 Cookies de Preferencias
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                        Armazenam suas preferencias de interface.
                    </p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse border border-gray-200 dark:border-gray-700 mb-6">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800">
                                    <th className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Cookie/Tecnologia</th>
                                    <th className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Finalidade</th>
                                    <th className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Duracao</th>
                                </tr>
                            </thead>
                            <tbody className="text-gray-700 dark:text-gray-300">
                                <tr>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3 font-mono text-xs">localStorage: theme</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">Preferencia de tema (claro/escuro/sistema)</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">Persistente</td>
                                </tr>
                                <tr className="bg-gray-50 dark:bg-gray-800/50">
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3 font-mono text-xs">localStorage: sidebar-collapsed</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">Estado da barra lateral (aberta/fechada)</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">Persistente</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3 mt-6">
                        4.3 Cookies de Analytics
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                        Ajudam a entender como os usuarios interagem com a plataforma.
                    </p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse border border-gray-200 dark:border-gray-700 mb-6">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800">
                                    <th className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Cookie/Tecnologia</th>
                                    <th className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Provedor</th>
                                    <th className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Finalidade</th>
                                    <th className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Duracao</th>
                                </tr>
                            </thead>
                            <tbody className="text-gray-700 dark:text-gray-300">
                                <tr>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3 font-mono text-xs">_ga</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">Google Analytics</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">Distinguir usuarios unicos</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">2 anos</td>
                                </tr>
                                <tr className="bg-gray-50 dark:bg-gray-800/50">
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3 font-mono text-xs">_ga_*</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">Google Analytics</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">Manter estado da sessao</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">2 anos</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* 5. Tecnologias de Tempo Real */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        5. Tecnologias de Tempo Real
                    </h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                        A Texlink utiliza tecnologias de comunicacao em tempo real que nao sao cookies
                        tradicionais, mas armazenam dados localmente:
                    </p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse border border-gray-200 dark:border-gray-700 mb-4">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800">
                                    <th className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Tecnologia</th>
                                    <th className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Finalidade</th>
                                    <th className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Dados Armazenados</th>
                                </tr>
                            </thead>
                            <tbody className="text-gray-700 dark:text-gray-300">
                                <tr>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">Socket.io (WebSocket)</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">Chat em tempo real, notificacoes push</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">ID da conexao, sala do chat</td>
                                </tr>
                                <tr className="bg-gray-50 dark:bg-gray-800/50">
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">TanStack Query (cache)</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">Cache de dados da API na memoria</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">Respostas de API em memoria (nao persiste)</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* 6. Como Gerenciar Cookies */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        6. Como Gerenciar Cookies
                    </h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                        Voce pode gerenciar cookies de diferentes formas:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                        <li><strong>Banner de cookies</strong> — ao acessar a plataforma pela primeira vez, voce pode aceitar ou recusar cookies nao essenciais;</li>
                        <li><strong>Configuracoes do navegador</strong> — a maioria dos navegadores permite bloquear ou excluir cookies. Consulte a documentacao do seu navegador;</li>
                        <li><strong>Limpar dados</strong> — voce pode limpar cookies e dados de armazenamento local a qualquer momento nas configuracoes do navegador.</li>
                    </ul>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-3">
                        <strong>Nota:</strong> desativar cookies essenciais pode impedir o funcionamento correto da plataforma,
                        incluindo a impossibilidade de fazer login.
                    </p>
                </section>

                {/* 7. Cookies de Terceiros */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        7. Cookies de Terceiros
                    </h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                        Alguns cookies sao definidos por servicos de terceiros que utilizamos. Para mais informacoes
                        sobre como esses provedores tratam seus dados:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                        <li>
                            <a href="https://policies.google.com/technologies/cookies" target="_blank" rel="noopener noreferrer" className="text-brand-600 dark:text-brand-400 hover:underline">
                                Google — Politica de Cookies
                            </a>
                        </li>
                    </ul>
                </section>

                {/* 8. Atualizacoes */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        8. Atualizacoes desta Politica
                    </h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        Esta Politica de Cookies pode ser atualizada periodicamente para refletir mudancas nos
                        cookies utilizados ou em requisitos legais. A data da ultima atualizacao sera sempre
                        indicada no topo deste documento. Recomendamos que voce revise esta Politica regularmente.
                    </p>
                </section>

                {/* 9. Contato */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        9. Contato
                    </h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                        Para duvidas sobre cookies e tecnologias de rastreamento:
                    </p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse border border-gray-200 dark:border-gray-700">
                            <tbody className="text-gray-700 dark:text-gray-300">
                                <tr>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3 font-medium bg-gray-50 dark:bg-gray-800 w-48">Empresa</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">Texlink Tecnologia Ltda.</td>
                                </tr>
                                <tr>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3 font-medium bg-gray-50 dark:bg-gray-800">E-mail do DPO</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">
                                        <a href="mailto:privacidade@texlink.com.br" className="text-brand-600 dark:text-brand-400 hover:underline">
                                            privacidade@texlink.com.br
                                        </a>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3 font-medium bg-gray-50 dark:bg-gray-800">E-mail de suporte</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">
                                        <a href="mailto:suporte@texlink.com.br" className="text-brand-600 dark:text-brand-400 hover:underline">
                                            suporte@texlink.com.br
                                        </a>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Footer */}
                <footer className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-12">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <p>Texlink Tecnologia Ltda. — Todos os direitos reservados.</p>
                        <div className="flex gap-4">
                            <Link to="/politica-de-privacidade" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                                Politica de Privacidade
                            </Link>
                        </div>
                    </div>
                </footer>
            </main>
        </div>
    );
};

export default CookiePolicyPage;
