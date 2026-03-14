import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// ---------------------------------------------------------------------------
// Mock ordersService
// Use vi.hoisted so the mock functions are available before vi.mock is hoisted.
// ---------------------------------------------------------------------------
const { mockGetAvailableTransitions, mockAdvanceStatus } = vi.hoisted(() => ({
  mockGetAvailableTransitions: vi.fn(),
  mockAdvanceStatus: vi.fn(),
}));

vi.mock('../../services/orders.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/orders.service')>();
  return {
    ...actual,
    ordersService: {
      ...actual.ordersService,
      getAvailableTransitions: mockGetAvailableTransitions,
      advanceStatus: mockAdvanceStatus,
    },
  };
});

// ---------------------------------------------------------------------------
// Mock OrderReviewModal (prevents rendering heavy sub-component)
// ---------------------------------------------------------------------------
vi.mock('./OrderReviewModal', () => ({
  OrderReviewModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="review-modal">Modal de Revisão</div> : null,
}));

import { StatusActionBar } from './StatusActionBar';
import type { Order, TransitionResponse } from '../../services/orders.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    displayId: 'PED-001',
    brandId: 'brand-1',
    status: 'LANCADO_PELA_MARCA',
    assignmentType: 'DIRECT',
    revisionNumber: 1,
    origin: 'ORIGINAL',
    productType: 'Camiseta',
    productName: 'Camiseta Básica',
    quantity: 100,
    pricePerUnit: 25,
    totalValue: 2500,
    deliveryDeadline: '2024-12-31',
    materialsProvided: false,
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  } as Order;
}

