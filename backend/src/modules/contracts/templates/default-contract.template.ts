/**
 * Template padrão de contrato de fornecimento
 *
 * Variáveis disponíveis:
 * - {{brandName}} - Nome da marca
 * - {{brandCnpj}} - CNPJ da marca
 * - {{brandAddress}} - Endereço da marca
 * - {{supplierName}} - Nome da facção
 * - {{supplierCnpj}} - CNPJ da facção
 * - {{supplierAddress}} - Endereço da facção
 * - {{date}} - Data de geração
 * - {{paymentTerms}} - Prazo de pagamento (se definido em terms)
 * - {{penaltyRate}} - Taxa de multa (se definido em terms)
 */

export const DEFAULT_CONTRACT_TEMPLATE = `
CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE PRODUÇÃO TÊXTIL

Este Contrato de Prestação de Serviços de Produção Têxtil ("Contrato") é celebrado entre:

CONTRATANTE:
{{brandName}}
CNPJ: {{brandCnpj}}
Endereço: {{brandAddress}}

E

CONTRATADO:
{{supplierName}}
CNPJ: {{supplierCnpj}}
Endereço: {{supplierAddress}}

Data: {{date}}

CLÁUSULA PRIMEIRA - DO OBJETO
1.1. O presente contrato tem por objeto a prestação de serviços de produção têxtil pela CONTRATADA em favor da CONTRATANTE.

1.2. A CONTRATADA realizará a produção de peças de vestuário conforme especificações técnicas fornecidas pela CONTRATANTE através da plataforma TexLink.

CLÁUSULA SEGUNDA - DAS OBRIGAÇÕES DA CONTRATADA
2.1. Produzir as peças solicitadas com qualidade e dentro dos prazos acordados;

2.2. Informar imediatamente qualquer problema que possa afetar a produção;

2.3. Manter sigilo sobre as especificações técnicas, designs e demais informações confidenciais;

2.4. Cumprir com todas as normas trabalhistas e de segurança aplicáveis;

2.5. Manter certidões fiscais e trabalhistas atualizadas.

CLÁUSULA TERCEIRA - DAS OBRIGAÇÕES DA CONTRATANTE
3.1. Fornecer especificações técnicas claras e completas;

3.2. Fornecer ou indicar fornecedores de matéria-prima quando aplicável;

3.3. Efetuar o pagamento conforme acordado;

3.4. Avaliar e fornecer feedback sobre as peças produzidas.

CLÁUSULA QUARTA - DO PAGAMENTO
4.1. O pagamento será efetuado conforme valores acordados em cada pedido realizado através da plataforma TexLink.

4.2. Prazo de pagamento: {{paymentTerms}}

4.3. O pagamento será realizado mediante apresentação de nota fiscal válida.

CLÁUSULA QUINTA - DA QUALIDADE
5.1. A CONTRATADA deve garantir que as peças produzidas atendam aos padrões de qualidade especificados pela CONTRATANTE.

5.2. Peças com defeitos de fabricação poderão ser recusadas e deverão ser refeitas sem custo adicional para a CONTRATANTE.

CLÁUSULA SEXTA - DA CONFIDENCIALIDADE
6.1. Ambas as partes se comprometem a manter sigilo sobre todas as informações confidenciais trocadas durante a vigência deste contrato.

6.2. A violação desta cláusula sujeitará a parte infratora às penalidades legais cabíveis.

CLÁUSULA SÉTIMA - DO PRAZO E RESCISÃO
7.1. Este contrato tem prazo indeterminado.

7.2. Qualquer das partes poderá rescindir o contrato mediante notificação prévia de 30 (trinta) dias.

7.3. A rescisão não desobriga as partes de cumprir os pedidos já aceitos e em andamento.

CLÁUSULA OITAVA - DAS PENALIDADES
8.1. O descumprimento das obrigações previstas neste contrato sujeitará a parte infratora ao pagamento de multa de {{penaltyRate}} sobre o valor do pedido afetado.

8.2. A multa não exclui o direito à indenização por perdas e danos.

CLÁUSULA NONA - DO FORO
9.1. As partes elegem o foro da comarca da CONTRATANTE para dirimir quaisquer dúvidas ou litígios decorrentes deste contrato.

E, por estarem justas e contratadas, as partes assinam o presente contrato eletronicamente através da plataforma TexLink.

_______________________________
CONTRATANTE
{{brandName}}
CNPJ: {{brandCnpj}}

_______________________________
CONTRATADO
{{supplierName}}
CNPJ: {{supplierCnpj}}
`;

export const DEFAULT_PAYMENT_TERMS = '30 dias após entrega';
export const DEFAULT_PENALTY_RATE = '2% do valor do pedido';
