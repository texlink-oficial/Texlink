import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// jsdom does not implement scrollIntoView — mock it globally so components that
// call messagesEndRef.current?.scrollIntoView() do not throw.
Element.prototype.scrollIntoView = vi.fn();

// ---------------------------------------------------------------------------
// Mocks — must be declared before component imports
// ---------------------------------------------------------------------------

// Hoist mock functions so they are available inside vi.mock factory functions
const mockNavigate = vi.hoisted(() => vi.fn());
const mockGetById = vi.hoisted(() => vi.fn());
const mockGetAvailableTransitions = vi.hoisted(() => vi.fn());
const mockGetMessages = vi.hoisted(() => vi.fn());
const mockSendMessage = vi.hoisted(() => vi.fn());
const mockSubmitRating = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'order-1' }),
    Link: ({ to, children, ...props }: { to: string; children: React.ReactNode; [key: string]: unknown }) => (
      <a href={to} {...props}>{children}</a>
    ),
  };
});

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-brand-1', role: 'BRAND', companyId: 'brand-1', name: 'Usuário Marca' },
    token: 'jwt-test',
  }),
}));

// Mock child components that perform their own data fetching to keep tests focused
vi.mock('../../components/orders', () => ({
  OrderTimeline: ({ order }: { order: { status: string } }) => (
    <div data-testid="order-timeline">Timeline: {order.status}</div>
  ),
  StatusActionBar: ({ order, onStatusUpdated }: { order: { status: string }; onStatusUpdated: () => void }) => (
    <div data-testid="status-action-bar" data-status={order.status}>
      <button onClick={onStatusUpdated}>Atualizar Status</button>
    </div>
  ),
}));

vi.mock('../../components/ratings/RatingModal', () => ({
  RatingModal: ({
    isOpen,
    onClose,
    onSubmit,
    partnerName,
    orderDisplayId,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (rating: number, comment: string) => Promise<void>;
    partnerName: string;
    orderId: string;
    orderDisplayId: string;
  }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="rating-modal">
        <p>Avaliar: {partnerName}</p>
        <p>Pedido: {orderDisplayId}</p>
        <button onClick={onClose}>Fechar</button>
        <button onClick={() => onSubmit(5, 'Ótimo trabalho')}>Enviar Avaliação</button>
      </div>
    );
  },
}));

vi.mock('../../services', async () => {
  const actual = await vi.importActual<typeof import('../../services')>('../../services');
  return {
    ...actual,
    ordersService: {
      getById: mockGetById,
      getAvailableTransitions: mockGetAvailableTransitions,
    },
    chatService: {
      getMessages: mockGetMessages,
      sendMessage: mockSendMessage,
    },
    ratingsService: {
      submitRating: mockSubmitRating,
    },
  };
});

import OrderDetailsPage from './OrderDetailsPage';
import { Order } from '../../services';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE_TRANSITION = {
  canAdvance: true,
  waitingFor: null,
  waitingLabel: '',
  transitions: [],
};

const makeOrder = (overrides: Partial<Order> = {}): Order => ({
  id: 'order-1',
  displayId: 'PD-001',
  brandId: 'brand-1',
  supplierId: 'sup-1',
  status: 'EM_PRODUCAO' as Order['status'],
  assignmentType: 'DIRECT',
  revisionNumber: 1,
  origin: 'ORIGINAL',
  productType: 'Camiseta',
  productCategory: 'Masculino',
  productName: 'Camiseta Básica',
  quantity: 100,
  pricePerUnit: 25,
  totalValue: 2500,
  deliveryDeadline: '2026-04-01T00:00:00.000Z',
  materialsProvided: false,
  createdAt: '2026-03-01T00:00:00.000Z',
  supplier: { id: 'sup-1', tradeName: 'Facção Alpha' },
  attachments: [],
  _count: { messages: 0 },
  ratings: [],
  statusHistory: [],
  ...overrides,
});