function buildTransitions(overrides: Partial<TransitionResponse> = {}): TransitionResponse {
  return {
    canAdvance: true,
    waitingFor: null,
    waitingLabel: '',
    transitions: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('StatusActionBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // TC-01: BRAND role — correct action buttons per status
  // -------------------------------------------------------------------------
  describe('para role BRAND', () => {
    it('deve exibir botão Cancelar Pedido quando a marca pode avançar', async () => {
      mockGetAvailableTransitions.mockResolvedValue(
        buildTransitions({
          canAdvance: true,
          transitions: [
            {
              nextStatus: 'CANCELADO',
              label: 'Cancelar Pedido',
              description: 'Cancelar este pedido.',
              requiresConfirmation: true,
              requiresNotes: false,
              requiresReview: false,
            },
          ],
        }),
      );

      render(
        <StatusActionBar
          order={buildOrder({ status: 'LANCADO_PELA_MARCA' })}
          onStatusUpdated={vi.fn()}
        />,
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancelar pedido/i })).toBeInTheDocument();
      });
    });

    it('deve exibir mensagem de espera quando waitingFor é SUPPLIER', async () => {
      mockGetAvailableTransitions.mockResolvedValue(
        buildTransitions({
          canAdvance: false,
          waitingFor: 'SUPPLIER',
          waitingLabel: 'Aguardando ação da facção',
          transitions: [],
        }),
      );

      render(
        <StatusActionBar
          order={buildOrder({ status: 'LANCADO_PELA_MARCA' })}
          onStatusUpdated={vi.fn()}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Aguardando ação da facção')).toBeInTheDocument();
        expect(screen.getByText('A facção precisa realizar a próxima ação')).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // TC-02: SUPPLIER role — correct action buttons per status
  // -------------------------------------------------------------------------
  describe('para role SUPPLIER', () => {
    it('deve exibir botões Aceitar e Rejeitar quando status é LANCADO_PELA_MARCA', async () => {
      mockGetAvailableTransitions.mockResolvedValue(
        buildTransitions({
          canAdvance: true,
          transitions: [
            {
              nextStatus: 'ACEITO_PELA_FACCAO',
              label: 'Aceitar',
              description: 'Aceitar o pedido.',
              requiresConfirmation: false,
              requiresNotes: false,
              requiresReview: false,
            },
            {
              nextStatus: 'RECUSADO_PELA_FACCAO',
              label: 'Rejeitar',
              description: 'Rejeitar o pedido.',
              requiresConfirmation: true,
              requiresNotes: true,
              requiresReview: false,
            },
          ],
        }),
      );

      render(
        <StatusActionBar
          order={buildOrder({ status: 'LANCADO_PELA_MARCA' })}
          onStatusUpdated={vi.fn()}
        />,
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /aceitar/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /rejeitar/i })).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // TC-03: "Aceitar" button visible for SUPPLIER when status is PENDING
  // -------------------------------------------------------------------------
  it('botão Aceitar deve estar visível para SUPPLIER quando status é PENDING (LANCADO_PELA_MARCA)', async () => {
    mockGetAvailableTransitions.mockResolvedValue(
      buildTransitions({
        canAdvance: true,
        transitions: [
          {
            nextStatus: 'ACEITO_PELA_FACCAO',
            label: 'Aceitar',
            description: 'Aceitar o pedido.',
            requiresConfirmation: false,
            requiresNotes: false,
            requiresReview: false,
          },
        ],
      }),
    );

    render(
      <StatusActionBar
        order={buildOrder({ status: 'LANCADO_PELA_MARCA' })}
        onStatusUpdated={vi.fn()}
      />,
    );

    const button = await screen.findByRole('button', { name: /aceitar/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  // -------------------------------------------------------------------------
  // TC-04: "Rejeitar" button visible for SUPPLIER when status is PENDING
  // -------------------------------------------------------------------------
  it('botão Rejeitar deve estar visível para SUPPLIER quando status é PENDING', async () => {
    mockGetAvailableTransitions.mockResolvedValue(
      buildTransitions({
        canAdvance: true,
        transitions: [
          {
            nextStatus: 'RECUSADO_PELA_FACCAO',
            label: 'Rejeitar',
            description: 'Rejeitar o pedido.',
            requiresConfirmation: true,
            requiresNotes: true,
            requiresReview: false,
          },
        ],
      }),
    );

    render(
      <StatusActionBar
        order={buildOrder({ status: 'LANCADO_PELA_MARCA' })}
        onStatusUpdated={vi.fn()}
      />,
    );

    const button = await screen.findByRole('button', { name: /rejeitar/i });
    expect(button).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // TC-05: Buttons should be disabled during loading (isAdvancing = true)
  // -------------------------------------------------------------------------
  it('botões devem ser desabilitados durante loading', async () => {
    // Make advanceStatus hang so isAdvancing stays true
    mockGetAvailableTransitions.mockResolvedValue(
      buildTransitions({
        canAdvance: true,
        transitions: [
          {
            nextStatus: 'ACEITO_PELA_FACCAO',
            label: 'Aceitar',
            description: 'Aceitar o pedido.',
            requiresConfirmation: false,
            requiresNotes: false,
            requiresReview: false,
          },
        ],
      }),
    );
    mockAdvanceStatus.mockImplementation(() => new Promise(() => {})); // never resolves

    const user = userEvent.setup();

    render(
      <StatusActionBar
        order={buildOrder({ status: 'LANCADO_PELA_MARCA' })}
        onStatusUpdated={vi.fn()}
      />,
    );

    const button = await screen.findByRole('button', { name: /aceitar/i });
    await user.click(button);

    await waitFor(() => {
      // After click, isAdvancing = true, button should be disabled
      expect(button).toBeDisabled();
    });
  });

  // -------------------------------------------------------------------------
  // TC-06: Renders nothing when no transitions available (terminal state)
  // -------------------------------------------------------------------------
  it('não deve renderizar nada quando não há transições disponíveis', async () => {
    mockGetAvailableTransitions.mockResolvedValue(
      buildTransitions({ canAdvance: false, waitingFor: null, transitions: [] }),
    );

    const { container } = render(
      <StatusActionBar
        order={buildOrder({ status: 'FINALIZADO' })}
        onStatusUpdated={vi.fn()}
      />,
    );

    await waitFor(() => {
      // No buttons should be rendered
      expect(container.querySelector('button')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // TC-07: Clicking transition that requiresConfirmation shows confirm modal
  // -------------------------------------------------------------------------
  it('deve exibir modal de confirmação ao clicar em transição que requer confirmação', async () => {
    mockGetAvailableTransitions.mockResolvedValue(
      buildTransitions({
        canAdvance: true,
        transitions: [
          {
            nextStatus: 'CANCELADO',
            label: 'Cancelar Pedido',
            description: 'Tem certeza que deseja cancelar?',
            requiresConfirmation: true,
            requiresNotes: false,
            requiresReview: false,
          },
        ],
      }),
    );

    const user = userEvent.setup();

    render(
      <StatusActionBar
        order={buildOrder()}
        onStatusUpdated={vi.fn()}
      />,
    );

    const button = await screen.findByRole('button', { name: /cancelar pedido/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('Tem certeza que deseja cancelar?')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /confirmar/i })).toBeInTheDocument();
      // The modal dismiss button has exact text "Cancelar" (not "Cancelar Pedido")
      expect(screen.getByRole('button', { name: /^cancelar$/i })).toBeInTheDocument();
    });
  });
});
