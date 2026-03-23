/**
 * Suite E2E: Ciclo de Vida de Pedidos
 *
 * Cobre os fluxos de negócio de criação, aceitação, produção, entrega e
 * avaliação de pedidos entre marca (brand) e facção (supplier).
 *
 * Pré-requisitos para execução:
 *   - Frontend rodando em http://localhost:5173
 *   - Backend + banco de dados disponíveis
 *   - Usuários de seed: brand@test.com e supplier@test.com criados com parceria ativa
 *   - O fornecedor supplier@test.com deve ser um parceiro ativo de brand@test.com
 *
 * Casos de teste:
 *   TC-E2E-030: Ciclo completo (brand cria, supplier aceita, produção, entrega, avaliação)
 *   TC-E2E-031: Negociação via chat (proposta de preço alternativo)
 *   TC-E2E-032: Rejeição de pedido com motivo
 */

import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import { loginAs, createAuthenticatedContext } from './helpers/auth';

// ---------------------------------------------------------------------------
// Dados compartilhados entre testes
// ---------------------------------------------------------------------------

/** ID do pedido criado em TC-E2E-030, reaproveitado nos testes seguintes se possível */
let sharedOrderUrl = '';

// ---------------------------------------------------------------------------
// TC-E2E-030: Ciclo completo de pedido
// ---------------------------------------------------------------------------