const makeMessage = (overrides = {}) => ({
  id: 'msg-1',
  orderId: 'order-1',
  senderId: 'user-brand-1',
  type: 'TEXT' as const,
  content: 'Olá, tudo bem?',
  read: false,
  createdAt: '2026-03-10T10:00:00.000Z',
  sender: { id: 'user-brand-1', name: 'Usuário Marca', role: 'BRAND' },
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('OrderDetailsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetById.mockResolvedValue(makeOrder());
    mockGetAvailableTransitions.mockResolvedValue(BASE_TRANSITION);
    mockGetMessages.mockResolvedValue([]);
    mockSendMessage.mockResolvedValue(makeMessage());
    mockSubmitRating.mockResolvedValue({});
  });

  // TC-05: Deve renderizar timeline do pedido
  describe('TC-05: timeline do pedido', () => {
    it('deve renderizar o componente OrderTimeline com o pedido carregado', async () => {
      render(<OrderDetailsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('order-timeline')).toBeInTheDocument();
      });

      expect(screen.getByText(/Timeline: EM_PRODUCAO/)).toBeInTheDocument();
    });

    it('deve exibir o displayId do pedido no cabecalho', async () => {
      render(<OrderDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText('PD-001')).toBeInTheDocument();
      });
    });

    it('deve exibir o badge de status correto', async () => {
      render(<OrderDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText('Em Produção')).toBeInTheDocument();
      });
    });

    it('deve exibir informacoes do produto', async () => {
      render(<OrderDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText('Camiseta Básica')).toBeInTheDocument();
        expect(screen.getByText('Camiseta')).toBeInTheDocument();
        expect(screen.getByText('Masculino')).toBeInTheDocument();
      });
    });

    it('deve exibir detalhes financeiros do pedido', async () => {
      render(<OrderDetailsPage />);

      await waitFor(() => {
        // Quantidade
        expect(screen.getByText('100 pçs')).toBeInTheDocument();
        // Valor total formatado
        expect(screen.getByText(/R\$\s*2\.500,00/)).toBeInTheDocument();
      });
    });

    it('deve exibir informacoes da faccao quando disponivel', async () => {
      render(<OrderDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText('Facção Alpha')).toBeInTheDocument();
      });
    });

    it('deve exibir mensagem de aguardo quando sem faccao', async () => {
      mockGetById.mockResolvedValue(makeOrder({ supplier: undefined, supplierId: undefined }));

      render(<OrderDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText('Aguardando aceite de uma facção')).toBeInTheDocument();
      });
    });

    it('deve mostrar spinner de carregamento antes do pedido ser carregado', () => {
      mockGetById.mockReturnValue(new Promise(() => {}));

      render(<OrderDetailsPage />);

      // Enquanto carrega, o conteudo do pedido nao deve aparecer
      expect(screen.queryByText('PD-001')).not.toBeInTheDocument();
    });

    it('deve exibir mensagem de pedido nao encontrado quando getById retorna null', async () => {
      mockGetById.mockRejectedValue(new Error('Not Found'));

      render(<OrderDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText('Pedido não encontrado')).toBeInTheDocument();
      });
    });
  });

  // TC-06: Deve exibir chat integrado
  describe('TC-06: chat integrado', () => {
    it('deve exibir botao de Chat no cabecalho', async () => {
      render(<OrderDetailsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Chat/i })).toBeInTheDocument();
      });
    });

    it('deve exibir o painel de chat ao clicar no botao Chat', async () => {
      const user = userEvent.setup();
      render(<OrderDetailsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Chat/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Chat/i }));

      await waitFor(() => {
        expect(screen.getByText('Chat com a Facção')).toBeInTheDocument();
      });

      expect(mockGetMessages).toHaveBeenCalledWith('order-1');
    });

    it('deve exibir mensagem padrao quando nao ha mensagens no chat', async () => {
      const user = userEvent.setup();
      mockGetMessages.mockResolvedValue([]);

      render(<OrderDetailsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Chat/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Chat/i }));

      await waitFor(() => {
        expect(screen.getByText('Nenhuma mensagem ainda')).toBeInTheDocument();
      });
    });

    it('deve listar mensagens existentes no chat', async () => {
      const user = userEvent.setup();
      mockGetMessages.mockResolvedValue([
        makeMessage({ content: 'Olá, como vai?' }),
        makeMessage({ id: 'msg-2', senderId: 'user-sup-1', content: 'Tudo bem!', sender: { id: 'user-sup-1', name: 'Facção Alpha', role: 'SUPPLIER' } }),
      ]);

      render(<OrderDetailsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Chat/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Chat/i }));

      await waitFor(() => {
        expect(screen.getByText('Olá, como vai?')).toBeInTheDocument();
        expect(screen.getByText('Tudo bem!')).toBeInTheDocument();
      });
    });

    it('deve enviar mensagem ao clicar no botao de envio', async () => {
      const user = userEvent.setup();
      render(<OrderDetailsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Chat/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Chat/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Digite sua mensagem...')).toBeInTheDocument();
      });

      await user.type(screen.getByPlaceholderText('Digite sua mensagem...'), 'Olá facção!');

      // Clica no botao de envio (o button dentro do formulario do chat)
      const chatButtons = screen.getAllByRole('button');
      const sendButton = chatButtons.find(b => b.querySelector('svg') && !b.textContent?.includes('Chat'));
      if (sendButton) {
        await user.click(sendButton);
      }

      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith('order-1', {
          type: 'TEXT',
          content: 'Olá facção!',
        });
      });
    });

    it('deve esconder o chat ao clicar novamente no botao Chat', async () => {
      const user = userEvent.setup();
      render(<OrderDetailsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Chat/i })).toBeInTheDocument();
      });

      const chatBtn = screen.getByRole('button', { name: /Chat/i });

      // Abre
      await user.click(chatBtn);
      await waitFor(() => {
        expect(screen.getByText('Chat com a Facção')).toBeInTheDocument();
      });

      // Fecha
      await user.click(chatBtn);
      await waitFor(() => {
        expect(screen.queryByText('Chat com a Facção')).not.toBeInTheDocument();
      });
    });

    it('deve exibir contador de mensagens no botao Chat quando existem mensagens', async () => {
      mockGetById.mockResolvedValue(makeOrder({ _count: { messages: 5 } }));

      render(<OrderDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument();
      });
    });
  });

  // TC-07: Deve exibir botoes de acao corretos por status
  describe('TC-07: botoes de acao por status', () => {
    it('deve renderizar o componente StatusActionBar com o pedido', async () => {
      render(<OrderDetailsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('status-action-bar')).toBeInTheDocument();
      });

      expect(screen.getByTestId('status-action-bar')).toHaveAttribute('data-status', 'EM_PRODUCAO');
    });

    it('nao deve exibir botao de avaliacao para pedido em producao', async () => {
      render(<OrderDetailsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('status-action-bar')).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /Avaliar Facção/i })).not.toBeInTheDocument();
    });

    it('nao deve exibir botao de avaliacao quando pedido finalizado ja possui avaliacao', async () => {
      mockGetById.mockResolvedValue(makeOrder({
        status: 'FINALIZADO' as Order['status'],
        ratings: [{ id: 'rating-1' } as never],
      }));

      render(<OrderDetailsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('status-action-bar')).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /Avaliar Facção/i })).not.toBeInTheDocument();
    });

    it('deve recarregar pedido quando status e atualizado via StatusActionBar', async () => {
      const user = userEvent.setup();
      render(<OrderDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText('Atualizar Status')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Atualizar Status'));

      // getById deve ser chamado novamente (reload apos update)
      await waitFor(() => {
        expect(mockGetById).toHaveBeenCalledTimes(2);
      });
    });
  });

  // TC-08: Deve exibir formulario de avaliacao quando status e FINALIZADO
  describe('TC-08: avaliacao quando status FINALIZADO', () => {
    beforeEach(() => {
      mockGetById.mockResolvedValue(makeOrder({
        status: 'FINALIZADO' as Order['status'],
        ratings: [],
      }));
    });

    it('deve exibir botao "Avaliar Facção" quando pedido esta FINALIZADO sem avaliacao', async () => {
      render(<OrderDetailsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Avaliar Facção/i })).toBeInTheDocument();
      });
    });

    it('deve abrir o modal de avaliacao ao clicar em "Avaliar Facção"', async () => {
      const user = userEvent.setup();
      render(<OrderDetailsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Avaliar Facção/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Avaliar Facção/i }));

      await waitFor(() => {
        expect(screen.getByTestId('rating-modal')).toBeInTheDocument();
        expect(screen.getByText('Avaliar: Facção Alpha')).toBeInTheDocument();
        expect(screen.getByText('Pedido: PD-001')).toBeInTheDocument();
      });
    });

    it('deve fechar o modal de avaliacao ao clicar em Fechar', async () => {
      const user = userEvent.setup();
      render(<OrderDetailsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Avaliar Facção/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Avaliar Facção/i }));

      await waitFor(() => {
        expect(screen.getByTestId('rating-modal')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Fechar'));

      await waitFor(() => {
        expect(screen.queryByTestId('rating-modal')).not.toBeInTheDocument();
      });
    });

    it('deve chamar ratingsService.submitRating ao enviar avaliacao', async () => {
      const user = userEvent.setup();
      render(<OrderDetailsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Avaliar Facção/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Avaliar Facção/i }));

      await waitFor(() => {
        expect(screen.getByTestId('rating-modal')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Enviar Avaliação'));

      await waitFor(() => {
        expect(mockSubmitRating).toHaveBeenCalledWith('order-1', {
          score: 5,
          comment: 'Ótimo trabalho',
        });
      });
    });

    it('deve recarregar pedido apos envio de avaliacao', async () => {
      const user = userEvent.setup();
      render(<OrderDetailsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Avaliar Facção/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Avaliar Facção/i }));
      await waitFor(() => {
        expect(screen.getByTestId('rating-modal')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Enviar Avaliação'));

      await waitFor(() => {
        // getById chamado na carga inicial + apos submit da avaliacao
        expect(mockGetById).toHaveBeenCalledTimes(2);
      });
    });

    it('deve exibir botao de avaliacao tambem para status PARCIALMENTE_APROVADO', async () => {
      mockGetById.mockResolvedValue(makeOrder({
        status: 'PARCIALMENTE_APROVADO' as Order['status'],
        ratings: [],
      }));

      render(<OrderDetailsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Avaliar Facção/i })).toBeInTheDocument();
      });
    });

    it('deve exibir botao de avaliacao tambem para status REPROVADO', async () => {
      mockGetById.mockResolvedValue(makeOrder({
        status: 'REPROVADO' as Order['status'],
        ratings: [],
      }));

      render(<OrderDetailsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Avaliar Facção/i })).toBeInTheDocument();
      });
    });
  });

  // TC-09: Anexos devem ser listados e clicaveis
  describe('TC-09: listagem e clique em anexos', () => {
    const attachments = [
      {
        id: 'att-1',
        type: 'pdf',
        name: 'ficha-tecnica.pdf',
        url: 'https://s3.amazonaws.com/bucket/ficha-tecnica.pdf',
        mimeType: 'application/pdf',
      },
      {
        id: 'att-2',
        type: 'image',
        name: 'modelo.png',
        url: 'https://s3.amazonaws.com/bucket/modelo.png',
        mimeType: 'image/png',
      },
    ];

    beforeEach(() => {
      mockGetById.mockResolvedValue(makeOrder({ attachments }));
    });

    it('deve exibir a secao de Anexos quando existem anexos', async () => {
      render(<OrderDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText('Anexos')).toBeInTheDocument();
      });
    });

    it('deve listar os nomes de todos os anexos', async () => {
      render(<OrderDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText('ficha-tecnica.pdf')).toBeInTheDocument();
        expect(screen.getByText('modelo.png')).toBeInTheDocument();
      });
    });

    it('deve renderizar links de download com href apontando para a URL do anexo', async () => {
      render(<OrderDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText('ficha-tecnica.pdf')).toBeInTheDocument();
      });

      const pdfLink = screen.getByText('ficha-tecnica.pdf').closest('a');
      expect(pdfLink).toHaveAttribute('href', 'https://s3.amazonaws.com/bucket/ficha-tecnica.pdf');
      expect(pdfLink).toHaveAttribute('target', '_blank');
      expect(pdfLink).toHaveAttribute('rel', 'noopener noreferrer');

      const imgLink = screen.getByText('modelo.png').closest('a');
      expect(imgLink).toHaveAttribute('href', 'https://s3.amazonaws.com/bucket/modelo.png');
      expect(imgLink).toHaveAttribute('target', '_blank');
    });

    it('deve exibir texto de acao "Clique para baixar" em cada anexo', async () => {
      render(<OrderDetailsPage />);

      await waitFor(() => {
        const downloadTexts = screen.getAllByText('Clique para baixar');
        expect(downloadTexts).toHaveLength(2);
      });
    });

    it('nao deve exibir secao de Anexos quando o pedido nao possui anexos', async () => {
      mockGetById.mockResolvedValue(makeOrder({ attachments: [] }));

      render(<OrderDetailsPage />);

      await waitFor(() => {
        expect(screen.getByText('PD-001')).toBeInTheDocument();
      });

      // O titulo da secao nao deve aparecer quando nao ha anexos
      expect(screen.queryByText('Anexos')).not.toBeInTheDocument();
    });
  });
});
