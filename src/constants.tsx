import { Order, OrderStatus, WorkshopProfile } from './types';

export const WORKSHOP_PROFILE: WorkshopProfile = {
  name: "Oficina da Maria",
  rating: 4.8,
  isActive: true,
  activeOrders: 19,
  completedOrdersThisMonth: 52,
  capacityUsage: 85 // New capacity data
};

export const MOCK_ORDERS: Order[] = [
  // --- EXISTING ORDERS ---
  {
    id: '1',
    displayId: '#9821',
    brand: {
      id: 'b1',
      name: 'Moda Vanguarda',
      rating: 4.9,
      location: 'São Paulo, SP',
      image: 'https://picsum.photos/40/40?random=1'
    },
    type: 'Adulto',
    productName: 'Calça Jeans Slim',
    quantity: 1200,
    pricePerUnit: 52.00,
    totalValue: 62400,
    deliveryDeadline: '2026-02-15',
    status: OrderStatus.NEW,
    paymentTerms: '50% Entrada + 50% na Entrega',
    paymentStatus: 'pending',
    description: 'Calça jeans modelagem slim, lavagem escura, costura dupla reforçada.',
    materialsProvided: true,
    createdAt: '2026-01-25',
    attachments: [
      { id: 'a1', type: 'pdf', name: 'Ficha_Tecnica_Completa_v2.pdf', url: '#', size: '2.4 MB' },
      { id: 'a2', type: 'video', name: 'Instrucao_Bolso_Traseiro.mp4', url: '#', size: '15 MB' },
      { id: 'a3', type: 'image', name: 'Ref_Lavagem.jpg', url: '#', size: '1.2 MB' }
    ],
    timeline: [
      { step: 'Pedido Criado', date: '25/01 • 09:45', completed: true, icon: 'check' },
      { step: 'Aceite da Facção', completed: false, icon: 'check' },
      { step: 'Recebimento na Facção', completed: false, icon: 'box' },
      { step: 'Em Produção', completed: false, icon: 'scissors' },
      { step: 'Pronto p/ Envio', completed: false, icon: 'box' },
      { step: 'Entrega / Finalização', completed: false, icon: 'truck' },
      { step: 'Avaliação', completed: false, icon: 'check' }
    ]
  },
  {
    id: '2',
    displayId: '#9825',
    brand: {
      id: 'b2',
      name: 'Kids Joy',
      rating: 4.2,
      location: 'Blumenau, SC',
      image: 'https://picsum.photos/40/40?random=2'
    },
    type: 'Infantil',
    productName: 'Conjunto Moletom Dino',
    quantity: 500,
    pricePerUnit: 39.90,
    totalValue: 19950,
    deliveryDeadline: '2026-02-05',
    status: OrderStatus.ACCEPTED,
    paymentTerms: '30/60/90 dias',
    paymentStatus: 'pending',
    description: 'Conjunto infantil (3-8 anos) em moletom felpado. Estampa localizada.',
    observations: 'Negociando prazo de entrega dos insumos.',
    materialsProvided: true,
    createdAt: '2026-01-20',
    attachments: [
      { id: 'a4', type: 'pdf', name: 'Molde_Dino_Escala_1_1.pdf', url: '#', size: '5.1 MB' }
    ],
    timeline: [
      { step: 'Pedido Criado', date: '20/01 • 10:15', completed: true, icon: 'check' },
      { step: 'Aceite da Facção', date: 'Em negociação', completed: false, icon: 'clock' },
      { step: 'Recebimento na Facção', completed: false, icon: 'box' },
      { step: 'Em Produção', completed: false, icon: 'scissors' },
      { step: 'Pronto p/ Envio', completed: false, icon: 'box' },
      { step: 'Entrega / Finalização', completed: false, icon: 'truck' },
      { step: 'Avaliação', completed: false, icon: 'check' }
    ]
  },
  {
    id: '3',
    displayId: '#9780',
    brand: {
      id: 'b3',
      name: 'Urban Style Co.',
      rating: 3.8,
      location: 'Goiânia, GO',
      image: 'https://picsum.photos/40/40?random=3'
    },
    type: 'Adulto',
    productName: 'Camiseta Básica Premium',
    quantity: 2500,
    pricePerUnit: 18.50,
    totalValue: 46250,
    deliveryDeadline: '2026-02-20',
    status: OrderStatus.PREPARING_BRAND,
    waitingReason: 'Aguardando Etiquetas',
    missingItems: ['Etiquetas', 'Embalagem'],
    paymentTerms: 'À vista na retirada',
    paymentStatus: 'pending',
    description: 'Camiseta meia malha penteada 30.1. Acabamento premium na gola.',
    materialsProvided: false,
    createdAt: '2026-01-15',
    attachments: [],
    timeline: [
      { step: 'Pedido Criado', date: '15/01 • 14:00', completed: true, icon: 'check' },
      { step: 'Aceite da Facção', date: '16/01 • 09:30', completed: true, icon: 'check' },
      { step: 'Recebimento na Facção', date: 'Aguardando', completed: false, icon: 'clock' },
      { step: 'Em Produção', completed: false, icon: 'scissors' },
      { step: 'Pronto p/ Envio', completed: false, icon: 'box' },
      { step: 'Entrega / Finalização', completed: false, icon: 'truck' },
      { step: 'Avaliação', completed: false, icon: 'check' }
    ]
  },
  {
    id: '4',
    displayId: '#9755',
    brand: {
      id: 'b1',
      name: 'Moda Vanguarda',
      rating: 4.9,
      location: 'São Paulo, SP',
      image: 'https://picsum.photos/40/40?random=1'
    },
    type: 'Adulto',
    productName: 'Blazer Linho Verão',
    quantity: 300,
    pricePerUnit: 85.00,
    totalValue: 25500,
    deliveryDeadline: '2026-01-30',
    status: OrderStatus.PRODUCTION,
    paymentTerms: '50% Entrada + 50% na Entrega',
    paymentStatus: 'partial',
    description: 'Blazer de linho sem forro, corte alfaiataria desconstruída.',
    materialsProvided: true,
    createdAt: '2026-01-05',
    attachments: [
      { id: 'a5', type: 'video', name: 'Acabamento_Gola_Video.mp4', url: '#', size: '22 MB' },
      { id: 'a6', type: 'pdf', name: 'Spec_Blazer.pdf', url: '#', size: '1.8 MB' }
    ],
    timeline: [
      { step: 'Pedido Criado', date: '05/01 • 08:30', completed: true, icon: 'check' },
      { step: 'Aceite da Facção', date: '05/01 • 16:45', completed: true, icon: 'check' },
      { step: 'Recebimento na Facção', date: '08/01 • 10:00', completed: true, icon: 'box' },
      { step: 'Em Produção', date: '10/01 • 07:30', completed: true, icon: 'scissors' },
      { step: 'Pronto p/ Envio', completed: false, icon: 'box' },
      { step: 'Entrega / Finalização', completed: false, icon: 'truck' },
      { step: 'Avaliação', completed: false, icon: 'check' }
    ]
  },
  {
    id: '5',
    displayId: '#9600',
    brand: {
      id: 'b4',
      name: 'EcoWear',
      rating: 4.5,
      location: 'Rio de Janeiro, RJ',
      image: 'https://picsum.photos/40/40?random=4'
    },
    type: 'Adulto',
    productName: 'Vestido Midi Sustentável',
    quantity: 450,
    pricePerUnit: 60.00,
    totalValue: 27000,
    deliveryDeadline: '2026-01-26',
    status: OrderStatus.READY_SEND,
    paymentTerms: '30 dias',
    paymentStatus: 'pending',
    description: 'Vestido viscose sustentável, botões de coco.',
    materialsProvided: true,
    createdAt: '2025-12-20',
    attachments: [],
    timeline: [
      { step: 'Pedido Criado', date: '20/12 • 15:20', completed: true, icon: 'check' },
      { step: 'Aceite da Facção', date: '21/12 • 09:00', completed: true, icon: 'check' },
      { step: 'Recebimento na Facção', date: '05/01 • 11:30', completed: true, icon: 'box' },
      { step: 'Em Produção', date: '08/01 • 08:00', completed: true, icon: 'scissors' },
      { step: 'Pronto p/ Envio', date: '24/01 • 16:15', completed: true, icon: 'box' },
      { step: 'Entrega / Finalização', completed: false, icon: 'truck' },
      { step: 'Avaliação', completed: false, icon: 'check' }
    ]
  },
  {
    id: '6',
    displayId: '#9210',
    brand: {
      id: 'b2',
      name: 'Kids Joy',
      rating: 4.2,
      location: 'Blumenau, SC',
      image: 'https://picsum.photos/40/40?random=2'
    },
    type: 'Infantil',
    productName: 'Pijamas Verão',
    quantity: 2000,
    pricePerUnit: 25.00,
    totalValue: 50000,
    deliveryDeadline: '2026-01-15',
    status: OrderStatus.FINALIZED,
    paymentTerms: 'Pago',
    paymentStatus: 'paid',
    description: 'Lote de pijamas curtos.',
    materialsProvided: true,
    createdAt: '2025-12-01',
    attachments: [],
    timeline: [
      { step: 'Pedido Criado', date: '01/12 • 10:00', completed: true, icon: 'check' },
      { step: 'Aceite da Facção', date: '02/12 • 14:30', completed: true, icon: 'check' },
      { step: 'Recebimento na Facção', date: '05/12 • 09:15', completed: true, icon: 'box' },
      { step: 'Em Produção', date: '10/12 • 08:00', completed: true, icon: 'scissors' },
      { step: 'Pronto p/ Envio', date: '10/01 • 17:00', completed: true, icon: 'box' },
      { step: 'Entrega / Finalização', date: '15/01 • 11:30', completed: true, icon: 'truck' },
      { step: 'Avaliação', date: '★★★★☆', completed: true, icon: 'check' }
    ]
  },

  // --- NEW ORDERS ADDED FOR FILLING ---
  {
    id: '7',
    displayId: '#9833',
    brand: {
      id: 'b3',
      name: 'Urban Style Co.',
      rating: 3.8,
      location: 'Goiânia, GO',
      image: 'https://picsum.photos/40/40?random=3'
    },
    type: 'Adulto',
    productName: 'Shorts Sarja Cargo',
    quantity: 800,
    pricePerUnit: 45.00,
    totalValue: 36000,
    deliveryDeadline: '2026-02-28',
    status: OrderStatus.NEW,
    paymentTerms: '50% Entrada',
    paymentStatus: 'pending',
    description: 'Shorts cargo em sarja 100% algodão, múltiplos bolsos.',
    materialsProvided: true,
    createdAt: '2026-01-24',
    attachments: [{ id: 'a7', type: 'image', name: 'Ref_Shorts.jpg', url: '#', size: '1.5 MB' }],
    timeline: [
      { step: 'Pedido Criado', date: '24/01 • 11:20', completed: true, icon: 'check' },
      { step: 'Aceite da Facção', completed: false, icon: 'check' },
      { step: 'Recebimento na Facção', completed: false, icon: 'box' },
      { step: 'Em Produção', completed: false, icon: 'scissors' },
      { step: 'Pronto p/ Envio', completed: false, icon: 'box' },
      { step: 'Entrega / Finalização', completed: false, icon: 'truck' },
      { step: 'Avaliação', completed: false, icon: 'check' }
    ]
  },
  {
    id: '8',
    displayId: '#9799',
    brand: {
      id: 'b4',
      name: 'EcoWear',
      rating: 4.5,
      location: 'Rio de Janeiro, RJ',
      image: 'https://picsum.photos/40/40?random=4'
    },
    type: 'Adulto',
    productName: 'Camisa Linho Mista',
    quantity: 350, // Ajustado para respeitar mínimo 300
    pricePerUnit: 70.00,
    totalValue: 24500, // Recalculado
    deliveryDeadline: '2026-02-10',
    status: OrderStatus.ACCEPTED,
    paymentTerms: 'À vista',
    paymentStatus: 'pending',
    description: 'Camisa unissex linho misto.',
    observations: 'Discutindo valor da peça piloto.',
    materialsProvided: true,
    createdAt: '2026-01-22',
    attachments: [],
    timeline: [
      { step: 'Pedido Criado', date: '22/01 • 08:45', completed: true, icon: 'check' },
      { step: 'Aceite da Facção', date: 'Em negociação', completed: false, icon: 'clock' },
      { step: 'Recebimento na Facção', completed: false, icon: 'box' },
      { step: 'Em Produção', completed: false, icon: 'scissors' },
      { step: 'Pronto p/ Envio', completed: false, icon: 'box' },
      { step: 'Entrega / Finalização', completed: false, icon: 'truck' },
      { step: 'Avaliação', completed: false, icon: 'check' }
    ]
  },
  {
    id: '9',
    displayId: '#9688',
    brand: {
      id: 'b1',
      name: 'Moda Vanguarda',
      rating: 4.9,
      location: 'São Paulo, SP',
      image: 'https://picsum.photos/40/40?random=1'
    },
    type: 'Adulto',
    productName: 'Jaqueta Jeans Oversized',
    quantity: 400,
    pricePerUnit: 90.00,
    totalValue: 36000,
    deliveryDeadline: '2026-02-01',
    status: OrderStatus.PRODUCTION,
    paymentTerms: '60 dias',
    paymentStatus: 'late',
    description: 'Jaqueta jeans vintage look, botões de metal personalizados.',
    materialsProvided: true,
    createdAt: '2026-01-08',
    attachments: [{ id: 'a8', type: 'pdf', name: 'Tech_Pack_Jaqueta.pdf', url: '#', size: '3.0 MB' }],
    timeline: [
      { step: 'Pedido Criado', date: '08/01 • 13:00', completed: true, icon: 'check' },
      { step: 'Aceite da Facção', date: '09/01 • 09:30', completed: true, icon: 'check' },
      { step: 'Recebimento na Facção', date: '12/01 • 14:00', completed: true, icon: 'box' },
      { step: 'Em Produção', date: '15/01 • 08:00', completed: true, icon: 'scissors' },
      { step: 'Pronto p/ Envio', completed: false, icon: 'box' },
      { step: 'Entrega / Finalização', completed: false, icon: 'truck' },
      { step: 'Avaliação', completed: false, icon: 'check' }
    ]
  },
  {
    id: '10',
    displayId: '#9810',
    brand: {
      id: 'b2',
      name: 'Kids Joy',
      rating: 4.2,
      location: 'Blumenau, SC',
      image: 'https://picsum.photos/40/40?random=2'
    },
    type: 'Infantil',
    productName: 'Body Bebê Algodão',
    quantity: 1500,
    pricePerUnit: 12.00,
    totalValue: 18000,
    deliveryDeadline: '2026-02-15',
    status: OrderStatus.TRANSIT_TO_SUPPLIER,
    waitingReason: 'Aguardando Botões',
    missingItems: ['Botões de Pressão', 'Linha 120'],
    paymentTerms: '30/60',
    paymentStatus: 'pending',
    description: 'Body manga curta suedine.',
    materialsProvided: false,
    createdAt: '2026-01-18',
    attachments: [],
    timeline: [
      { step: 'Pedido Criado', date: '18/01 • 10:00', completed: true, icon: 'check' },
      { step: 'Aceite da Facção', date: '19/01 • 11:30', completed: true, icon: 'check' },
      { step: 'Recebimento na Facção', date: 'Aguardando', completed: false, icon: 'clock' },
      { step: 'Em Produção', completed: false, icon: 'scissors' },
      { step: 'Pronto p/ Envio', completed: false, icon: 'box' },
      { step: 'Entrega / Finalização', completed: false, icon: 'truck' },
      { step: 'Avaliação', completed: false, icon: 'check' }
    ]
  },
  {
    id: '11',
    displayId: '#9650',
    brand: {
      id: 'b3',
      name: 'Urban Style Co.',
      rating: 3.8,
      location: 'Goiânia, GO',
      image: 'https://picsum.photos/40/40?random=3'
    },
    type: 'Adulto',
    productName: 'Calça Cargo Sarja',
    quantity: 600,
    pricePerUnit: 55.00,
    totalValue: 33000,
    deliveryDeadline: '2026-01-28',
    status: OrderStatus.READY_SEND,
    paymentTerms: '50% Entrada',
    paymentStatus: 'partial',
    description: 'Calça utilitária, 6 bolsos.',
    materialsProvided: true,
    createdAt: '2025-12-28',
    attachments: [],
    timeline: [
      { step: 'Pedido Criado', date: '28/12 • 09:00', completed: true, icon: 'check' },
      { step: 'Aceite da Facção', date: '29/12 • 10:00', completed: true, icon: 'check' },
      { step: 'Recebimento na Facção', date: '04/01 • 14:00', completed: true, icon: 'box' },
      { step: 'Em Produção', date: '08/01 • 07:30', completed: true, icon: 'scissors' },
      { step: 'Pronto p/ Envio', date: '24/01 • 16:00', completed: true, icon: 'box' },
      { step: 'Entrega / Finalização', completed: false, icon: 'truck' },
      { step: 'Avaliação', completed: false, icon: 'check' }
    ]
  },
  {
    id: '12',
    displayId: '#9701',
    brand: {
      id: 'b4',
      name: 'EcoWear',
      rating: 4.5,
      location: 'Rio de Janeiro, RJ',
      image: 'https://picsum.photos/40/40?random=4'
    },
    type: 'Adulto',
    productName: 'Ecobag Algodão Cru',
    quantity: 2500, // Ajustado para respeitar máximo 2500
    pricePerUnit: 8.50,
    totalValue: 21250, // Recalculado
    deliveryDeadline: '2026-02-05',
    status: OrderStatus.PRODUCTION,
    paymentTerms: 'À vista',
    paymentStatus: 'paid',
    description: 'Ecobag promocional simples.',
    materialsProvided: true,
    createdAt: '2026-01-10',
    attachments: [],
    timeline: [
      { step: 'Pedido Criado', date: '10/01 • 15:45', completed: true, icon: 'check' },
      { step: 'Aceite da Facção', date: '11/01 • 09:00', completed: true, icon: 'check' },
      { step: 'Recebimento na Facção', date: '15/01 • 11:00', completed: true, icon: 'box' },
      { step: 'Em Produção', date: '18/01 • 08:00', completed: true, icon: 'scissors' },
      { step: 'Pronto p/ Envio', completed: false, icon: 'box' },
      { step: 'Entrega / Finalização', completed: false, icon: 'truck' },
      { step: 'Avaliação', completed: false, icon: 'check' }
    ]
  },
  {
    id: '13',
    displayId: '#9105',
    brand: {
      id: 'b1',
      name: 'Moda Vanguarda',
      rating: 4.9,
      location: 'São Paulo, SP',
      image: 'https://picsum.photos/40/40?random=1'
    },
    type: 'Adulto',
    productName: 'Colete Alfaiataria',
    quantity: 300, // Ajustado para respeitar mínimo 300
    pricePerUnit: 45.00,
    totalValue: 13500, // Recalculado
    deliveryDeadline: '2026-01-10',
    status: OrderStatus.FINALIZED,
    paymentTerms: 'Pago',
    paymentStatus: 'paid',
    description: 'Colete curto forrado.',
    materialsProvided: true,
    createdAt: '2025-11-20',
    attachments: [],
    timeline: [
      { step: 'Pedido Criado', date: '20/11 • 10:00', completed: true, icon: 'check' },
      { step: 'Aceite da Facção', date: '21/11 • 14:00', completed: true, icon: 'check' },
      { step: 'Recebimento na Facção', date: '25/11 • 09:00', completed: true, icon: 'box' },
      { step: 'Em Produção', date: '30/11 • 07:30', completed: true, icon: 'scissors' },
      { step: 'Pronto p/ Envio', date: '05/01 • 15:00', completed: true, icon: 'box' },
      { step: 'Entrega / Finalização', date: '09/01 • 10:30', completed: true, icon: 'truck' },
      { step: 'Avaliação', date: '★★★★★', completed: true, icon: 'check' }
    ]
  },
  {
    id: '14',
    displayId: '#9901',
    brand: {
      id: 'b1',
      name: 'Moda Vanguarda',
      rating: 4.9,
      location: 'São Paulo, SP',
      image: 'https://picsum.photos/40/40?random=1'
    },
    type: 'Adulto',
    productName: 'Saia Jeans Destroyed',
    quantity: 750,
    pricePerUnit: 48.00,
    totalValue: 36000,
    deliveryDeadline: '2026-02-18',
    status: OrderStatus.PREPARING_BRAND,
    waitingReason: 'Aguardando Insumos',
    missingItems: ['Rebite', 'Zíper Metal', 'Tecido Denim'],
    paymentTerms: '50/50',
    paymentStatus: 'pending',
    description: 'Saia jeans lavagem clara com puídos e barra desfiada.',
    materialsProvided: true,
    createdAt: '2026-01-20',
    attachments: [],
    timeline: [
      { step: 'Pedido Criado', date: '20/01 • 08:30', completed: true, icon: 'check' },
      { step: 'Aceite da Facção', date: '20/01 • 14:00', completed: true, icon: 'check' },
      { step: 'Recebimento na Facção', completed: false, icon: 'box' },
      { step: 'Em Produção', completed: false, icon: 'scissors' },
      { step: 'Pronto p/ Envio', completed: false, icon: 'box' },
      { step: 'Entrega / Finalização', completed: false, icon: 'truck' },
      { step: 'Avaliação', completed: false, icon: 'check' }
    ]
  }
];

export const STATUS_COLUMNS = [
  { id: OrderStatus.NEW, label: 'Novos Pedidos', color: 'bg-slate-100 text-slate-800 border-slate-200' },
  { id: OrderStatus.NEGOTIATING, label: 'Em Negociação', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { id: OrderStatus.ACCEPTED, label: 'Aguardando Insumos', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: OrderStatus.PRODUCTION_QUEUE, label: 'Fila de Produção', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: OrderStatus.PRODUCTION, label: 'Em Produção', color: 'bg-brand-100 text-brand-800 border-brand-200' },
  { id: OrderStatus.READY_SEND, label: 'Em Trânsito', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: OrderStatus.IN_REVIEW, label: 'Em Aprovação', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { id: OrderStatus.PAYMENT_PROCESS, label: 'Processo de Pagamento', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  { id: OrderStatus.FINALIZED, label: 'Finalizados', color: 'bg-green-100 text-green-800 border-green-200' },
  { id: OrderStatus.CANCELLED, label: 'Cancelados', color: 'bg-red-100 text-red-800 border-red-200' },
];