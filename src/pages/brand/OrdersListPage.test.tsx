import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Hoist mocks so they are available inside vi.mock factory functions
const mockNavigate = vi.hoisted(() => vi.fn());
const mockGetBrandOrders = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ to, children, ...props }: { to: string; children: React.ReactNode; [key: string]: unknown }) => (
      <a href={to} {...props}>{children}</a>
    ),
  };
});

vi.mock('../../services', async () => {
  const actual = await vi.importActual<typeof import('../../services')>('../../services');
  return {
    ...actual,
    ordersService: {
      getBrandOrders: mockGetBrandOrders,
    },
  };
});

import OrdersListPage from './OrdersListPage';
import { Order } from '../../services';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeOrder = (overrides: Partial<Order> = {}): Order => ({
  id: 'order-1',
  displayId: 'PD-001',
  brandId: 'brand-1',
  status: 'LANCADO_PELA_MARCA' as Order['status'],
  assignmentType: 'DIRECT',
  revisionNumber: 1,
  origin: 'ORIGINAL',
  productType: 'Camiseta',
  productName: 'Camiseta Básica',
  quantity: 100,
  pricePerUnit: 25,
  totalValue: 2500,
  deliveryDeadline: '2026-04-01T00:00:00.000Z',
  materialsProvided: false,
  createdAt: '2026-03-01T00:00:00.000Z',
  supplier: { id: 'sup-1', tradeName: 'Facção Alpha' },
  attachments: [],
  ...overrides,
});

const ORDER_EM_PRODUCAO: Order = makeOrder({
  id: 'order-2',
  displayId: 'PD-002',
  status: 'EM_PRODUCAO' as Order['status'],
  productName: 'Calça Jeans',
  supplier: { id: 'sup-2', tradeName: 'Facção Beta' },
});

