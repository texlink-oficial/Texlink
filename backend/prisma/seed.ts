import 'dotenv/config';
import { PrismaClient, UserRole, CompanyType, CompanyStatus, CompanyRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('Seeding database with demo users...\n');

    const demoPassword = await bcrypt.hash('demo123', 10);

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
    console.log('Admin:', admin.email);

    // ==================== DEMO USERS ====================

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
    console.log('Demo Admin:', demoAdmin.email);

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
    console.log('Demo Brand:', demoBrandUser.email);

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
    console.log('Demo Supplier:', demoSupplierUser.email);

    console.log('\nDone! Demo login credentials:');
    console.log('  admin@texlink.com / admin123');
    console.log('  demo-admin@texlink.com / demo123');
    console.log('  demo-brand@texlink.com / demo123');
    console.log('  demo-supplier@texlink.com / demo123');
}

main()
    .catch((e) => {
        console.error('Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
