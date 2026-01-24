/**
 * Mock Data for Demo/Prototype Mode
 * Dados realistas para demonstração do protótipo
 */

// =============================================================================
// USERS
// =============================================================================

export const MOCK_USERS = {
    brand: {
        id: 'demo-brand-001',
        email: 'demo-brand@texlink.com',
        name: 'Maria Santos',
        role: 'BRAND',
        isActive: true,
        password: 'demo123',
        companyUsers: [{
            role: 'OWNER',
            companyRole: 'ADMIN',
            isCompanyAdmin: true,
            company: {
                id: 'company-brand-001',
                tradeName: 'Fashion Style Ltda',
                type: 'BRAND',
                status: 'APPROVED'
            }
        }]
    },
    supplier: {
        id: 'demo-supplier-001',
        email: 'demo-supplier@texlink.com',
        name: 'João Silva',
        role: 'SUPPLIER',
        isActive: true,
        password: 'demo123',
        companyUsers: [{
            role: 'OWNER',
            companyRole: 'ADMIN',
            isCompanyAdmin: true,
            company: {
                id: 'company-supplier-001',
                tradeName: 'Confecções Silva',
                type: 'SUPPLIER',
                status: 'APPROVED'
            }
        }]
    },
    admin: {
        id: 'demo-admin-001',
        email: 'demo-admin@texlink.com',
        name: 'Admin Texlink',
        role: 'ADMIN',
        isActive: true,
        password: 'demo123',
        companyUsers: []
    }
};

// =============================================================================
// SUPPLIERS (FACÇÕES)
// =============================================================================

export const MOCK_SUPPLIERS = [
    {
        id: 'supplier-001',
        tradeName: 'Confecções Silva',
        legalName: 'Confecções Silva Ltda',
        cnpj: '12.345.678/0001-90',
        city: 'São Paulo',
        state: 'SP',
        email: 'contato@silvaconfeccoes.com.br',
        phone: '(11) 98765-4321',
        avgRating: 4.8,
        completedOrders: 156,
        onTimeDeliveryRate: 98,
        productTypes: ['Camisetas', 'Moletons', 'Jaquetas'],
        specialties: ['Silk', 'Bordado', 'Sublimação'],
        monthlyCapacity: 5000,
        currentOccupancy: 68,
        status: 'APPROVED',
        minOrderQuantity: 50,
        avgLeadTime: 10,
        profile: {
            description: 'Facção especializada em malhas com mais de 15 anos de experiência.',
            equipment: ['20 Máquinas de costura', '5 Overlocks', '2 Máquinas de bordado'],
            certifications: ['ISO 9001', 'ABVTEX'],
            photos: []
        }
    },
    {
        id: 'supplier-002',
        tradeName: 'Têxtil Premium',
        legalName: 'Têxtil Premium SA',
        cnpj: '23.456.789/0001-01',
        city: 'Blumenau',
        state: 'SC',
        email: 'contato@textilpremium.com.br',
        phone: '(47) 99876-5432',
        avgRating: 4.9,
        completedOrders: 234,
        onTimeDeliveryRate: 99,
        productTypes: ['Vestidos', 'Blusas', 'Saias'],
        specialties: ['Alta Costura', 'Renda', 'Alfaiataria'],
        monthlyCapacity: 3000,
        currentOccupancy: 45,
        status: 'APPROVED',
        minOrderQuantity: 30,
        avgLeadTime: 14,
        profile: {
            description: 'Especialistas em peças femininas de alta qualidade.',
            equipment: ['15 Máquinas industriais', '3 Máquinas overloque', '1 Mesa de corte automatizada'],
            certifications: ['ISO 14001'],
            photos: []
        }
    },
    {
        id: 'supplier-003',
        tradeName: 'Jeans Master',
        legalName: 'Jeans Master Indústria',
        cnpj: '34.567.890/0001-12',
        city: 'Fortaleza',
        state: 'CE',
        email: 'comercial@jeansmaster.com.br',
        phone: '(85) 98765-1234',
        avgRating: 4.6,
        completedOrders: 89,
        onTimeDeliveryRate: 95,
        productTypes: ['Calças Jeans', 'Shorts', 'Jaquetas Jeans'],
        specialties: ['Lavanderia', 'Destroyed', 'Bordado Laser'],
        monthlyCapacity: 8000,
        currentOccupancy: 72,
        status: 'APPROVED',
        minOrderQuantity: 100,
        avgLeadTime: 12,
        profile: {
            description: 'Maior capacidade em jeanswear do Nordeste.',
            equipment: ['50 Máquinas especializada jeans', 'Lavanderia própria', '3 Máquinas laser'],
            certifications: ['ABVTEX'],
            photos: []
        }
    },
    {
        id: 'supplier-004',
        tradeName: 'Malhas Express',
        legalName: 'Malhas Express Ltda',
        cnpj: '45.678.901/0001-23',
        city: 'Brusque',
        state: 'SC',
        email: 'vendas@malhasexpress.com',
        phone: '(47) 99123-4567',
        avgRating: 4.5,
        completedOrders: 67,
        onTimeDeliveryRate: 92,
        productTypes: ['Camisetas', 'Regatas', 'Pólos'],
        specialties: ['Silk', 'Transfer', 'DTG'],
        monthlyCapacity: 10000,
        currentOccupancy: 55,
        status: 'APPROVED',
        minOrderQuantity: 50,
        avgLeadTime: 7,
        profile: {
            description: 'Foco em alto volume com entrega rápida.',
            equipment: ['30 Máquinas de costura', '10 Overlocks', '5 Máquinas de silk'],
            certifications: [],
            photos: []
        }
    },
    {
        id: 'supplier-005',
        tradeName: 'Fitness Wear Factory',
        legalName: 'FWF Confecções',
        cnpj: '56.789.012/0001-34',
        city: 'Guarulhos',
        state: 'SP',
        email: 'comercial@fwf.com.br',
        phone: '(11) 97654-3210',
        avgRating: 4.7,
        completedOrders: 112,
        onTimeDeliveryRate: 97,
        productTypes: ['Leggings', 'Tops', 'Shorts Fitness'],
        specialties: ['Suplex', 'Dry-Fit', 'Compressão'],
        monthlyCapacity: 6000,
        currentOccupancy: 80,
        status: 'APPROVED',
        minOrderQuantity: 100,
        avgLeadTime: 8,
        profile: {
            description: 'Especialistas em moda fitness e esportiva.',
            equipment: ['25 Máquinas especializadas', 'Corte automatizado'],
            certifications: ['ISO 9001'],
            photos: []
        }
    }
];

