import 'dotenv/config';
import { PrismaClient, UserRole, OrderStatus, OrderAssignmentType, CompanyType, CompanyStatus, CompanyRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    console.log('🌱 Creating demo users and orders for chat testing...\n');

    const password = await bcrypt.hash('demo123', 10);

    // Create demo brand user
    const brandUser = await prisma.user.upsert({
        where: { id: 'demo-brand-001' },
        update: {},
        create: {
            id: 'demo-brand-001',
            email: 'demo-brand@texlink.com',
            passwordHash: password,
            name: 'Maria Santos',
            role: UserRole.BRAND,
            isActive: true,
        },
    });

    // Create demo brand company
    const brandCompany = await prisma.company.upsert({
        where: { id: 'company-brand-001' },
        update: {},
        create: {
            id: 'company-brand-001',
            legalName: 'Fashion Style Ltda',
            tradeName: 'Fashion Style Ltda',
            document: '99999998000199',
            city: 'São Paulo',
            state: 'SP',
            type: CompanyType.BRAND,
            status: CompanyStatus.ACTIVE,
        },
    });

    await prisma.companyUser.upsert({
        where: { userId_companyId: { userId: brandUser.id, companyId: brandCompany.id } },
        update: {},
        create: { userId: brandUser.id, companyId: brandCompany.id, role: 'OWNER', companyRole: CompanyRole.ADMIN, isCompanyAdmin: true },
    });

    console.log('✅ Demo Brand: demo-brand@texlink.com / demo123');

    // Create demo supplier user
    const supplierUser = await prisma.user.upsert({
        where: { id: 'demo-supplier-001' },
        update: {},
        create: {
            id: 'demo-supplier-001',
            email: 'demo-supplier@texlink.com',
            passwordHash: password,
            name: 'João Silva',
            role: UserRole.SUPPLIER,
            isActive: true,
        },
    });

    // Create demo supplier company
    const supplierCompany = await prisma.company.upsert({
        where: { id: 'company-supplier-001' },
        update: {},
        create: {
            id: 'company-supplier-001',
            legalName: 'Confecções Silva Ltda',
            tradeName: 'Confecções Silva',
            document: '99999999000199',
            city: 'Blumenau',
            state: 'SC',
            type: CompanyType.SUPPLIER,
            status: CompanyStatus.ACTIVE,
            avgRating: 4.8,
        },
    });

    await prisma.companyUser.upsert({
        where: { userId_companyId: { userId: supplierUser.id, companyId: supplierCompany.id } },
        update: {},
        create: { userId: supplierUser.id, companyId: supplierCompany.id, role: 'OWNER', companyRole: CompanyRole.ADMIN, isCompanyAdmin: true },
    });

    await prisma.supplierProfile.upsert({
        where: { companyId: supplierCompany.id },
        update: {},
        create: {
            companyId: supplierCompany.id,
            onboardingPhase: 3,
            onboardingComplete: true,
            productTypes: ['Camisetas', 'Moletons'],
            dailyCapacity: 5000,
            currentOccupancy: 60,
        },
    });

    console.log('✅ Demo Supplier: demo-supplier@texlink.com / demo123');

    // Create test order
    const order = await prisma.order.upsert({
        where: { id: 'order-001' },
        update: {},
        create: {
            id: 'order-001',
            displayId: 'TX-20260120-0001',
            brandId: brandCompany.id,
            supplierId: supplierCompany.id,
            status: OrderStatus.EM_PRODUCAO,
            assignmentType: OrderAssignmentType.DIRECT,
            productType: 'Camisetas',
            productName: 'Camiseta Básica Algodão',
            quantity: 500,
            pricePerUnit: 28.50,
            totalValue: 14250,
            deliveryDeadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
            materialsProvided: true,
        },
    });

    console.log('✅ Order created: TX-20260120-0001');

    // Create sample messages
    await prisma.message.deleteMany({ where: { orderId: order.id } });
    await prisma.message.createMany({
        data: [
            { orderId: order.id, senderId: brandUser.id, type: 'TEXT', content: 'Olá! Gostaria de confirmar os detalhes do pedido.' },
            { orderId: order.id, senderId: supplierUser.id, type: 'TEXT', content: 'Claro! Estamos prontos para iniciar.' },
        ],
    });

    console.log('✅ Sample messages created');
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Done! You can now test the chat:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('MARCA:   demo-brand@texlink.com / demo123');
    console.log('FACÇÃO:  demo-supplier@texlink.com / demo123');
    console.log('PEDIDO:  TX-20260120-0001');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await prisma.$disconnect();
    await pool.end();
}

main().catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
});