const ORDER_FINALIZADO: Order = makeOrder({
  id: 'order-3',
  displayId: 'PD-003',
  status: 'FINALIZADO' as Order['status'],
  productName: 'Blusa Social',
  supplier: { id: 'sup-3', tradeName: 'Facção Gamma' },
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('OrdersListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBrandOrders.mockResolvedValue([makeOrder(), ORDER_EM_PRODUCAO, ORDER_FINALIZADO]);
  });

  // TC-01: Deve listar apenas pedidos da marca autenticada
  describe('TC-01: listagem de pedidos da marca', () => {
    it('deve exibir os pedidos retornados pelo servico da marca', async () => {
      render(<OrdersListPage />);

      await waitFor(() => {
        expect(screen.getByText('Camiseta Básica')).toBeInTheDocument();
        expect(screen.getByText('Calça Jeans')).toBeInTheDocument();
        expect(screen.getByText('Blusa Social')).toBeInTheDocument();
      });

      // Verifica que getBrandOrders foi chamado sem filtro de status
      expect(mockGetBrandOrders).toHaveBeenCalledWith(undefined);
    });

    it('deve exibir o ID e a facção de cada pedido', async () => {
      render(<OrdersListPage />);

      await waitFor(() => {
        expect(screen.getByText('PD-001')).toBeInTheDocument();
        expect(screen.getByText(/Facção Alpha/)).toBeInTheDocument();
      });
    });

    it('deve exibir contador de pedidos no cabecalho', async () => {
      render(<OrdersListPage />);

      await waitFor(() => {
        expect(screen.getByText('3 pedidos')).toBeInTheDocument();
      });
    });

    it('deve mostrar spinner enquanto carrega', () => {
      // Mantém a promise pendente para capturar o estado de loading
      mockGetBrandOrders.mockReturnValue(new Promise(() => {}));

      render(<OrdersListPage />);

      // O spinner é um div animado; verificamos que o texto dos pedidos ainda não aparece
      expect(screen.queryByText('Camiseta Básica')).not.toBeInTheDocument();
    });

    it('deve exibir mensagem e link quando nao ha pedidos', async () => {
      mockGetBrandOrders.mockResolvedValue([]);

      render(<OrdersListPage />);

      await waitFor(() => {
        expect(screen.getByText('Nenhum pedido encontrado')).toBeInTheDocument();
        expect(screen.getByText('Criar Primeiro Pedido')).toBeInTheDocument();
      });
    });

    it('deve exibir badge do status de cada pedido', async () => {
      render(<OrdersListPage />);

      await waitFor(() => {
        expect(screen.getByText('Aguardando')).toBeInTheDocument();
        // "Em Produção" also appears in the <option> element for the filter select,
        // so we use getAllByText and check at least one span badge is present
        const emProducaoEls = screen.getAllByText('Em Produção');
        expect(emProducaoEls.length).toBeGreaterThanOrEqual(1);
        const badgeEl = emProducaoEls.find(el => el.tagName.toLowerCase() === 'span');
        expect(badgeEl).toBeInTheDocument();
        expect(screen.getByText('Finalizado')).toBeInTheDocument();
      });
    });
  });

  // TC-02: Filtro por status deve funcionar corretamente
  describe('TC-02: filtro por status', () => {
    it('deve chamar getBrandOrders com o status selecionado no filtro', async () => {
      const user = userEvent.setup();
      mockGetBrandOrders.mockResolvedValue([ORDER_EM_PRODUCAO]);

      render(<OrdersListPage />);

      // Aguarda o carregamento inicial
      await waitFor(() => {
        expect(mockGetBrandOrders).toHaveBeenCalledTimes(1);
      });

      // Seleciona o filtro "Em Produção"
      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'EM_PRODUCAO');

      await waitFor(() => {
        expect(mockGetBrandOrders).toHaveBeenCalledWith('EM_PRODUCAO');
      });
    });

    it('deve chamar getBrandOrders sem filtro ao selecionar "Todos os status"', async () => {
      const user = userEvent.setup();
      render(<OrdersListPage />);

      // Aguarda o carregamento inicial
      await waitFor(() => {
        expect(mockGetBrandOrders).toHaveBeenCalledTimes(1);
      });

      const select = screen.getByRole('combobox');

      // Seleciona um status e depois volta para "Todos"
      await user.selectOptions(select, 'FINALIZADO');
      await waitFor(() => {
        expect(mockGetBrandOrders).toHaveBeenCalledWith('FINALIZADO');
      });

      await user.selectOptions(select, '');
      await waitFor(() => {
        expect(mockGetBrandOrders).toHaveBeenCalledWith(undefined);
      });
    });

    it('deve filtrar pedidos localmente pelo campo de busca por nome de produto', async () => {
      const user = userEvent.setup();
      render(<OrdersListPage />);

      await waitFor(() => {
        expect(screen.getByText('Camiseta Básica')).toBeInTheDocument();
        expect(screen.getByText('Calça Jeans')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Buscar por ID, produto ou facção...');
      await user.type(searchInput, 'Calça');

      expect(screen.queryByText('Camiseta Básica')).not.toBeInTheDocument();
      expect(screen.getByText('Calça Jeans')).toBeInTheDocument();
    });

    it('deve filtrar pedidos localmente pelo nome da faccao', async () => {
      const user = userEvent.setup();
      render(<OrdersListPage />);

      await waitFor(() => {
        expect(screen.getByText('Camiseta Básica')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Buscar por ID, produto ou facção...');
      await user.type(searchInput, 'Alpha');

      expect(screen.getByText('Camiseta Básica')).toBeInTheDocument();
      expect(screen.queryByText('Calça Jeans')).not.toBeInTheDocument();
    });

    it('deve renderizar todas as opcoes de status no select', async () => {
      render(<OrdersListPage />);

      // Aguarda o carregamento para evitar warnings de estado nao-wrapped em act
      await waitFor(() => {
        expect(screen.getByText('Camiseta Básica')).toBeInTheDocument();
      });

      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();

      expect(screen.getByRole('option', { name: 'Todos os status' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Aguardando Aceite' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Aceitos' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Em Produção' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Finalizados' })).toBeInTheDocument();
    });
  });

  // TC-03: Clique em pedido deve navegar para /brand/orders/:id
  describe('TC-03: navegacao ao clicar em um pedido', () => {
    it('deve renderizar link de navegacao com href correto para cada pedido', async () => {
      render(<OrdersListPage />);

      await waitFor(() => {
        expect(screen.getByText('Camiseta Básica')).toBeInTheDocument();
      });

      // Link renderizado como <a> pelo mock do Link
      const links = screen.getAllByRole('link');
      const orderLinks = links.filter(l =>
        l.getAttribute('href')?.startsWith('/brand/orders/'),
      );

      expect(orderLinks.some(l => l.getAttribute('href') === '/brand/orders/order-1')).toBe(true);
      expect(orderLinks.some(l => l.getAttribute('href') === '/brand/orders/order-2')).toBe(true);
      expect(orderLinks.some(l => l.getAttribute('href') === '/brand/orders/order-3')).toBe(true);
    });

    it('deve exibir quantidade e valor total do pedido', async () => {
      render(<OrdersListPage />);

      await waitFor(() => {
        expect(screen.getByText('Camiseta Básica')).toBeInTheDocument();
      });

      // Todos os pedidos do mock possuem 100 peças — verificamos que pelo menos um aparece
      const quantidadeEls = screen.getAllByText(/100 peças/);
      expect(quantidadeEls.length).toBeGreaterThanOrEqual(1);

      // Valor total — todos os pedidos também compartilham R$ 2.500,00
      const valorEls = screen.getAllByText(/R\$\s*2\.500,00/);
      expect(valorEls.length).toBeGreaterThanOrEqual(1);
    });

    it('deve exibir badge de anexo quando pedido possui anexos', async () => {
      const orderWithAttachment: Order = makeOrder({
        id: 'order-attach',
        displayId: 'PD-004',
        productName: 'Pedido com Anexo',
        attachments: [{ id: 'att-1', type: 'pdf', name: 'ficha.pdf', url: 'http://s3/ficha.pdf', mimeType: 'application/pdf' }],
      });
      mockGetBrandOrders.mockResolvedValue([orderWithAttachment]);

      render(<OrdersListPage />);

      await waitFor(() => {
        // O badge mostra a quantidade de anexos
        expect(screen.getByTitle('1 anexo(s)')).toBeInTheDocument();
      });
    });

    it('nao deve exibir badge de anexo quando pedido nao possui anexos', async () => {
      const orderNoAttachment: Order = makeOrder({ attachments: [] });
      mockGetBrandOrders.mockResolvedValue([orderNoAttachment]);

      render(<OrdersListPage />);

      await waitFor(() => {
        expect(screen.getByText('Camiseta Básica')).toBeInTheDocument();
      });

      expect(screen.queryByTitle(/anexo/i)).not.toBeInTheDocument();
    });
  });

  // TC-04: Botao "Novo Pedido" deve estar presente
  describe('TC-04: botao Novo Pedido', () => {
    it('deve exibir o botao Novo Pedido com link correto', async () => {
      render(<OrdersListPage />);

      // Aguarda o carregamento para evitar warnings de estado nao-wrapped em act
      await waitFor(() => {
        expect(screen.getByText('Camiseta Básica')).toBeInTheDocument();
      });

      const newOrderLink = screen.getByRole('link', { name: /Novo Pedido/i });
      expect(newOrderLink).toBeInTheDocument();
      expect(newOrderLink).toHaveAttribute('href', '/brand/orders/new');
    });
  });
});
