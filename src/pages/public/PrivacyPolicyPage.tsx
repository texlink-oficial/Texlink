import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const PrivacyPolicyPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-white dark:bg-gray-900">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Voltar
                    </Link>
                    <span className="text-xl font-bold text-brand-600 dark:text-brand-400">Texlink</span>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-6 py-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    Politica de Privacidade
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                    Versao 1.0 — Fevereiro de 2026
                </p>

                {/* 1. Introducao */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        1. Introducao
                    </h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                        A Texlink Tecnologia Ltda. ("Texlink", "nos") opera a plataforma B2B que conecta marcas
                        de vestuario a faccoes de costura. Esta Politica de Privacidade descreve como coletamos,
                        usamos, armazenamos e compartilhamos seus dados pessoais quando voce utiliza nossos
                        servicos, em conformidade com a Lei Geral de Protecao de Dados (LGPD — Lei n. 13.709/2018).
                    </p>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        Ao acessar ou utilizar a plataforma Texlink, voce concorda com as praticas descritas nesta
                        Politica. Caso nao concorde, por favor nao utilize nossos servicos.
                    </p>
                </section>

                {/* 2. Dados que Coletamos */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        2. Dados que Coletamos
                    </h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                        Coletamos diferentes categorias de dados para fornecer e melhorar nossos servicos:
                    </p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse border border-gray-200 dark:border-gray-700 mb-4">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800">
                                    <th className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">
                                        Categoria
                                    </th>
                                    <th className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">
                                        Dados
                                    </th>
                                    <th className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">
                                        Finalidade
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="text-gray-700 dark:text-gray-300">
                                <tr>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3 font-medium">Cadastro</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">Nome, e-mail, telefone, CNPJ, razao social, nome fantasia, cidade, UF</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">Criacao e gestao da conta; verificacao de identidade empresarial</td>
                                </tr>
                                <tr className="bg-gray-50 dark:bg-gray-800/50">
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3 font-medium">Autenticacao</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">Senha (hash bcrypt), tokens JWT, tokens de reset de senha</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">Seguranca de acesso a conta</td>
                                </tr>
                                <tr>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3 font-medium">Perfil da empresa</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">Capacidade produtiva, tipos de produto, maquinario, certificacoes, logo</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">Matchmaking entre marcas e faccoes; exibicao de perfil</td>
                                </tr>
                                <tr className="bg-gray-50 dark:bg-gray-800/50">
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3 font-medium">Transacional</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">Pedidos, contratos, valores, prazos, avaliacoes, historico de pagamentos</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">Execucao de contratos; gestao financeira; relatorios</td>
                                </tr>
                                <tr>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3 font-medium">Comunicacao</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">Mensagens de chat, anexos, notificacoes</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">Comunicacao entre parceiros; suporte ao cliente</td>
                                </tr>
                                <tr className="bg-gray-50 dark:bg-gray-800/50">
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3 font-medium">Tecnico/Uso</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">Endereco IP, user-agent, paginas visitadas, cliques, timestamps</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">Seguranca; melhoria da plataforma; analytics</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* 3. Base Legal */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        3. Base Legal para o Tratamento
                    </h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                        Tratamos seus dados com base nas seguintes hipoteses legais previstas na LGPD:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                        <li><strong>Execucao de contrato</strong> (Art. 7, V) — para fornecer os servicos contratados na plataforma.</li>
                        <li><strong>Consentimento</strong> (Art. 7, I) — para envio de comunicacoes de marketing e uso de cookies nao essenciais.</li>
                        <li><strong>Interesse legitimo</strong> (Art. 7, IX) — para melhoria dos servicos, prevencao de fraudes e seguranca.</li>
                        <li><strong>Cumprimento de obrigacao legal</strong> (Art. 7, II) — para atendimento de exigencias fiscais e regulatorias.</li>
                    </ul>
                </section>

                {/* 4. Como Usamos seus Dados */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        4. Como Usamos seus Dados
                    </h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                        Utilizamos seus dados para:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                        <li>Criar e manter sua conta na plataforma;</li>
                        <li>Conectar marcas a faccoes com base em perfil e capacidade;</li>
                        <li>Processar pedidos, contratos e pagamentos;</li>
                        <li>Enviar notificacoes sobre pedidos, mensagens e atualizacoes;</li>
                        <li>Gerar relatorios e dashboards de desempenho;</li>
                        <li>Melhorar a experiencia do usuario e a funcionalidade da plataforma;</li>
                        <li>Prevenir fraudes e garantir a seguranca do sistema;</li>
                        <li>Cumprir obrigacoes legais e regulatorias.</li>
                    </ul>
                </section>

                {/* 5. Compartilhamento de Dados */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        5. Compartilhamento de Dados
                    </h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                        Podemos compartilhar seus dados com:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                        <li><strong>Parceiros comerciais</strong> — marcas e faccoes conectadas a voce na plataforma, limitado aos dados necessarios para a relacao comercial;</li>
                        <li><strong>Prestadores de servico</strong> — provedores de infraestrutura (AWS), processamento de pagamentos, envio de e-mails, e analytics;</li>
                        <li><strong>Autoridades publicas</strong> — quando exigido por lei, regulamento ou ordem judicial;</li>
                        <li><strong>Auditores e consultores</strong> — para fins de auditoria, consultoria juridica ou compliance.</li>
                    </ul>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-3">
                        Nao vendemos seus dados pessoais a terceiros.
                    </p>
                </section>

                {/* 6. Armazenamento e Seguranca */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        6. Armazenamento e Seguranca
                    </h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                        Seus dados sao armazenados em servidores seguros na infraestrutura da Amazon Web Services (AWS).
                        Adotamos medidas tecnicas e organizacionais para proteger seus dados, incluindo:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                        <li>Criptografia de senhas com bcrypt;</li>
                        <li>Comunicacao via HTTPS/TLS;</li>
                        <li>Autenticacao via tokens JWT com expiracao;</li>
                        <li>Controle de acesso multi-tenant por empresa (companyId);</li>
                        <li>URLs pré-assinadas para acesso a arquivos no S3;</li>
                        <li>Monitoramento e logs de acesso.</li>
                    </ul>
                </section>

                {/* 7. Retencao de Dados */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        7. Retencao de Dados
                    </h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                        Retemos seus dados pelo tempo necessario para as finalidades descritas nesta Politica:
                    </p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse border border-gray-200 dark:border-gray-700 mb-4">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800">
                                    <th className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">
                                        Tipo de Dado
                                    </th>
                                    <th className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">
                                        Periodo de Retencao
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="text-gray-700 dark:text-gray-300">
                                <tr>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">Dados de conta</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">Enquanto a conta estiver ativa + 6 meses apos exclusao</td>
                                </tr>
                                <tr className="bg-gray-50 dark:bg-gray-800/50">
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">Dados transacionais</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">5 anos (exigencia fiscal/contabil)</td>
                                </tr>
                                <tr>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">Mensagens de chat</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">2 anos apos o encerramento da relacao comercial</td>
                                </tr>
                                <tr className="bg-gray-50 dark:bg-gray-800/50">
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">Logs de acesso</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">6 meses (Marco Civil da Internet)</td>
                                </tr>
                                <tr>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">Tokens de reset de senha</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">24 horas</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* 8. Seus Direitos */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        8. Seus Direitos (LGPD)
                    </h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                        De acordo com a LGPD, voce tem os seguintes direitos:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                        <li><strong>Confirmacao e acesso</strong> — saber se tratamos seus dados e obter copia;</li>
                        <li><strong>Correcao</strong> — solicitar a correcao de dados incompletos ou desatualizados;</li>
                        <li><strong>Anonimizacao, bloqueio ou eliminacao</strong> — de dados desnecessarios ou excessivos;</li>
                        <li><strong>Portabilidade</strong> — obter seus dados em formato estruturado;</li>
                        <li><strong>Eliminacao</strong> — solicitar a exclusao de dados tratados com base em consentimento;</li>
                        <li><strong>Revogacao do consentimento</strong> — a qualquer tempo, sem afetar o tratamento anterior;</li>
                        <li><strong>Oposicao</strong> — ao tratamento realizado com base em interesse legitimo;</li>
                        <li><strong>Informacao sobre compartilhamento</strong> — saber com quem seus dados foram compartilhados.</li>
                    </ul>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-3">
                        Para exercer qualquer desses direitos, entre em contato com nosso Encarregado de Dados (DPO)
                        atraves dos canais listados na secao 11.
                    </p>
                </section>

                {/* 9. Transferencia Internacional */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        9. Transferencia Internacional de Dados
                    </h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                        Alguns dos nossos prestadores de servico podem processar dados fora do Brasil.
                        Nestes casos, garantimos que a transferencia e feita com salvaguardas adequadas:
                    </p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse border border-gray-200 dark:border-gray-700 mb-4">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800">
                                    <th className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">
                                        Provedor
                                    </th>
                                    <th className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">
                                        Finalidade
                                    </th>
                                    <th className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">
                                        Localizacao
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="text-gray-700 dark:text-gray-300">
                                <tr>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">Amazon Web Services (AWS)</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">Hospedagem, banco de dados, armazenamento S3</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">EUA / Sao Paulo</td>
                                </tr>
                                <tr className="bg-gray-50 dark:bg-gray-800/50">
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">Google Analytics</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">Analytics de uso</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">EUA</td>
                                </tr>
                                <tr>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">Redis (Upstash/Railway)</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">Cache, filas, real-time</td>
                                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">EUA</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* 10. Alteracoes nesta Politica */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        10. Alteracoes nesta Politica
                    </h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        Podemos atualizar esta Politica de Privacidade periodicamente. Quando fizermos alteracoes
                        significativas, notificaremos voce por e-mail ou atraves de aviso na plataforma. A data da
                        ultima atualizacao sera sempre indicada no topo deste documento. Recomendamos que voce
                        revise esta Politica regularmente.
                    </p>
                </section>

                {/* 11. Contato e DPO */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        11. Contato e Encarregado de Dados (DPO)
                    </h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                        Para duvidas, solicitacoes ou exercicio de direitos relacionados a esta Politica,
                        entre em contato:
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

                {/* 12. Links de Politicas de Terceiros */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        12. Politicas de Privacidade de Terceiros
                    </h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                        Para mais informacoes sobre como nossos parceiros de tecnologia tratam dados pessoais:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                        <li>
                            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-600 dark:text-brand-400 hover:underline">
                                Google — Politica de Privacidade
                            </a>
                        </li>
                        <li>
                            <a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener noreferrer" className="text-brand-600 dark:text-brand-400 hover:underline">
                                Meta (Facebook/Instagram) — Politica de Privacidade
                            </a>
                        </li>
                        <li>
                            <a href="https://www.tiktok.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-brand-600 dark:text-brand-400 hover:underline">
                                TikTok — Politica de Privacidade
                            </a>
                        </li>
                        <li>
                            <a href="https://www.linkedin.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-brand-600 dark:text-brand-400 hover:underline">
                                LinkedIn — Politica de Privacidade
                            </a>
                        </li>
                    </ul>
                </section>

                {/* Footer */}
                <footer className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-12">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <p>Texlink Tecnologia Ltda. — Todos os direitos reservados.</p>
                        <div className="flex gap-4">
                            <Link to="/politica-de-cookies" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                                Politica de Cookies
                            </Link>
                        </div>
                    </div>
                </footer>
            </main>
        </div>
    );
};

export default PrivacyPolicyPage;
