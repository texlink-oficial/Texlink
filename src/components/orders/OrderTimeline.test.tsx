import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { OrderTimeline } from './OrderTimeline';
import type { Order, StatusHistoryEntry } from '../../services/orders.service';

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
    statusHistory: [],
    ...overrides,
  } as Order;
}

function buildHistoryEntry(
  newStatus: string,
  createdAt: string,
  previousStatus?: string,
): StatusHistoryEntry {
  return {
    id: `hist-${newStatus}`,
    previousStatus: previousStatus as any,
    newStatus: newStatus as any,
    changedById: 'user-1',
    createdAt,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('OrderTimeline', () => {
  // -------------------------------------------------------------------------
  // TC-01: Should render all order statuses in sequence (simple flow)
  // -------------------------------------------------------------------------
  it('deve renderizar todos os status do pedido em ordem (fluxo simples)', () => {
    const order = buildOrder({ materialsProvided: false, status: 'EM_PRODUCAO' });

    render(<OrderTimeline order={order} />);

    // Simple flow labels (materialsProvided = false)
    expect(screen.getByText('Pedido Criado')).toBeInTheDocument();
    expect(screen.getByText('Aceito pela Facção')).toBeInTheDocument();
    expect(screen.getByText('Fila de Produção')).toBeInTheDocument();
    expect(screen.getByText('Em Produção')).toBeInTheDocument();
    expect(screen.getByText('Produção Concluída')).toBeInTheDocument();
    expect(screen.getByText('Em Trânsito → Marca')).toBeInTheDocument();
    expect(screen.getByText('Em Revisão')).toBeInTheDocument();
    expect(screen.getByText('Em Processo de Pagamento')).toBeInTheDocument();
    expect(screen.getByText('Finalizado')).toBeInTheDocument();
  });

  it('deve renderizar todos os status do pedido em ordem (fluxo completo com insumos)', () => {
    const order = buildOrder({ materialsProvided: true, status: 'EM_PRODUCAO' });

    render(<OrderTimeline order={order} />);

    // Full flow labels (materialsProvided = true) — includes transit steps
    expect(screen.getByText('Pedido Criado')).toBeInTheDocument();
    expect(screen.getByText('Aceito pela Facção')).toBeInTheDocument();
    expect(screen.getByText('Insumos em Preparação')).toBeInTheDocument();
    expect(screen.getByText('Insumos em Trânsito')).toBeInTheDocument();
    expect(screen.getByText('Recebido pela Facção')).toBeInTheDocument();
    expect(screen.getByText('Fila de Produção')).toBeInTheDocument();
    expect(screen.getByText('Em Produção')).toBeInTheDocument();
    expect(screen.getByText('Produção Concluída')).toBeInTheDocument();
    expect(screen.getByText('Em Trânsito → Marca')).toBeInTheDocument();
    expect(screen.getByText('Em Revisão')).toBeInTheDocument();
    expect(screen.getByText('Em Processo de Pagamento')).toBeInTheDocument();
    expect(screen.getByText('Finalizado')).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // TC-02: Current status should be visually highlighted
  // -------------------------------------------------------------------------
  it('status atual deve ser destacado visualmente', () => {
    // The current step receives the ring class (brand-colored ring) that
    // non-current steps do not receive.
    const order = buildOrder({ status: 'EM_PRODUCAO' });

    const { container } = render(<OrderTimeline order={order} />);

    // The current step icon wrapper has ring-4 ring-brand-200 classes
    const highlighted = container.querySelectorAll('.ring-4');
    expect(highlighted.length).toBeGreaterThan(0);
  });

  it('step anterior ao atual deve ter classe de concluído (bg-green-500)', () => {
    // ACEITO_PELA_FACCAO comes before EM_PRODUCAO, so it should be green
    const order = buildOrder({ status: 'EM_PRODUCAO' });

    const { container } = render(<OrderTimeline order={order} />);

    const greenSteps = container.querySelectorAll('.bg-green-500');
    expect(greenSteps.length).toBeGreaterThan(0);
  });

  it('steps futuros devem ter aparência inativa (bg-gray-200)', () => {
    // Status is LANCADO_PELA_MARCA — all steps after are future / inactive
    const order = buildOrder({ status: 'LANCADO_PELA_MARCA' });

    const { container } = render(<OrderTimeline order={order} />);

    // At least one inactive step (steps after current)
    const inactiveSteps = container.querySelectorAll('.bg-gray-200, .dark\\:bg-gray-700');
    expect(inactiveSteps.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // TC-03: Should display dates for each status transition
  // -------------------------------------------------------------------------
  it('deve exibir datas de cada transição de status', () => {
    const statusHistory: StatusHistoryEntry[] = [
      buildHistoryEntry('LANCADO_PELA_MARCA', '2024-03-01T08:00:00Z'),
      buildHistoryEntry('ACEITO_PELA_FACCAO', '2024-03-02T09:30:00Z', 'LANCADO_PELA_MARCA'),
      buildHistoryEntry('FILA_DE_PRODUCAO', '2024-03-03T10:00:00Z', 'ACEITO_PELA_FACCAO'),
    ];

    const order = buildOrder({
      materialsProvided: false,
      status: 'FILA_DE_PRODUCAO',
      statusHistory,
    });

    render(<OrderTimeline order={order} />);

    // The component formats dates via toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })
    // We verify that at least one formatted date appears (not the raw ISO string).
    // Brazilian locale: "01/03", "02/03", "03/03" with hours
    expect(screen.getByText(/01\/03/)).toBeInTheDocument();
    expect(screen.getByText(/02\/03/)).toBeInTheDocument();
    expect(screen.getByText(/03\/03/)).toBeInTheDocument();
  });

  it('não deve exibir data para status que ainda não ocorreram', () => {
    // History only has the initial status — future steps have no date
    const statusHistory: StatusHistoryEntry[] = [
      buildHistoryEntry('LANCADO_PELA_MARCA', '2024-03-01T08:00:00Z'),
    ];

    const order = buildOrder({
      materialsProvided: false,
      status: 'LANCADO_PELA_MARCA',
      statusHistory,
    });

    render(<OrderTimeline order={order} />);

    // Only one date should appear (for the first step)
    const dateCells = screen.getAllByText(/\d{2}\/\d{2}/);
    expect(dateCells.length).toBe(1);
  });

  // -------------------------------------------------------------------------
  // TC-04: Terminal statuses should map to last step with correct label
  // -------------------------------------------------------------------------
  it('deve exibir Cancelado na última etapa quando status é CANCELADO', () => {
    const order = buildOrder({ status: 'CANCELADO', materialsProvided: false });

    render(<OrderTimeline order={order} />);

    expect(screen.getByText('Cancelado')).toBeInTheDocument();
  });

  it('deve exibir Reprovado na última etapa quando status é REPROVADO', () => {
    const order = buildOrder({ status: 'REPROVADO', materialsProvided: false });

    render(<OrderTimeline order={order} />);

    expect(screen.getByText('Reprovado')).toBeInTheDocument();
  });

  it('deve exibir Parcialmente Aprovado quando status é PARCIALMENTE_APROVADO', () => {
    const order = buildOrder({ status: 'PARCIALMENTE_APROVADO', materialsProvided: false });

    render(<OrderTimeline order={order} />);

    expect(screen.getByText('Parcialmente Aprovado')).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // TC-05: waitingLabel should appear on current step
  // -------------------------------------------------------------------------
  it('deve exibir waitingLabel no step atual quando fornecido', () => {
    const order = buildOrder({ status: 'LANCADO_PELA_MARCA' });

    render(
      <OrderTimeline
        order={order}
        waitingLabel="Aguardando ação da facção"
      />,
    );

    expect(screen.getByText('Aguardando ação da facção')).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // TC-06: Compact mode should not render the "Progresso" heading
  // -------------------------------------------------------------------------
  it('modo compact não deve renderizar título Progresso', () => {
    const order = buildOrder();

    render(<OrderTimeline order={order} compact={true} />);

    expect(screen.queryByText('Progresso')).not.toBeInTheDocument();
  });

  it('modo padrão deve renderizar título Progresso', () => {
    const order = buildOrder();

    render(<OrderTimeline order={order} />);

    expect(screen.getByText('Progresso')).toBeInTheDocument();
  });
});