// =============================================================================
// ORDERS
// =============================================================================

const today = new Date();
const formatDate = (daysFromNow: number) => {
    const date = new Date(today);
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString();
};

export const MOCK_ORDERS = [
    {
        id: 'order-001',
        displayId: 'TX-20260120-0001',
        brandId: 'company-brand-001',
        supplierId: 'supplier-001',
        status: 'EM_PRODUCAO',
        assignmentType: 'DIRECT',
        productType: 'Camisetas',
        productCategory: 'Malha',
        productName: 'Camiseta Básica Algodão',
        description: 'Camiseta básica em algodão 30.1, cores variadas',
        quantity: 500,
        pricePerUnit: 28.50,
        totalValue: 14250,
        deliveryDeadline: formatDate(10),
        paymentTerms: '30/60',
        materialsProvided: true,
        createdAt: formatDate(-5),
        brand: { id: 'company-brand-001', tradeName: 'Fashion Style Ltda', avgRating: 4.5 },
        supplier: { id: 'supplier-001', tradeName: 'Confecções Silva', avgRating: 4.8 },
        _count: { messages: 3 }
    },
    {
        id: 'order-002',
        displayId: 'TX-20260118-0002',
        brandId: 'company-brand-001',
        supplierId: 'supplier-002',
        status: 'ACEITO_PELA_FACCAO',
        assignmentType: 'DIRECT',
        productType: 'Vestidos',
        productCategory: 'Tecido Plano',
        productName: 'Vestido Midi Crepe',
        description: 'Vestido midi em crepe com forro, modelagem A',
        quantity: 200,
        pricePerUnit: 85.00,
        totalValue: 17000,
        deliveryDeadline: formatDate(15),
        paymentTerms: '30/60/90',
        materialsProvided: false,
        createdAt: formatDate(-8),
        brand: { id: 'company-brand-001', tradeName: 'Fashion Style Ltda', avgRating: 4.5 },
        supplier: { id: 'supplier-002', tradeName: 'Têxtil Premium', avgRating: 4.9 },
        _count: { messages: 5 }
    },
    {
        id: 'order-003',
        displayId: 'TX-20260122-0003',
        brandId: 'company-brand-001',
        supplierId: null,
        status: 'LANCADO_PELA_MARCA',
        assignmentType: 'BIDDING',
        productType: 'Calças Jeans',
        productCategory: 'Jeans',
        productName: 'Calça Skinny Feminina',
        description: 'Calça jeans skinny cintura alta, lavagem escura',
        quantity: 300,
        pricePerUnit: 65.00,
        totalValue: 19500,
        deliveryDeadline: formatDate(20),
        paymentTerms: '30/60',
        materialsProvided: false,
        createdAt: formatDate(-1),
        brand: { id: 'company-brand-001', tradeName: 'Fashion Style Ltda', avgRating: 4.5 },
        supplier: null,
        _count: { messages: 0 }
    },
    {
        id: 'order-004',
        displayId: 'TX-20260115-0004',
        brandId: 'company-brand-001',
        supplierId: 'supplier-001',
        status: 'PRONTO',
        assignmentType: 'DIRECT',
        productType: 'Moletons',
        productCategory: 'Malha',
        productName: 'Moletom Canguru',
        description: 'Moletom canguru com capuz, diversas cores',
        quantity: 150,
        pricePerUnit: 75.00,
        totalValue: 11250,
        deliveryDeadline: formatDate(-2),
        paymentTerms: '30/60',
        materialsProvided: true,
        createdAt: formatDate(-20),
        brand: { id: 'company-brand-001', tradeName: 'Fashion Style Ltda', avgRating: 4.5 },
        supplier: { id: 'supplier-001', tradeName: 'Confecções Silva', avgRating: 4.8 },
        _count: { messages: 8 }
    },
    {
        id: 'order-005',
        displayId: 'TX-20260110-0005',
        brandId: 'company-brand-001',
        supplierId: 'supplier-005',
        status: 'FINALIZADO',
        assignmentType: 'DIRECT',
        productType: 'Leggings',
        productCategory: 'Fitness',
        productName: 'Legging Suplex Premium',
        description: 'Legging em suplex com cós alto',
        quantity: 400,
        pricePerUnit: 45.00,
        totalValue: 18000,
        deliveryDeadline: formatDate(-15),
        paymentTerms: '30/60',
        materialsProvided: false,
        createdAt: formatDate(-30),
        brand: { id: 'company-brand-001', tradeName: 'Fashion Style Ltda', avgRating: 4.5 },
        supplier: { id: 'supplier-005', tradeName: 'Fitness Wear Factory', avgRating: 4.7 },
        _count: { messages: 12 }
    },
    {
        id: 'order-006',
        displayId: 'TX-20260121-0006',
        brandId: 'company-brand-002',
        supplierId: 'supplier-001',
        status: 'LANCADO_PELA_MARCA',
        assignmentType: 'DIRECT',
        productType: 'Camisetas',
        productCategory: 'Malha',
        productName: 'Babylook Feminina',
        description: 'Camiseta babylook em algodão penteado',
        quantity: 800,
        pricePerUnit: 25.00,
        totalValue: 20000,
        deliveryDeadline: formatDate(12),
        paymentTerms: '30',
        materialsProvided: true,
        createdAt: formatDate(-2),
        brand: { id: 'company-brand-002', tradeName: 'TrendWear', avgRating: 4.3 },
        supplier: { id: 'supplier-001', tradeName: 'Confecções Silva', avgRating: 4.8 },
        _count: { messages: 1 }
    },
    {
        id: 'order-007',
        displayId: 'TX-20260119-0007',
        brandId: 'company-brand-003',
        supplierId: 'supplier-001',
        status: 'EM_TRANSITO_PARA_FACCAO',
        assignmentType: 'DIRECT',
        productType: 'Jaquetas',
        productCategory: 'Malha',
        productName: 'Jaqueta Bomber',
        description: 'Jaqueta bomber em moletom com zíper',
        quantity: 100,
        pricePerUnit: 120.00,
        totalValue: 12000,
        deliveryDeadline: formatDate(18),
        paymentTerms: '30/60',
        materialsProvided: false,
        createdAt: formatDate(-4),
        brand: { id: 'company-brand-003', tradeName: 'Urban Style', avgRating: 4.6 },
        supplier: { id: 'supplier-001', tradeName: 'Confecções Silva', avgRating: 4.8 },
        _count: { messages: 2 }
    },
    {
        id: 'order-008',
        displayId: 'TX-20260117-0008',
        brandId: 'company-brand-001',
        supplierId: 'supplier-004',
        status: 'EM_PREPARACAO_SAIDA_MARCA',
        assignmentType: 'DIRECT',
        productType: 'Pólos',
        productCategory: 'Malha',
        productName: 'Polo Piquet',
        description: 'Camisa polo em piquet com bordado',
        quantity: 250,
        pricePerUnit: 42.00,
        totalValue: 10500,
        deliveryDeadline: formatDate(8),
        paymentTerms: '30',
        materialsProvided: true,
        createdAt: formatDate(-6),
        brand: { id: 'company-brand-001', tradeName: 'Fashion Style Ltda', avgRating: 4.5 },
        supplier: { id: 'supplier-004', tradeName: 'Malhas Express', avgRating: 4.5 },
        _count: { messages: 4 }
    }
];

