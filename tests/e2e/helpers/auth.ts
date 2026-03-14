import { Page } from '@playwright/test';

/**
 * Credenciais de teste por papel (role).
 * Essas contas devem existir no banco de dados de teste com os dados de seed.
 */
const CREDENTIALS: Record<'brand' | 'supplier' | 'admin', { email: string; password: string }> = {
  brand: { email: 'brand@test.com', password: 'Test@123' },
  supplier: { email: 'supplier@test.com', password: 'Test@123' },
  admin: { email: 'admin@test.com', password: 'Test@123' },
};

/**
 * Padrões de URL esperados após login por papel.
 */
const DASHBOARD_PATTERNS: Record<'brand' | 'supplier' | 'admin', RegExp> = {
  brand: /\/brand\//,
  supplier: /\/supplier\//,
  admin: /\/admin\//,
};

/**
 * Realiza login como um papel específico e aguarda o redirecionamento para o
 * dashboard correspondente.
 *
 * @param page  - Instância da página Playwright
 * @param role  - Papel do usuário: 'brand', 'supplier' ou 'admin'
 */
export async function loginAs(page: Page, role: 'brand' | 'supplier' | 'admin'): Promise<void> {
  const { email, password } = CREDENTIALS[role];

  await page.goto('/login');

  // Aguarda o formulário estar visível antes de interagir
  await page.waitForSelector('form', { state: 'visible' });

  await page.fill('[name="email"]', email);
  await page.fill('[name="password"]', password);
  await page.click('button[type="submit"]');

  // Aguarda redirecionamento para o dashboard do papel correto
  await page.waitForURL(DASHBOARD_PATTERNS[role], { timeout: 10000 });
}

/**
 * Realiza logout do usuário atual e aguarda o redirecionamento para /login.
 *
 * @param page - Instância da página Playwright
 */
export async function logout(page: Page): Promise<void> {
  // Tenta clicar no menu de perfil e depois em sair
  // A estrutura do menu pode variar; usar seletor pelo texto é mais resiliente
  const logoutBtn = page.locator('button:has-text("Sair"), a:has-text("Sair")');
  if (await logoutBtn.count() > 0) {
    await logoutBtn.first().click();
  } else {
    // Fallback: limpar storage e navegar para login
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
    await page.goto('/login');
  }
  await page.waitForURL('/login', { timeout: 5000 });
}

/**
 * Cria e retorna um contexto de navegação isolado com sessão de brand já
 * autenticada, sem interferir com a página principal (multi-usuário).
 *
 * Uso: útil em testes que precisam de dois usuários simultâneos (ex.: brand
 * e supplier interagindo no mesmo fluxo).
 *
 * @param browser    - Instância do Browser Playwright
 * @param role       - Papel do usuário para o contexto isolado
 * @returns          - Objeto { context, page } prontos para uso
 */
export async function createAuthenticatedContext(
  browser: import('@playwright/test').Browser,
  role: 'brand' | 'supplier' | 'admin',
): Promise<{ context: import('@playwright/test').BrowserContext; page: Page }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await loginAs(page, role);
  return { context, page };
}