test.describe('TC-E2E-030: Ciclo completo de pedido', () => {
  let brandContext: BrowserContext;
  let brandPage: Page;
  let supplierContext: BrowserContext;
  let supplierPage: Page;

  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    // Criar dois contextos isolados para simular dois usuários simultâneos
    ({ context: brandContext, page: brandPage } = await createAuthenticatedContext(browser, 'brand'));
    ({ context: supplierContext, page: supplierPage } = await createAuthenticatedContext(browser, 'supplier'));
  });

  test.afterAll(async () => {
    await brandContext.close();
    await supplierContext.close();
  });

  test('passo 1 (BRAND): deve criar novo pedido com fornecedor e aguardar confirmação', async () => {
    // Navegar para página de criação de pedido
    await brandPage.goto('/brand/orders/new');
    await brandPage.waitForSelector('form', { state: 'visible' });

    // Selecionar tipo de produto
    const productTypeSelect = brandPage.locator('select[name="productType"], [data-testid="product-type-select"]');
    await productTypeSelect.first().selectOption({ index: 1 });

    // Preencher nome do produto
    await brandPage.fill('[name="productName"]', 'Camiseta Teste E2E');

    // Preencher quantidade
    await brandPage.fill('[name="quantity"]', '100');

    // Preencher preço por unidade
    await brandPage.fill('[name="pricePerUnit"]', '12.50');

    // Preencher prazo de entrega (em dias)
    const deadlineField = brandPage.locator('[name="deliveryDeadline"], [name="deadline"]');
    if (await deadlineField.count() > 0) {
      await deadlineField.first().fill('30');
    }

    // Selecionar fornecedor (supplier@test.com deve estar na lista de parceiros)
    const supplierSelect = brandPage.locator('select[name="supplierId"], [data-testid="supplier-select"]');
    if (await supplierSelect.count() > 0) {
      // Selecionar o primeiro fornecedor disponível na lista
      await supplierSelect.first().selectOption({ index: 1 });
    } else {
      // Alternativa: buscar e clicar no cartão do fornecedor
      const supplierCard = brandPage.locator('[data-testid="supplier-card"]').first();
      if (await supplierCard.count() > 0) {
        await supplierCard.click();
      }
    }

    // Submeter o formulário
    const submitBtn = brandPage.locator('button[type="submit"]:has-text("Enviar"), button:has-text("Criar Pedido"), button:has-text("Criar pedido")');
    await submitBtn.first().click();

    // Verificar redirecionamento ou mensagem de sucesso
    await expect(brandPage.locator(
      'text=Pedido criado, text=pedido enviado, [data-testid="success-toast"]'
    ).first()).toBeVisible({ timeout: 10000 });

    // Capturar URL do pedido para uso posterior
    await brandPage.waitForURL(/\/brand\/orders\/.+/, { timeout: 10000 });
    sharedOrderUrl = brandPage.url();
  });

  test('passo 2 (BRAND): pedido deve aparecer na lista com status PENDING', async () => {
    await brandPage.goto('/brand/orders');
    await brandPage.waitForSelector('[data-testid="orders-list"], .orders-list, table', { state: 'visible', timeout: 10000 });

    // Verificar que existe ao menos um pedido com status pendente
    const pendingBadge = brandPage.locator('text=Aguardando, text=Pendente, [data-testid="status-PENDING"]');
    await expect(pendingBadge.first()).toBeVisible({ timeout: 5000 });
  });

  test('passo 3 (SUPPLIER): deve visualizar pedido recebido na lista', async () => {
    await supplierPage.goto('/supplier/orders');
    await supplierPage.waitForSelector('[data-testid="orders-list"], .orders-list, table', { state: 'visible', timeout: 10000 });

    // Verificar que existe pedido pendente recebido
    const pendingBadge = supplierPage.locator('text=Aguardando, text=Pendente, [data-testid="status-PENDING"]');
    await expect(pendingBadge.first()).toBeVisible({ timeout: 5000 });
  });

  test('passo 4 (SUPPLIER): deve aceitar o pedido e status deve mudar para ACCEPTED', async () => {
    await supplierPage.goto('/supplier/orders');
    await supplierPage.waitForSelector('[data-testid="orders-list"], table, .min-h-screen', { state: 'visible' });

    // Abrir o primeiro pedido pendente
    const firstOrderLink = supplierPage.locator('a[href*="/supplier/orders/"], tr:has-text("Aguardando"), tr:has-text("Camiseta Teste E2E")');
    await firstOrderLink.first().click();

    // Aguardar carregamento dos detalhes
    await supplierPage.waitForSelector('[data-testid="order-details"], .order-details, h1, h2', { state: 'visible' });

    // Clicar no botão de aceitar
    const acceptBtn = supplierPage.locator(
      'button:has-text("Aceitar"), button:has-text("Aceitar Pedido"), [data-testid="accept-order-btn"]'
    );
    await expect(acceptBtn.first()).toBeVisible({ timeout: 5000 });
    await acceptBtn.first().click();

    // Confirmar no modal se houver
    const confirmBtn = supplierPage.locator(
      'button:has-text("Confirmar"), button:has-text("Aceitar"), [data-testid="confirm-btn"]'
    );
    if (await confirmBtn.count() > 0) {
      await confirmBtn.first().click();
    }

    // Verificar mudança de status
    const acceptedStatus = supplierPage.locator(
      'text=Aceito, text=Em Andamento, [data-testid="status-ACCEPTED"]'
    );
    await expect(acceptedStatus.first()).toBeVisible({ timeout: 10000 });
  });

  test('passo 5 (BRAND): deve visualizar notificação ou status de aceitação', async () => {
    await brandPage.goto('/brand/orders');
    await brandPage.waitForSelector('[data-testid="orders-list"], table, .min-h-screen', { state: 'visible' });

    // O pedido não deve mais aparecer como PENDING — deve estar ACCEPTED
    const acceptedStatus = brandPage.locator(
      'text=Aceito, text=Aceita, text=Em Andamento, [data-testid="status-ACCEPTED"]'
    );
    await expect(acceptedStatus.first()).toBeVisible({ timeout: 10000 });
  });

  test('passo 6 (SUPPLIER): deve atualizar status para IN_PRODUCTION', async () => {
    await supplierPage.goto('/supplier/orders');
    await supplierPage.waitForSelector('[data-testid="orders-list"], table, .min-h-screen', { state: 'visible' });

    // Abrir pedido aceito
    const firstOrderLink = supplierPage.locator(
      'a[href*="/supplier/orders/"], tr:has-text("Aceito"), tr:has-text("Em Andamento"), tr:has-text("Camiseta Teste E2E")'
    );
    await firstOrderLink.first().click();
    await supplierPage.waitForSelector('[data-testid="order-details"], h1, h2', { state: 'visible' });

    // Clicar em "Iniciar Produção"
    const productionBtn = supplierPage.locator(
      'button:has-text("Iniciar Produção"), button:has-text("Em Produção"), [data-testid="start-production-btn"]'
    );
    await expect(productionBtn.first()).toBeVisible({ timeout: 5000 });
    await productionBtn.first().click();

    // Confirmar se houver modal
    const confirmBtn = supplierPage.locator('button:has-text("Confirmar"), button:has-text("Iniciar")');
    if (await confirmBtn.count() > 0) {
      await confirmBtn.first().click();
    }

    // Verificar status IN_PRODUCTION
    const productionStatus = supplierPage.locator(
      'text=Em Produção, text=Produção, [data-testid="status-IN_PRODUCTION"]'
    );
    await expect(productionStatus.first()).toBeVisible({ timeout: 10000 });
  });

  test('passo 7 (SUPPLIER): deve atualizar status para DELIVERED', async () => {
    // Continuar na mesma página de detalhes (ou renavegar)
    const deliveredBtn = supplierPage.locator(
      'button:has-text("Marcar como Entregue"), button:has-text("Entregue"), button:has-text("Entregar"), [data-testid="deliver-btn"]'
    );
    await expect(deliveredBtn.first()).toBeVisible({ timeout: 5000 });
    await deliveredBtn.first().click();

    // Confirmar se houver modal
    const confirmBtn = supplierPage.locator('button:has-text("Confirmar"), button:has-text("Marcar")');
    if (await confirmBtn.count() > 0) {
      await confirmBtn.first().click();
    }

    // Verificar status DELIVERED
    const deliveredStatus = supplierPage.locator(
      'text=Entregue, [data-testid="status-DELIVERED"]'
    );
    await expect(deliveredStatus.first()).toBeVisible({ timeout: 10000 });
  });

  test('passo 8 (BRAND): formulário de avaliação deve aparecer após entrega', async () => {
    await brandPage.goto('/brand/orders');
    await brandPage.waitForSelector('[data-testid="orders-list"], table, .min-h-screen', { state: 'visible' });

    // Abrir pedido entregue
    const deliveredLink = brandPage.locator(
      'a[href*="/brand/orders/"]:near(text=Entregue), tr:has-text("Entregue"), tr:has-text("Camiseta Teste E2E")'
    );
    await deliveredLink.first().click();
    await brandPage.waitForSelector('[data-testid="order-details"], h1, h2', { state: 'visible' });

    // Verificar que o botão/modal de avaliação está disponível
    const ratingBtn = brandPage.locator(
      'button:has-text("Avaliar"), button:has-text("Deixar Avaliação"), [data-testid="rate-btn"], [data-testid="rating-modal"]'
    );
    await expect(ratingBtn.first()).toBeVisible({ timeout: 5000 });
  });

  test('passo 9 (BRAND): deve preencher avaliação com nota 5 e comentário', async () => {
    // Abrir modal de avaliação
    const ratingBtn = brandPage.locator(
      'button:has-text("Avaliar"), button:has-text("Deixar Avaliação"), [data-testid="rate-btn"]'
    );
    if (await ratingBtn.count() > 0) {
      await ratingBtn.first().click();
    }

    // Selecionar nota 5 (estrela) — o modal de avaliação usa estrelas clicáveis
    const star5 = brandPage.locator(
      '[data-testid="star-5"], [data-rating="5"], button[aria-label="5 estrelas"], .star:nth-child(5)'
    );
    if (await star5.count() > 0) {
      await star5.first().click();
    }

    // Preencher comentário
    const commentField = brandPage.locator(
      'textarea[name="comment"], textarea[name="feedback"], [data-testid="rating-comment"]'
    );
    if (await commentField.count() > 0) {
      await commentField.first().fill('Excelente trabalho! Entrega no prazo e qualidade perfeita.');
    }

    // Submeter avaliação
    const submitBtn = brandPage.locator(
      'button:has-text("Enviar Avaliação"), button:has-text("Avaliar"), button[type="submit"]:has-text("Enviar")'
    );
    await submitBtn.first().click();

    // Verificar mensagem de sucesso
    const successMsg = brandPage.locator(
      'text=Avaliação enviada, text=Obrigado pela avaliação, [data-testid="success-toast"]'
    );
    await expect(successMsg.first()).toBeVisible({ timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// TC-E2E-031: Negociação via chat (proposta de preço alternativo)
// ---------------------------------------------------------------------------

test.describe('TC-E2E-031: Negociação via chat', () => {
  let brandContext: BrowserContext;
  let brandPage: Page;
  let supplierContext: BrowserContext;
  let supplierPage: Page;

  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    ({ context: brandContext, page: brandPage } = await createAuthenticatedContext(browser, 'brand'));
    ({ context: supplierContext, page: supplierPage } = await createAuthenticatedContext(browser, 'supplier'));
  });

  test.afterAll(async () => {
    await brandContext.close();
    await supplierContext.close();
  });

  test('(BRAND) deve criar pedido para fornecedor', async () => {
    await brandPage.goto('/brand/orders/new');
    await brandPage.waitForSelector('form', { state: 'visible' });

    const productTypeSelect = brandPage.locator('select[name="productType"], [data-testid="product-type-select"]');
    await productTypeSelect.first().selectOption({ index: 1 });

    await brandPage.fill('[name="productName"]', 'Calça Negociação E2E');
    await brandPage.fill('[name="quantity"]', '200');
    await brandPage.fill('[name="pricePerUnit"]', '25.00');

    const supplierSelect = brandPage.locator('select[name="supplierId"], [data-testid="supplier-select"]');
    if (await supplierSelect.count() > 0) {
      await supplierSelect.first().selectOption({ index: 1 });
    }

    const submitBtn = brandPage.locator(
      'button[type="submit"]:has-text("Enviar"), button:has-text("Criar Pedido"), button:has-text("Criar pedido")'
    );
    await submitBtn.first().click();

    await expect(brandPage.locator(
      'text=Pedido criado, text=pedido enviado, [data-testid="success-toast"]'
    ).first()).toBeVisible({ timeout: 10000 });

    await brandPage.waitForURL(/\/brand\/orders\/.+/, { timeout: 10000 });
  });

  test('(SUPPLIER) deve enviar proposta de preço diferente via chat', async () => {
    await supplierPage.goto('/supplier/orders');
    await supplierPage.waitForSelector('[data-testid="orders-list"], table, .min-h-screen', { state: 'visible' });

    // Abrir o pedido recebido
    const orderLink = supplierPage.locator(
      'a[href*="/supplier/orders/"]:has-text("Calça Negociação E2E"), tr:has-text("Calça Negociação E2E")'
    );
    await orderLink.first().click();
    await supplierPage.waitForSelector('[data-testid="order-details"], h1, h2', { state: 'visible' });

    // Abrir o chat
    const chatBtn = supplierPage.locator(
      'button:has-text("Chat"), button:has-text("Mensagens"), [data-testid="toggle-chat-btn"]'
    );
    if (await chatBtn.count() > 0) {
      await chatBtn.first().click();
    }

    // Aguardar área de chat aparecer
    await supplierPage.waitForSelector(
      '[data-testid="chat-area"], .chat-area, textarea[placeholder*="mensagem"], textarea[placeholder*="Mensagem"]',
      { state: 'visible', timeout: 5000 }
    );

    // Digitar proposta de novo preço
    const chatInput = supplierPage.locator(
      'textarea[placeholder*="mensagem"], textarea[placeholder*="Mensagem"], [data-testid="chat-input"], input[placeholder*="mensagem"]'
    );
    await chatInput.first().fill(
      'Proposta: Consigo fazer por R$ 22,00 por peça para quantidade de 200 unidades.'
    );

    // Enviar mensagem
    const sendBtn = supplierPage.locator(
      'button[type="submit"]:has-text("Enviar"), button[data-testid="send-message-btn"], button:has-text("Enviar")'
    );
    await sendBtn.first().click();

    // Verificar que a mensagem foi exibida no chat
    await expect(supplierPage.locator('text=R$ 22,00').first()).toBeVisible({ timeout: 5000 });
  });

  test('(BRAND) deve receber e visualizar a proposta no chat', async () => {
    // Navegar para o pedido correspondente
    await brandPage.goto('/brand/orders');
    await brandPage.waitForSelector('[data-testid="orders-list"], table, .min-h-screen', { state: 'visible' });

    const orderLink = brandPage.locator(
      'a[href*="/brand/orders/"]:has-text("Calça Negociação E2E"), tr:has-text("Calça Negociação E2E")'
    );
    await orderLink.first().click();
    await brandPage.waitForSelector('[data-testid="order-details"], h1, h2', { state: 'visible' });

    // Abrir o chat
    const chatBtn = brandPage.locator(
      'button:has-text("Chat"), button:has-text("Mensagens"), [data-testid="toggle-chat-btn"]'
    );
    if (await chatBtn.count() > 0) {
      await chatBtn.first().click();
    }

    // Verificar que a proposta do supplier está visível
    await expect(brandPage.locator('text=R$ 22,00').first()).toBeVisible({ timeout: 10000 });
  });

  test('(BRAND) deve aceitar a proposta via mensagem no chat', async () => {
    // Já está na página de detalhes com chat aberto
    const chatInput = brandPage.locator(
      'textarea[placeholder*="mensagem"], textarea[placeholder*="Mensagem"], [data-testid="chat-input"], input[placeholder*="mensagem"]'
    );
    await chatInput.first().fill('Proposta aceita! Pode produzir por R$ 22,00 por peça.');

    const sendBtn = brandPage.locator(
      'button[type="submit"]:has-text("Enviar"), button[data-testid="send-message-btn"], button:has-text("Enviar")'
    );
    await sendBtn.first().click();

    // Verificar que a mensagem de aceitação foi enviada
    await expect(brandPage.locator('text=Proposta aceita').first()).toBeVisible({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// TC-E2E-032: Rejeição de pedido com motivo
// ---------------------------------------------------------------------------

test.describe('TC-E2E-032: Rejeição de pedido com motivo', () => {
  let brandContext: BrowserContext;
  let brandPage: Page;
  let supplierContext: BrowserContext;
  let supplierPage: Page;

  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    ({ context: brandContext, page: brandPage } = await createAuthenticatedContext(browser, 'brand'));
    ({ context: supplierContext, page: supplierPage } = await createAuthenticatedContext(browser, 'supplier'));
  });

  test.afterAll(async () => {
    await brandContext.close();
    await supplierContext.close();
  });

  test('(BRAND) deve criar pedido para o fornecedor', async () => {
    await brandPage.goto('/brand/orders/new');
    await brandPage.waitForSelector('form', { state: 'visible' });

    const productTypeSelect = brandPage.locator('select[name="productType"], [data-testid="product-type-select"]');
    await productTypeSelect.first().selectOption({ index: 1 });

    await brandPage.fill('[name="productName"]', 'Jaqueta Rejeição E2E');
    await brandPage.fill('[name="quantity"]', '500');
    await brandPage.fill('[name="pricePerUnit"]', '5.00');

    const supplierSelect = brandPage.locator('select[name="supplierId"], [data-testid="supplier-select"]');
    if (await supplierSelect.count() > 0) {
      await supplierSelect.first().selectOption({ index: 1 });
    }

    const submitBtn = brandPage.locator(
      'button[type="submit"]:has-text("Enviar"), button:has-text("Criar Pedido"), button:has-text("Criar pedido")'
    );
    await submitBtn.first().click();

    await expect(brandPage.locator(
      'text=Pedido criado, text=pedido enviado, [data-testid="success-toast"]'
    ).first()).toBeVisible({ timeout: 10000 });

    await brandPage.waitForURL(/\/brand\/orders\/.+/, { timeout: 10000 });
  });

  test('(SUPPLIER) deve rejeitar o pedido informando motivo', async () => {
    await supplierPage.goto('/supplier/orders');
    await supplierPage.waitForSelector('[data-testid="orders-list"], table, .min-h-screen', { state: 'visible' });

    // Abrir pedido
    const orderLink = supplierPage.locator(
      'a[href*="/supplier/orders/"]:has-text("Jaqueta Rejeição E2E"), tr:has-text("Jaqueta Rejeição E2E")'
    );
    await orderLink.first().click();
    await supplierPage.waitForSelector('[data-testid="order-details"], h1, h2', { state: 'visible' });

    // Clicar em Rejeitar
    const rejectBtn = supplierPage.locator(
      'button:has-text("Rejeitar"), button:has-text("Recusar"), [data-testid="reject-order-btn"]'
    );
    await expect(rejectBtn.first()).toBeVisible({ timeout: 5000 });
    await rejectBtn.first().click();

    // Modal de rejeição deve aparecer com campo de motivo
    const reasonField = supplierPage.locator(
      'textarea[name="reason"], textarea[placeholder*="motivo"], textarea[placeholder*="Motivo"], [data-testid="reject-reason-input"]'
    );
    await expect(reasonField.first()).toBeVisible({ timeout: 5000 });

    // Preencher motivo
    await reasonField.first().fill(
      'Prazo muito curto para quantidade solicitada. Nossa capacidade está comprometida este mês.'
    );

    // Confirmar rejeição
    const confirmRejectBtn = supplierPage.locator(
      'button:has-text("Confirmar Rejeição"), button:has-text("Rejeitar"), button[data-testid="confirm-reject-btn"]'
    );
    await confirmRejectBtn.first().click();

    // Verificar status REJECTED na página do supplier
    const rejectedStatus = supplierPage.locator(
      'text=Rejeitado, text=Recusado, [data-testid="status-REJECTED"]'
    );
    await expect(rejectedStatus.first()).toBeVisible({ timeout: 10000 });
  });

  test('(BRAND) deve visualizar pedido com status REJECTED e motivo exibido', async () => {
    await brandPage.goto('/brand/orders');
    await brandPage.waitForSelector('[data-testid="orders-list"], table, .min-h-screen', { state: 'visible' });

    // Abrir pedido rejeitado
    const orderLink = brandPage.locator(
      'a[href*="/brand/orders/"]:has-text("Jaqueta Rejeição E2E"), tr:has-text("Jaqueta Rejeição E2E")'
    );
    await orderLink.first().click();
    await brandPage.waitForSelector('[data-testid="order-details"], h1, h2', { state: 'visible' });

    // Verificar status REJECTED
    const rejectedStatus = brandPage.locator(
      'text=Rejeitado, text=Recusado, [data-testid="status-REJECTED"]'
    );
    await expect(rejectedStatus.first()).toBeVisible({ timeout: 5000 });

    // Verificar que o motivo de rejeição está exibido
    const rejectionReason = brandPage.locator(
      'text=Prazo muito curto, text=capacidade está comprometida, [data-testid="rejection-reason"]'
    );
    await expect(rejectionReason.first()).toBeVisible({ timeout: 5000 });
  });
});