// =============================================================================
// DASHBOARD DATA
// =============================================================================

export const MOCK_BRAND_DASHBOARD = {
    stats: {
        activeOrders: 6,
        pendingBids: 1,
        pendingPayments: 2,
        completedThisMonth: 3
    },
    totalSpent: 125000,
    averageLeadTime: 12,
    recentActivity: [
        { id: '1', type: 'order_status', message: 'Pedido TX-20260120-0001 entrou em produção', date: formatDate(-1) },
        { id: '2', type: 'bid_received', message: '2 novas propostas para TX-20260122-0003', date: formatDate(-1) },
        { id: '3', type: 'order_completed', message: 'Pedido TX-20260110-0005 finalizado', date: formatDate(-5) }
    ]
};

export const MOCK_SUPPLIER_DASHBOARD = {
    company: {
        id: 'company-supplier-001',
        tradeName: 'Confecções Silva',
        avgRating: 4.8,
        status: 'APPROVED'
    },
    profile: {
        onboardingPhase: 3,
        onboardingComplete: true,
        monthlyCapacity: 5000,
        currentOccupancy: 68
    },
    stats: {
        pendingOrders: 2,
        activeOrders: 3,
        completedOrdersThisMonth: 8,
        totalRevenue: 95000,
        capacityUsage: 68
    }
};

