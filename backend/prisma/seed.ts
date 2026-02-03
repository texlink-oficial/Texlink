import 'dotenv/config';
import { PrismaClient, UserRole, CompanyType, CompanyStatus, OrderStatus, OrderAssignmentType, CompanyRole, PartnerCategory, EducationalContentType, EducationalContentCategory } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('🌱 Seeding database with complete mock data...\n');

    const password = await bcrypt.hash('123456', 10);

    // ==================== ADMIN ====================
    const admin = await prisma.user.upsert({
        where: { email: 'admin@texlink.com' },
        update: {},
        create: {
            email: 'admin@texlink.com',
            passwordHash: await bcrypt.hash('admin123', 10),
            name: 'Administrador TEXLINK',
            role: UserRole.ADMIN,
            isActive: true,
        },
    });
    console.log('✅ Admin:', admin.email);

    // ==================== DEMO USERS ====================
    // These match the credentials in frontend mockMode.ts
    const demoPassword = await bcrypt.hash('demo123', 10);

    // Demo Admin
    const demoAdmin = await prisma.user.upsert({
        where: { email: 'demo-admin@texlink.com' },
        update: {},
        create: {
            email: 'demo-admin@texlink.com',
            passwordHash: demoPassword,
            name: 'Demo Admin',
            role: UserRole.ADMIN,
            isActive: true,
        },
    });
    console.log('✅ Demo Admin:', demoAdmin.email);

    // Demo Brand
    const demoBrandUser = await prisma.user.upsert({
        where: { email: 'demo-brand@texlink.com' },
        update: {},
        create: {
            email: 'demo-brand@texlink.com',
            passwordHash: demoPassword,
            name: 'Demo Marca',
            role: UserRole.BRAND,
            isActive: true,
        },
    });

    const demoBrandCompany = await prisma.company.upsert({
        where: { document: '00000000000100' },
        update: {},
        create: {
            legalName: 'Demo Marca LTDA',
            tradeName: 'Demo Brand',
            document: '00000000000100',
            type: CompanyType.BRAND,
            status: CompanyStatus.ACTIVE,
            city: 'São Paulo',
            state: 'SP',
        },
    });

    await prisma.companyUser.upsert({
        where: { userId_companyId: { userId: demoBrandUser.id, companyId: demoBrandCompany.id } },
        update: { companyRole: CompanyRole.ADMIN, isCompanyAdmin: true },
        create: { userId: demoBrandUser.id, companyId: demoBrandCompany.id, role: 'OWNER', companyRole: CompanyRole.ADMIN, isCompanyAdmin: true },
    });
    console.log('✅ Demo Brand:', demoBrandUser.email);

    // Demo Supplier
    const demoSupplierUser = await prisma.user.upsert({
        where: { email: 'demo-supplier@texlink.com' },
        update: {},
        create: {
            email: 'demo-supplier@texlink.com',
            passwordHash: demoPassword,
            name: 'Demo Facção',
            role: UserRole.SUPPLIER,
            isActive: true,
        },
    });

    const demoSupplierCompany = await prisma.company.upsert({
        where: { document: '00000000000199' },
        update: {},
        create: {
            legalName: 'Demo Confecções LTDA',
            tradeName: 'Demo Supplier',
            document: '00000000000199',
            type: CompanyType.SUPPLIER,
            status: CompanyStatus.ACTIVE,
            city: 'Blumenau',
            state: 'SC',
            avgRating: 4.5,
        },
    });

    await prisma.companyUser.upsert({
        where: { userId_companyId: { userId: demoSupplierUser.id, companyId: demoSupplierCompany.id } },
        update: { companyRole: CompanyRole.ADMIN, isCompanyAdmin: true },
        create: { userId: demoSupplierUser.id, companyId: demoSupplierCompany.id, role: 'OWNER', companyRole: CompanyRole.ADMIN, isCompanyAdmin: true },
    });

    await prisma.supplierProfile.upsert({
        where: { companyId: demoSupplierCompany.id },
        update: {},
        create: {
            companyId: demoSupplierCompany.id,
            onboardingPhase: 3,
            onboardingComplete: true,
            productTypes: ['Camiseta', 'Calça', 'Vestido'],
            specialties: ['Malha', 'Jeans'],
            monthlyCapacity: 5000,
            currentOccupancy: 30,
        },
    });
    console.log('✅ Demo Supplier:', demoSupplierUser.email);

    // ==================== BRANDS ====================
    const brandsData = [
        { email: 'marca@teste.com', name: 'João Silva', company: { legalName: 'Moda Fashion LTDA', tradeName: 'Moda Fashion', document: '12345678000100', city: 'São Paulo', state: 'SP' } },
        { email: 'contato@urbanwear.com', name: 'Ana Costa', company: { legalName: 'Urban Wear LTDA', tradeName: 'Urban Wear', document: '11111111000111', city: 'Rio de Janeiro', state: 'RJ' } },
        { email: 'vendas@bellamoda.com', name: 'Carlos Mendes', company: { legalName: 'Bella Moda ME', tradeName: 'Bella Moda', document: '22222222000122', city: 'Belo Horizonte', state: 'MG' } },
    ];

    const brands: any[] = [];
    for (const data of brandsData) {
        const user = await prisma.user.upsert({
            where: { email: data.email },
            update: {},
            create: { email: data.email, passwordHash: password, name: data.name, role: UserRole.BRAND, isActive: true },
        });

        const company = await prisma.company.upsert({
            where: { document: data.company.document },
            update: {},
            create: { ...data.company, type: CompanyType.BRAND, status: CompanyStatus.ACTIVE },
        });

        await prisma.companyUser.upsert({
            where: { userId_companyId: { userId: user.id, companyId: company.id } },
            update: { companyRole: CompanyRole.ADMIN, isCompanyAdmin: true },
            create: { userId: user.id, companyId: company.id, role: 'OWNER', companyRole: CompanyRole.ADMIN, isCompanyAdmin: true },
        });

        brands.push({ user, company });
        console.log('✅ Brand:', company.tradeName);
    }

    // ==================== SUPPLIERS ====================
    const suppliersData = [
        { email: 'faccao@teste.com', name: 'Maria Santos', company: { legalName: 'Confecções Santos LTDA', tradeName: 'Santos Confecções', document: '98765432000199', city: 'Blumenau', state: 'SC' }, profile: { productTypes: ['Camiseta', 'Calça', 'Vestido'], specialties: ['Malha', 'Jeans'], monthlyCapacity: 5000, currentOccupancy: 30 } },
        { email: 'contato@textilpremium.com', name: 'Roberto Oliveira', company: { legalName: 'Têxtil Premium LTDA', tradeName: 'Têxtil Premium', document: '33333333000133', city: 'Jaraguá do Sul', state: 'SC' }, profile: { productTypes: ['Camiseta', 'Polo', 'Regata'], specialties: ['Malha', 'Algodão'], monthlyCapacity: 8000, currentOccupancy: 45 } },
        { email: 'vendas@confecjeans.com', name: 'Patricia Lima', company: { legalName: 'Confec Jeans ME', tradeName: 'Confec Jeans', document: '44444444000144', city: 'Cianorte', state: 'PR' }, profile: { productTypes: ['Calça Jeans', 'Bermuda', 'Jaqueta'], specialties: ['Jeans', 'Denim'], monthlyCapacity: 3000, currentOccupancy: 60 } },
        { email: 'contato@malhariasul.com', name: 'Fernando Ramos', company: { legalName: 'Malharia Sul LTDA', tradeName: 'Malharia Sul', document: '55555555000155', city: 'Novo Hamburgo', state: 'RS' }, profile: { productTypes: ['Moletom', 'Blusa', 'Cardigan'], specialties: ['Tricô', 'Malha'], monthlyCapacity: 4000, currentOccupancy: 20 } },
        { email: 'producao@styletex.com', name: 'Amanda Ferreira', company: { legalName: 'Style Tex ME', tradeName: 'Style Tex', document: '66666666000166', city: 'São Paulo', state: 'SP' }, profile: { productTypes: ['Vestido', 'Saia', 'Blusa'], specialties: ['Viscose', 'Crepe'], monthlyCapacity: 2500, currentOccupancy: 75 } },
        { email: 'orcamento@fitnesswear.com', name: 'Lucas Martins', company: { legalName: 'Fitness Wear EIRELI', tradeName: 'Fitness Wear', document: '77777777000177', city: 'Americana', state: 'SP' }, profile: { productTypes: ['Legging', 'Top', 'Shorts'], specialties: ['Suplex', 'Dry-fit'], monthlyCapacity: 6000, currentOccupancy: 55 } },
    ];

    const suppliers: any[] = [];
    for (const data of suppliersData) {
        const user = await prisma.user.upsert({
            where: { email: data.email },
            update: {},
            create: { email: data.email, passwordHash: password, name: data.name, role: UserRole.SUPPLIER, isActive: true },
        });

        const company = await prisma.company.upsert({
            where: { document: data.company.document },
            update: {},
            create: { ...data.company, type: CompanyType.SUPPLIER, status: CompanyStatus.ACTIVE, avgRating: (Math.random() * 1.5 + 3.5).toFixed(1) as any },
        });

        await prisma.companyUser.upsert({
            where: { userId_companyId: { userId: user.id, companyId: company.id } },
            update: { companyRole: CompanyRole.ADMIN, isCompanyAdmin: true },
            create: { userId: user.id, companyId: company.id, role: 'OWNER', companyRole: CompanyRole.ADMIN, isCompanyAdmin: true },
        });

        await prisma.supplierProfile.upsert({
            where: { companyId: company.id },
            update: {},
            create: { companyId: company.id, onboardingPhase: 3, onboardingComplete: true, ...data.profile },
        });

        suppliers.push({ user, company });
        console.log('✅ Supplier:', company.tradeName);
    }

    // ==================== ORDERS ====================
    const ordersData = [
        { brand: 0, supplier: 0, product: 'Camiseta Básica Algodão', type: 'Camiseta', qty: 500, price: 18.50, status: OrderStatus.EM_PRODUCAO, days: -5 },
        { brand: 0, supplier: 1, product: 'Polo Masculina Premium', type: 'Polo', qty: 300, price: 35.00, status: OrderStatus.ACEITO_PELA_FACCAO, days: -2 },
        { brand: 0, supplier: null, product: 'Regata Dry-Fit', type: 'Regata', qty: 1000, price: 12.00, status: OrderStatus.LANCADO_PELA_MARCA, days: 0 },
        { brand: 1, supplier: 2, product: 'Calça Jeans Skinny', type: 'Calça Jeans', qty: 200, price: 55.00, status: OrderStatus.FINALIZADO, days: -30 },
        { brand: 1, supplier: 3, product: 'Moletom Canguru', type: 'Moletom', qty: 150, price: 45.00, status: OrderStatus.EM_PRODUCAO, days: -3 },
        { brand: 1, supplier: null, product: 'Jaqueta Jeans', type: 'Jaqueta', qty: 100, price: 85.00, status: OrderStatus.LANCADO_PELA_MARCA, days: 0, bidding: true },
        { brand: 2, supplier: 4, product: 'Vestido Midi Viscose', type: 'Vestido', qty: 80, price: 65.00, status: OrderStatus.PRONTO, days: -7 },
        { brand: 2, supplier: 5, product: 'Legging Fitness', type: 'Legging', qty: 400, price: 28.00, status: OrderStatus.EM_PRODUCAO, days: -4 },
        { brand: 2, supplier: null, product: 'Top Esportivo', type: 'Top', qty: 600, price: 15.00, status: OrderStatus.DISPONIVEL_PARA_OUTRAS, days: -1 },
        { brand: 0, supplier: 0, product: 'Camiseta Estampada', type: 'Camiseta', qty: 800, price: 22.00, status: OrderStatus.FINALIZADO, days: -45 },
    ];

    console.log('\n');
    for (let i = 0; i < ordersData.length; i++) {
        const o = ordersData[i];
        const brand = brands[o.brand];
        const supplier = o.supplier !== null ? suppliers[o.supplier] : null;
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + 30 + o.days);

        const displayId = `TX-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(i + 1).padStart(4, '0')}`;

        // Check if order already exists
        const existingOrder = await prisma.order.findUnique({ where: { displayId } });
        if (existingOrder) {
            console.log('⏩ Order already exists:', displayId, '-', o.product);
            continue;
        }

        const order = await prisma.order.create({
            data: {
                displayId,
                brandId: brand.company.id,
                supplierId: supplier?.company.id || null,
                status: o.status,
                assignmentType: o.bidding ? OrderAssignmentType.BIDDING : OrderAssignmentType.DIRECT,
                productType: o.type,
                productName: o.product,
                quantity: o.qty,
                pricePerUnit: o.price,
                totalValue: o.qty * o.price,
                deliveryDeadline: deadline,
                materialsProvided: Math.random() > 0.5,
            },
        });

        // Create status history
        await prisma.orderStatusHistory.create({
            data: { orderId: order.id, newStatus: OrderStatus.LANCADO_PELA_MARCA, notes: 'Pedido criado' },
        });

        // For bidding orders without supplier, create target suppliers
        if (o.bidding && !supplier) {
            for (let j = 0; j < 3; j++) {
                await prisma.orderTargetSupplier.create({
                    data: { orderId: order.id, supplierId: suppliers[j].company.id, status: 'PENDING' },
                });
            }
        }

        console.log('✅ Order:', order.displayId, '-', o.product);
    }

    // ==================== MESSAGES (sample chat) ====================
    const orderWithChat = await prisma.order.findFirst({ where: { status: OrderStatus.EM_PRODUCAO } });
    if (orderWithChat) {
        const supplierUser = suppliers[0].user;
        const brandUser = brands[0].user;

        await prisma.message.createMany({
            data: [
                { orderId: orderWithChat.id, senderId: brandUser.id, type: 'TEXT', content: 'Olá! Gostaria de confirmar os detalhes do pedido.' },
                { orderId: orderWithChat.id, senderId: supplierUser.id, type: 'TEXT', content: 'Claro! Já estamos iniciando a produção. Alguma dúvida?' },
                { orderId: orderWithChat.id, senderId: brandUser.id, type: 'TEXT', content: 'A cor vai ser a mesma que enviamos na ficha técnica?' },
                { orderId: orderWithChat.id, senderId: supplierUser.id, type: 'TEXT', content: 'Sim, exatamente! Pantone 485C conforme especificado.' },
            ],
        });
        console.log('\n✅ Sample chat messages created');
    }

    // ==================== PARTNERS ====================
    console.log('\n');
    const partnersData = [
        {
            name: 'Gogood',
            description: 'Plataforma de benefícios de saúde e bem-estar para funcionários. Acesso a academias, telemedicina, suporte psicológico e muito mais. Melhore a qualidade de vida da sua equipe e reduza o absenteísmo.',
            logoUrl: 'https://gogood.com.br/wp-content/uploads/2023/09/gogood-logo.svg',
            website: 'https://gogood.com.br',
            category: PartnerCategory.HEALTH_WELLNESS,
            benefits: [
                'Acesso a +8.000 academias em todo Brasil',
                'Telemedicina 24h com clínico geral',
                'Suporte psicológico online',
                'Programas de bem-estar e mindfulness',
                'Descontos exclusivos para parceiros Texlink',
            ],
            contactEmail: 'parcerias@gogood.com.br',
            discountCode: 'TEXLINK20',
            discountInfo: '20% de desconto nos primeiros 3 meses',
            displayOrder: 1,
        },
        {
            name: 'NR Fácil',
            description: 'Soluções completas em segurança do trabalho e adequação às Normas Regulamentadoras. Laudos, treinamentos e consultoria especializada para sua empresa ficar em dia com a legislação.',
            logoUrl: null,
            website: 'https://nrfacil.com.br',
            category: PartnerCategory.COMPLIANCE,
            benefits: [
                'Elaboração de laudos NR-1, NR-7, NR-15, NR-17',
                'Treinamentos obrigatórios (NR-10, NR-35, etc.)',
                'PCMSO e PGR completos',
                'Consultoria para adequação ABVTEX',
                'Preços especiais para associados Texlink',
            ],
            contactEmail: 'contato@nrfacil.com.br',
            contactPhone: '(11) 99999-0001',
            discountInfo: '15% de desconto em pacotes de laudos',
            displayOrder: 2,
        },
        {
            name: 'Simples Já Contabilidade',
            description: 'Contabilidade especializada para confecções e indústria têxtil. Entendemos as particularidades do seu negócio e oferecemos soluções sob medida para sua empresa crescer.',
            logoUrl: null,
            website: 'https://simplesja.com.br',
            category: PartnerCategory.ACCOUNTING,
            benefits: [
                'Especialistas em regime tributário para confecções',
                'Gestão fiscal e contábil completa',
                'Emissão de notas fiscais e obrigações acessórias',
                'Consultoria tributária para economia de impostos',
                'Plataforma online para acompanhamento',
            ],
            contactEmail: 'contato@simplesja.com.br',
            discountCode: 'TEXLINK',
            discountInfo: 'Primeiro mês grátis + 10% nos 6 primeiros meses',
            displayOrder: 3,
        },
        {
            name: 'Credi Têxtil',
            description: 'Soluções financeiras para a cadeia têxtil. Antecipação de recebíveis, capital de giro e financiamento de equipamentos com taxas especiais para o setor.',
            logoUrl: null,
            website: 'https://creditextil.com.br',
            category: PartnerCategory.FINANCE,
            benefits: [
                'Antecipação de recebíveis com taxas reduzidas',
                'Capital de giro sem burocracia',
                'Financiamento de máquinas e equipamentos',
                'Análise de crédito em até 24h',
                'Condições especiais para parceiros Texlink',
            ],
            contactEmail: 'credito@creditextil.com.br',
            discountInfo: 'Taxa preferencial a partir de 1,29% a.m.',
            displayOrder: 4,
        },
        {
            name: 'TechFabric',
            description: 'Sistema de gestão ERP especializado para confecções. Controle de produção, estoque, vendas e financeiro em uma única plataforma integrada.',
            logoUrl: null,
            website: 'https://techfabric.com.br',
            category: PartnerCategory.TECHNOLOGY,
            benefits: [
                'Controle de produção e ordem de corte',
                'Gestão de estoque de tecidos e aviamentos',
                'Integração com e-commerce e marketplaces',
                'Relatórios gerenciais em tempo real',
                'Suporte técnico especializado',
            ],
            contactEmail: 'comercial@techfabric.com.br',
            discountCode: 'TEXLINK30',
            discountInfo: '30% de desconto na implantação',
            displayOrder: 5,
        },
        {
            name: 'Capacita Moda',
            description: 'Cursos e treinamentos para o setor de moda e confecção. Qualifique sua equipe com profissionais reconhecidos no mercado.',
            logoUrl: null,
            website: 'https://capacitamoda.com.br',
            category: PartnerCategory.TRAINING,
            benefits: [
                'Cursos de corte e costura industrial',
                'Treinamentos em controle de qualidade',
                'Workshops de modelagem e estilo',
                'Certificação reconhecida pelo mercado',
                'Cursos in-company personalizados',
            ],
            contactEmail: 'cursos@capacitamoda.com.br',
            discountInfo: '25% de desconto para grupos de 5+ pessoas',
            displayOrder: 6,
        },
    ];

    for (const partner of partnersData) {
        await prisma.partner.upsert({
            where: { id: partner.name.toLowerCase().replace(/\s+/g, '-') },
            update: {},
            create: {
                id: partner.name.toLowerCase().replace(/\s+/g, '-'),
                ...partner,
            },
        });
        console.log('✅ Partner:', partner.name);
    }

    // ==================== EDUCATIONAL CONTENT ====================
    console.log('\n');
    const educationalContentData = [
        {
            title: 'Como usar o Texlink',
            description: 'Aprenda a navegar pela plataforma Texlink e descubra todas as funcionalidades disponíveis para sua facção. Este tutorial completo mostra desde o login até o gerenciamento de pedidos.',
            contentType: EducationalContentType.VIDEO,
            contentUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
            category: EducationalContentCategory.TUTORIAL_SISTEMA,
            duration: '12:45',
            displayOrder: 0,
        },
        {
            title: 'Gerenciando seus pedidos',
            description: 'Veja como aceitar, recusar e acompanhar o status dos seus pedidos. Aprenda a usar o Kanban para organizar sua produção de forma eficiente.',
            contentType: EducationalContentType.VIDEO,
            contentUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
            category: EducationalContentCategory.TUTORIAL_SISTEMA,
            duration: '8:30',
            displayOrder: 1,
        },
        {
            title: 'Boas práticas de produção têxtil',
            description: 'Conheça as melhores práticas para otimizar sua linha de produção, reduzir desperdícios e aumentar a qualidade dos seus produtos.',
            contentType: EducationalContentType.ARTICLE,
            contentUrl: 'https://example.com/artigo-boas-praticas',
            category: EducationalContentCategory.BOAS_PRATICAS,
            displayOrder: 2,
        },
        {
            title: 'Guia de Compliance ABVTEX',
            description: 'Documento completo sobre as exigências do programa ABVTEX. Saiba quais documentos são necessários e como manter sua empresa em conformidade.',
            contentType: EducationalContentType.DOCUMENT,
            contentUrl: 'https://example.com/guia-abvtex.pdf',
            category: EducationalContentCategory.COMPLIANCE,
            displayOrder: 3,
        },
        {
            title: 'Checklist de documentos obrigatórios',
            description: 'Lista completa de todos os documentos fiscais e de compliance que sua facção precisa manter atualizados para operar na plataforma.',
            contentType: EducationalContentType.DOCUMENT,
            contentUrl: 'https://example.com/checklist-documentos.pdf',
            category: EducationalContentCategory.COMPLIANCE,
            displayOrder: 4,
        },
        {
            title: 'Controle de qualidade na confecção',
            description: 'Aprenda técnicas de controle de qualidade para garantir que seus produtos atendam aos padrões exigidos pelas marcas parceiras.',
            contentType: EducationalContentType.VIDEO,
            contentUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
            category: EducationalContentCategory.QUALIDADE,
            duration: '15:20',
            displayOrder: 5,
        },
        {
            title: 'Gestão financeira para facções',
            description: 'Dicas práticas para organizar suas finanças, calcular custos de produção e precificar seus serviços corretamente.',
            contentType: EducationalContentType.ARTICLE,
            contentUrl: 'https://example.com/artigo-financeiro',
            category: EducationalContentCategory.FINANCEIRO,
            displayOrder: 6,
        },
        {
            title: 'Otimizando sua linha de produção',
            description: 'Técnicas de lean manufacturing aplicadas à confecção. Reduza tempos de setup e aumente sua capacidade produtiva.',
            contentType: EducationalContentType.VIDEO,
            contentUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
            category: EducationalContentCategory.PRODUCAO,
            duration: '18:00',
            displayOrder: 7,
        },
        {
            title: 'Novidades da plataforma - Janeiro 2026',
            description: 'Confira as últimas atualizações do Texlink: novo módulo de documentos, parceiros exclusivos e melhorias no gerenciamento de pedidos.',
            contentType: EducationalContentType.ARTICLE,
            contentUrl: 'https://example.com/novidades-janeiro',
            category: EducationalContentCategory.NOVIDADES,
            displayOrder: 8,
        },
        {
            title: 'Infográfico: Fluxo de um pedido',
            description: 'Visualize de forma clara todas as etapas de um pedido, desde o lançamento pela marca até a finalização e pagamento.',
            contentType: EducationalContentType.IMAGE,
            contentUrl: 'https://example.com/infografico-fluxo.png',
            thumbnailUrl: 'https://example.com/infografico-fluxo-thumb.png',
            category: EducationalContentCategory.TUTORIAL_SISTEMA,
            displayOrder: 9,
        },
    ];

    for (const content of educationalContentData) {
        await prisma.educationalContent.upsert({
            where: { id: content.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') },
            update: {},
            create: {
                id: content.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
                ...content,
            },
        });
        console.log('✅ Educational Content:', content.title);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Login credentials (all passwords: 123456):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('ADMIN:    admin@texlink.com / admin123');
    console.log('');
    console.log('MARCAS:');
    brandsData.forEach(b => console.log(`  ${b.email}`));
    console.log('');
    console.log('FACÇÕES:');
    suppliersData.forEach(s => console.log(`  ${s.email}`));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
    .catch((e) => {
        console.error('❌ Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
