import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Demo accounts to preserve
const DEMO_EMAILS = [
    'admin@texlink.com',
    'demo-admin@texlink.com',
    'demo-brand@texlink.com',
    'demo-supplier@texlink.com',
];

const DEMO_DOCUMENTS = [
    '00000000000100', // Demo Brand CNPJ
    '00000000000199', // Demo Supplier CNPJ
];

async function main() {
    console.log('=== TEXLINK DATABASE CLEANUP ===\n');
    console.log('This will remove ALL transactional data while keeping demo accounts.\n');

    // Get demo user IDs
    const demoUsers = await prisma.user.findMany({
        where: { email: { in: DEMO_EMAILS } },
        select: { id: true, email: true },
    });
    const demoUserIds = demoUsers.map((u) => u.id);
    console.log(`Found ${demoUsers.length} demo users to preserve:`);
    demoUsers.forEach((u) => console.log(`  - ${u.email}`));

    // Get demo company IDs
    const demoCompanies = await prisma.company.findMany({
        where: { document: { in: DEMO_DOCUMENTS } },
        select: { id: true, tradeName: true },
    });
    const demoCompanyIds = demoCompanies.map((c) => c.id);
    console.log(`\nFound ${demoCompanies.length} demo companies to preserve:`);
    demoCompanies.forEach((c) => console.log(`  - ${c.tradeName}`));

    console.log('\nStarting cleanup...\n');

    await prisma.$transaction(async (tx) => {
        // ====== Layer 1: Deepest leaf tables (no dependents) ======
        const reviewRejectedItems = await tx.reviewRejectedItem.deleteMany({});
        console.log(`  Deleted ${reviewRejectedItems.count} ReviewRejectedItem`);

        const secondQualityItems = await tx.secondQualityItem.deleteMany({});
        console.log(`  Deleted ${secondQualityItems.count} SecondQualityItem`);

        const orderReviews = await tx.orderReview.deleteMany({});
        console.log(`  Deleted ${orderReviews.count} OrderReview`);

        const orderAttachments = await tx.orderAttachment.deleteMany({});
        console.log(`  Deleted ${orderAttachments.count} OrderAttachment`);

        const orderStatusHistory = await tx.orderStatusHistory.deleteMany({});
        console.log(`  Deleted ${orderStatusHistory.count} OrderStatusHistory`);

        const orderTargetSuppliers = await tx.orderTargetSupplier.deleteMany({});
        console.log(`  Deleted ${orderTargetSuppliers.count} OrderTargetSupplier`);

        const messages = await tx.message.deleteMany({});
        console.log(`  Deleted ${messages.count} Message`);

        const payments = await tx.payment.deleteMany({});
        console.log(`  Deleted ${payments.count} Payment`);

        const ratings = await tx.rating.deleteMany({});
        console.log(`  Deleted ${ratings.count} Rating`);

        const notifications = await tx.notification.deleteMany({});
        console.log(`  Deleted ${notifications.count} Notification`);

        const adminActions = await tx.adminAction.deleteMany({});
        console.log(`  Deleted ${adminActions.count} AdminAction`);

        // ====== Layer 2: Support tickets ======
        const ticketMessages = await tx.supportTicketMessage.deleteMany({});
        console.log(`  Deleted ${ticketMessages.count} SupportTicketMessage`);

        const ticketStatusHistory = await tx.supportTicketStatusHistory.deleteMany({});
        console.log(`  Deleted ${ticketStatusHistory.count} SupportTicketStatusHistory`);

        const supportTickets = await tx.supportTicket.deleteMany({});
        console.log(`  Deleted ${supportTickets.count} SupportTicket`);

        // ====== Layer 3: Orders ======
        const orders = await tx.order.deleteMany({});
        console.log(`  Deleted ${orders.count} Order`);

        // ====== Layer 4: Contracts & Relationships ======
        const contractRevisions = await tx.contractRevision.deleteMany({});
        console.log(`  Deleted ${contractRevisions.count} ContractRevision`);

        const supplierContracts = await tx.supplierContract.deleteMany({});
        console.log(`  Deleted ${supplierContracts.count} SupplierContract`);

        const brandDocAcceptances = await tx.brandDocumentAcceptance.deleteMany({});
        console.log(`  Deleted ${brandDocAcceptances.count} BrandDocumentAcceptance`);

        const brandDocVersions = await tx.brandDocumentVersion.deleteMany({});
        console.log(`  Deleted ${brandDocVersions.count} BrandDocumentVersion`);

        const brandDocuments = await tx.brandDocument.deleteMany({});
        console.log(`  Deleted ${brandDocuments.count} BrandDocument`);

        const brandSpecificDocs = await tx.brandSpecificDocument.deleteMany({});
        console.log(`  Deleted ${brandSpecificDocs.count} BrandSpecificDocument`);

        const relationshipHistory = await tx.relationshipStatusHistory.deleteMany({});
        console.log(`  Deleted ${relationshipHistory.count} RelationshipStatusHistory`);

        const partnershipRequests = await tx.partnershipRequest.deleteMany({});
        console.log(`  Deleted ${partnershipRequests.count} PartnershipRequest`);

        const relationships = await tx.supplierBrandRelationship.deleteMany({});
        console.log(`  Deleted ${relationships.count} SupplierBrandRelationship`);

        // ====== Layer 5: Credential system ======
        const onboardingDocs = await tx.onboardingDocument.deleteMany({});
        console.log(`  Deleted ${onboardingDocs.count} OnboardingDocument`);

        const credentialInvitations = await tx.credentialInvitation.deleteMany({});
        console.log(`  Deleted ${credentialInvitations.count} CredentialInvitation`);

        const complianceAnalyses = await tx.complianceAnalysis.deleteMany({});
        console.log(`  Deleted ${complianceAnalyses.count} ComplianceAnalysis`);

        const credentialValidations = await tx.credentialValidation.deleteMany({});
        console.log(`  Deleted ${credentialValidations.count} CredentialValidation`);

        const credentialStatusHistory = await tx.credentialStatusHistory.deleteMany({});
        console.log(`  Deleted ${credentialStatusHistory.count} CredentialStatusHistory`);

        const supplierOnboardings = await tx.supplierOnboarding.deleteMany({});
        console.log(`  Deleted ${supplierOnboardings.count} SupplierOnboarding`);

        const supplierCredentials = await tx.supplierCredential.deleteMany({});
        console.log(`  Deleted ${supplierCredentials.count} SupplierCredential`);

        // ====== Layer 6: Company-level data ======
        const supplierDocuments = await tx.supplierDocument.deleteMany({});
        console.log(`  Deleted ${supplierDocuments.count} SupplierDocument`);

        const documents = await tx.document.deleteMany({});
        console.log(`  Deleted ${documents.count} Document`);

        const invitations = await tx.invitation.deleteMany({});
        console.log(`  Deleted ${invitations.count} Invitation`);

        const productTemplates = await tx.productTemplate.deleteMany({});
        console.log(`  Deleted ${productTemplates.count} ProductTemplate`);

        const favoriteSuppliers = await tx.favoriteSupplier.deleteMany({});
        console.log(`  Deleted ${favoriteSuppliers.count} FavoriteSupplier`);

        const paymentTermsPresets = await tx.paymentTermsPreset.deleteMany({});
        console.log(`  Deleted ${paymentTermsPresets.count} PaymentTermsPreset`);

        const invitationTemplates = await tx.invitationTemplate.deleteMany({});
        console.log(`  Deleted ${invitationTemplates.count} InvitationTemplate`);

        const contractTemplates = await tx.contractTemplate.deleteMany({});
        console.log(`  Deleted ${contractTemplates.count} ContractTemplate`);

        const credentialSettings = await tx.credentialSettings.deleteMany({});
        console.log(`  Deleted ${credentialSettings.count} CredentialSettings`);

        const bankAccounts = await tx.bankAccount.deleteMany({});
        console.log(`  Deleted ${bankAccounts.count} BankAccount`);

        const notificationSettings = await tx.notificationSettings.deleteMany({});
        console.log(`  Deleted ${notificationSettings.count} NotificationSettings`);

        const suggestions = await tx.suggestion.deleteMany({});
        console.log(`  Deleted ${suggestions.count} Suggestion`);

        const passwordResets = await tx.passwordReset.deleteMany({});
        console.log(`  Deleted ${passwordResets.count} PasswordReset`);

        // ====== Layer 7: Profiles (keep demo supplier profile) ======
        const supplierProfiles = await tx.supplierProfile.deleteMany({
            where: { companyId: { notIn: demoCompanyIds } },
        });
        console.log(`  Deleted ${supplierProfiles.count} SupplierProfile (kept demo)`);

        const brandProfiles = await tx.brandProfile.deleteMany({});
        console.log(`  Deleted ${brandProfiles.count} BrandProfile`);

        // ====== Layer 8: CompanyUser permissions & non-demo CompanyUsers ======
        // First delete permissions for non-demo company users
        const nonDemoCompanyUsers = await tx.companyUser.findMany({
            where: {
                NOT: {
                    AND: [
                        { userId: { in: demoUserIds } },
                        { companyId: { in: demoCompanyIds } },
                    ],
                },
            },
            select: { id: true },
        });
        const nonDemoCompanyUserIds = nonDemoCompanyUsers.map((cu) => cu.id);

        if (nonDemoCompanyUserIds.length > 0) {
            const permissions = await tx.companyUserPermission.deleteMany({
                where: { companyUserId: { in: nonDemoCompanyUserIds } },
            });
            console.log(`  Deleted ${permissions.count} CompanyUserPermission`);
        }

        const companyUsers = await tx.companyUser.deleteMany({
            where: { id: { in: nonDemoCompanyUserIds } },
        });
        console.log(`  Deleted ${companyUsers.count} CompanyUser (kept demo)`);

        // ====== Layer 9: Non-demo Companies ======
        const companies = await tx.company.deleteMany({
            where: { id: { notIn: demoCompanyIds } },
        });
        console.log(`  Deleted ${companies.count} Company (kept demo)`);

        // ====== Layer 10: Non-demo Users ======
        const users = await tx.user.deleteMany({
            where: { id: { notIn: demoUserIds } },
        });
        console.log(`  Deleted ${users.count} User (kept demo)`);

        // ====== Layer 11: Static content (optional - keep educational/partner data) ======
        const educationalContent = await tx.educationalContent.deleteMany({});
        console.log(`  Deleted ${educationalContent.count} EducationalContent`);

        const partners = await tx.partner.deleteMany({});
        console.log(`  Deleted ${partners.count} Partner`);
    }, { timeout: 60000 });

    // Verification
    console.log('\n=== VERIFICATION ===\n');
    const remainingUsers = await prisma.user.findMany({ select: { email: true, role: true } });
    console.log(`Remaining users (${remainingUsers.length}):`);
    remainingUsers.forEach((u) => console.log(`  - ${u.email} (${u.role})`));

    const remainingCompanies = await prisma.company.findMany({ select: { tradeName: true, type: true } });
    console.log(`\nRemaining companies (${remainingCompanies.length}):`);
    remainingCompanies.forEach((c) => console.log(`  - ${c.tradeName} (${c.type})`));

    const remainingOrders = await prisma.order.count();
    const remainingMessages = await prisma.message.count();
    const remainingNotifications = await prisma.notification.count();
    console.log(`\nRemaining orders: ${remainingOrders}`);
    console.log(`Remaining messages: ${remainingMessages}`);
    console.log(`Remaining notifications: ${remainingNotifications}`);

    console.log('\n=== CLEANUP COMPLETE ===\n');
}

main()
    .catch((e) => {
        console.error('Cleanup error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