export const MOCK_ADMIN_DASHBOARD = {
    totalBrands: 15,
    totalSuppliers: 38,
    pendingApprovals: 3,
    activeOrders: 45,
    totalVolume: 1250000,
    newThisMonth: { brands: 2, suppliers: 5 }
};

// =============================================================================
// OPPORTUNITIES (for suppliers in bidding)
// =============================================================================

export const MOCK_OPPORTUNITIES = [
    {
        id: 'opp-001',
        orderId: 'order-003',
        displayId: 'TX-20260122-0003',
        brand: { tradeName: 'Fashion Style Ltda', avgRating: 4.5 },
        productType: 'Calças Jeans',
        productName: 'Calça Skinny Feminina',
        quantity: 300,
        deadline: formatDate(20),
        estimatedValue: 19500,
        bidsCount: 2,
        createdAt: formatDate(-1)
    },
    {
        id: 'opp-002',
        orderId: 'order-new-001',
        displayId: 'TX-20260123-0010',
        brand: { tradeName: 'ModaCerta', avgRating: 4.2 },
        productType: 'Camisetas',
        productName: 'Camiseta Oversized Unissex',
        quantity: 1000,
        deadline: formatDate(14),
        estimatedValue: 32000,
        bidsCount: 4,
        createdAt: formatDate(0)
    },
    {
        id: 'opp-003',
        orderId: 'order-new-002',
        displayId: 'TX-20260122-0011',
        brand: { tradeName: 'StyleCo', avgRating: 4.7 },
        productType: 'Moletons',
        productName: 'Moletom Careca Básico',
        quantity: 200,
        deadline: formatDate(18),
        estimatedValue: 14000,
        bidsCount: 1,
        createdAt: formatDate(-1)
    }
];

// =============================================================================
// FINANCIAL DATA
// =============================================================================

export const MOCK_DEPOSITS = [
    {
        id: 'dep-001',
        referenceNumber: 'DEP-2026010001',
        amount: 28500,
        status: 'COMPLETED',
        paymentDate: formatDate(-10),
        createdAt: formatDate(-12),
        orders: [
            { displayId: 'TX-20260105-0001', value: 14250 },
            { displayId: 'TX-20260103-0002', value: 14250 }
        ]
    },
    {
        id: 'dep-002',
        referenceNumber: 'DEP-2026010002',
        amount: 18000,
        status: 'COMPLETED',
        paymentDate: formatDate(-5),
        createdAt: formatDate(-7),
        orders: [
            { displayId: 'TX-20260110-0005', value: 18000 }
        ]
    },
    {
        id: 'dep-003',
        referenceNumber: 'DEP-2026010003',
        amount: 11250,
        status: 'PENDING',
        paymentDate: null,
        createdAt: formatDate(-1),
        orders: [
            { displayId: 'TX-20260115-0004', value: 11250 }
        ]
    }
];

