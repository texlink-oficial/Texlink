/**
 * Utilitario para calculo de dias uteis (segunda a sexta).
 *
 * Fase 1: exclui apenas sabados e domingos.
 * Fase 2 (futura): suporte a feriados nacionais/regionais.
 */

/**
 * Nomes dos meses em portugues para exibicao.
 */
const MONTH_NAMES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
] as const;

/**
 * Retorna o nome do mes (em portugues, minusculo) para um dado indice 0-11.
 */
export function getMonthName(month: number): string {
  return MONTH_NAMES[month] ?? '';
}

/**
 * Conta dias uteis (seg-sex) em um determinado mes/ano.
 *
 * @param year  Ano completo (ex: 2026)
 * @param month Mes baseado em 1 (1 = janeiro, 12 = dezembro)
 * @returns Numero de dias uteis no mes
 */
export function getWorkingDaysInMonth(year: number, month: number): number {
  // month e 1-based na API publica; Date usa 0-based
  const zeroMonth = month - 1;
  const daysInMonth = new Date(year, zeroMonth + 1, 0).getDate();

  let count = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const dow = new Date(year, zeroMonth, day).getDay();
    if (dow !== 0 && dow !== 6) {
      count++;
    }
  }
  return count;
}

/**
 * Conta dias uteis restantes a partir de uma data ate o final do mes
 * (incluindo o proprio dia, caso seja dia util).
 *
 * @param fromDate Data de referencia
 * @returns Numero de dias uteis restantes no mes
 */
export function getRemainingWorkingDays(fromDate: Date): number {
  const year = fromDate.getFullYear();
  const month = fromDate.getMonth(); // 0-based
  const startDay = fromDate.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let count = 0;
  for (let day = startDay; day <= daysInMonth; day++) {
    const dow = new Date(year, month, day).getDay();
    if (dow !== 0 && dow !== 6) {
      count++;
    }
  }
  return count;
}

/**
 * Retorna o total de dias uteis no mes corrente.
 */
export function getCurrentMonthWorkingDays(): number {
  const now = new Date();
  return getWorkingDaysInMonth(now.getFullYear(), now.getMonth() + 1);
}

/**
 * Retorna os dias uteis restantes no mes corrente (a partir de hoje, inclusive).
 */
export function getRemainingWorkingDaysThisMonth(): number {
  return getRemainingWorkingDays(new Date());
}
