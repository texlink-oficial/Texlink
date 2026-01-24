import 'dotenv/config';
import { PrismaClient, UserRole, CompanyType, CompanyStatus, OrderStatus, OrderAssignmentType, CompanyRole } from '@prisma/client';
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

        const order = await prisma.order.create({
            data: {
                displayId: `TX-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(i + 1).padStart(4, '0')}`,
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