export const MOCK_PAYMENTS_BRAND = [
    {
        id: 'pay-001',
        orderId: 'order-005',
        displayId: 'TX-20260110-0005',
        supplier: 'Fitness Wear Factory',
        amount: 18000,
        status: 'PAID',
        dueDate: formatDate(-10),
        paidAt: formatDate(-10)
    },
    {
        id: 'pay-002',
        orderId: 'order-004',
        displayId: 'TX-20260115-0004',
        supplier: 'Confecções Silva',
        amount: 11250,
        status: 'PENDING',
        dueDate: formatDate(5),
        paidAt: null
    },
    {
        id: 'pay-003',
        orderId: 'order-001',
        displayId: 'TX-20260120-0001',
        supplier: 'Confecções Silva',
        amount: 14250,
        status: 'SCHEDULED',
        dueDate: formatDate(20),
        paidAt: null
    }
];

// =============================================================================
// MESSAGES/CHAT
// =============================================================================

export const MOCK_MESSAGES = {
    'order-001': [
        { id: 'msg-001', senderId: 'demo-brand-001', senderName: 'Maria Santos', content: 'Olá, podemos confirmar os detalhes do pedido?', createdAt: formatDate(-4), isOwn: true },
        { id: 'msg-002', senderId: 'demo-supplier-001', senderName: 'João Silva', content: 'Claro! Vou verificar o estoque de malha e já confirmo.', createdAt: formatDate(-4), isOwn: false },
        { id: 'msg-003', senderId: 'demo-supplier-001', senderName: 'João Silva', content: 'Confirmado! Temos capacidade para iniciar amanhã.', createdAt: formatDate(-3), isOwn: false }
    ],
    'order-002': [
        { id: 'msg-004', senderId: 'demo-brand-001', senderName: 'Maria Santos', content: 'Qual a previsão para início da produção?', createdAt: formatDate(-7), isOwn: true },
        { id: 'msg-005', senderId: 'demo-supplier-002', senderName: 'Ana Têxtil', content: 'Iniciaremos na segunda-feira, assim que recebermos os tecidos.', createdAt: formatDate(-7), isOwn: false }
    ]
};

// =============================================================================
// ADMIN DATA
// =============================================================================

export const MOCK_PENDING_APPROVALS = [
    {
        id: 'approval-001',
        type: 'SUPPLIER',
        company: {
            tradeName: 'Nova Confecção ABC',
            legalName: 'ABC Confecções Ltda',
            cnpj: '11.222.333/0001-44',
            city: 'Maringá',
            state: 'PR'
        },
        submittedAt: formatDate(-2),
        documents: ['Contrato Social', 'CNPJ', 'Alvará']
    },
    {
        id: 'approval-002',
        type: 'SUPPLIER',
        company: {
            tradeName: 'Costuras Precisa',
            legalName: 'Costuras Precisa ME',
            cnpj: '22.333.444/0001-55',
            city: 'Cianorte',
            state: 'PR'
        },
        submittedAt: formatDate(-3),
        documents: ['Contrato Social', 'CNPJ']
    },
    {
        id: 'approval-003',
        type: 'BRAND',
        company: {
            tradeName: 'Fresh Wear',
            legalName: 'Fresh Wear Moda SA',
            cnpj: '33.444.555/0001-66',
            city: 'São Paulo',
            state: 'SP'
        },
        submittedAt: formatDate(-1),
        documents: ['Contrato Social', 'CNPJ', 'Declaração']
    }
];

// =============================================================================
// REPORTS DATA
// =============================================================================

export const MOCK_REPORT_DATA = {
    chartData: [
        { month: 'Ago', value: 85000, orders: 12 },
        { month: 'Set', value: 92000, orders: 14 },
        { month: 'Out', value: 78000, orders: 10 },
        { month: 'Nov', value: 110000, orders: 16 },
        { month: 'Dez', value: 125000, orders: 18 },
        { month: 'Jan', value: 95000, orders: 14 }
    ],
    byProductType: [
        { name: 'Camisetas', value: 45000, percentage: 35 },
        { name: 'Vestidos', value: 32000, percentage: 25 },
        { name: 'Calças', value: 26000, percentage: 20 },
        { name: 'Moletons', value: 16000, percentage: 12 },
        { name: 'Outros', value: 10000, percentage: 8 }
    ],
    bySupplier: [
        { name: 'Confecções Silva', orders: 25, value: 42000, rating: 4.8 },
        { name: 'Têxtil Premium', orders: 18, value: 35000, rating: 4.9 },
        { name: 'Fitness Wear Factory', orders: 15, value: 28000, rating: 4.7 },
        { name: 'Malhas Express', orders: 12, value: 18000, rating: 4.5 }
    ]
};

// =============================================================================
// FAVORITES & TEMPLATES
// =============================================================================

export const MOCK_PRODUCT_TEMPLATES = [
    {
        id: 'template-001',
        companyId: 'company-brand-001',
        name: 'Camiseta Básica Algodão',
        productType: 'Camiseta',
        productCategory: 'Básico',
        productName: 'Camiseta Básica',
        description: 'Camiseta 100% algodão, meia malha, 160g',
        materialsProvided: false,
        defaultPrice: 18.50,
        observations: '',
        isActive: true,
        createdAt: formatDate(-30),
        updatedAt: formatDate(-30),
    },
    {
        id: 'template-002',
        companyId: 'company-brand-001',
        name: 'Calça Jeans Skinny',
        productType: 'Calça Jeans',
        productCategory: 'Feminino',
        productName: 'Calça Skinny',
        description: 'Calça jeans skinny, elastano 2%',
        materialsProvided: true,
        defaultPrice: 55.00,
        observations: 'Lavagem escura padrão',
        isActive: true,
        createdAt: formatDate(-20),
        updatedAt: formatDate(-20),
    },
    {
        id: 'template-003',
        companyId: 'company-brand-001',
        name: 'Moletom Canguru',
        productType: 'Moletom',
        productCategory: 'Casual',
        productName: 'Moletom Canguru com Capuz',
        description: 'Moletom canguru com capuz e bolso frontal, 100% algodão felpado',
        materialsProvided: true,
        defaultPrice: 75.00,
        observations: '',
        isActive: true,
        createdAt: formatDate(-10),
        updatedAt: formatDate(-10),
    },
];

export const MOCK_FAVORITE_SUPPLIERS = [
    {
        id: 'fav-001',
        companyId: 'company-brand-001',
        supplierId: 'supplier-001',
        notes: 'Excelente qualidade em malhas',
        priority: 1,
        createdAt: formatDate(-60),
        supplier: {
            id: 'supplier-001',
            tradeName: 'Confecções Silva',
            avgRating: 4.8,
            city: 'São Paulo',
            state: 'SP',
            supplierProfile: {
                productTypes: ['Camisetas', 'Moletons', 'Jaquetas'],
                monthlyCapacity: 5000,
            },
        },
    },
    {
        id: 'fav-002',
        companyId: 'company-brand-001',
        supplierId: 'supplier-002',
        notes: 'Especialista em peças femininas',
        priority: 2,
        createdAt: formatDate(-45),
        supplier: {
            id: 'supplier-002',
            tradeName: 'Têxtil Premium',
            avgRating: 4.9,
            city: 'Blumenau',
            state: 'SC',
            supplierProfile: {
                productTypes: ['Vestidos', 'Blusas', 'Saias'],
                monthlyCapacity: 3000,
            },
        },
    },
];

export const MOCK_PAYMENT_PRESETS = [
    {
        id: 'preset-001',
        companyId: 'company-brand-001',
        name: 'À Vista',
        terms: 'Pagamento à vista na entrega',
        isDefault: true,
        createdAt: formatDate(-90),
    },
    {
        id: 'preset-002',
        companyId: 'company-brand-001',
        name: 'Parcelado 30/60',
        terms: '50% em 30 dias, 50% em 60 dias',
        isDefault: false,
        createdAt: formatDate(-90),
    },
    {
        id: 'preset-003',
        companyId: 'company-brand-001',
        name: 'Parcelado 30/60/90',
        terms: '33% em 30 dias, 33% em 60 dias, 34% em 90 dias',
        isDefault: false,
        createdAt: formatDate(-90),
    },
    {
        id: 'preset-004',
        companyId: 'company-brand-001',
        name: 'Entrada + Entrega',
        terms: '50% de entrada na aprovação, 50% na entrega',
        isDefault: false,
        createdAt: formatDate(-90),
    },
];
