import { CurrencyTotal, MoneyRetirement, Sale } from '../../types';

export function isFullRetirement(r: MoneyRetirement): boolean {
  return r.mode === 'full' || (r.mode == null && (r.amount == null || r.amount <= 0));
}

export function isPartialRetirement(r: MoneyRetirement): boolean {
  return r.mode === 'partial' || (r.mode == null && r.amount != null && r.amount > 0);
}

/** Latest full retirement cutoff for a currency (YYYY-MM-DD), or null if none. */
export function getLastRetirementDate(
  retirements: MoneyRetirement[],
  currency: string
): string | null {
  const dates = retirements
    .filter(r => r.currency === currency && isFullRetirement(r))
    .map(r => r.date)
    .sort();
  return dates.length > 0 ? dates[dates.length - 1] : null;
}

function sumPartialAmounts(
  retirements: MoneyRetirement[],
  currency: string,
  cutoff: string | null
): number {
  return retirements
    .filter(
      r =>
        r.currency === currency &&
        isPartialRetirement(r) &&
        (!cutoff || r.date > cutoff)
    )
    .reduce((sum, r) => sum + (r.amount || 0), 0);
}

/**
 * Available cash per currency:
 * sum(sales after last full cutoff) − sum(partial withdrawals after that cutoff).
 */
export function getAvailableCashByCurrency(
  sales: Sale[],
  retirements: MoneyRetirement[]
): CurrencyTotal {
  const currencies = new Set<string>();
  sales.forEach(s => {
    if (s.currency) currencies.add(s.currency);
  });
  retirements.forEach(r => currencies.add(r.currency));

  const result: CurrencyTotal = {};
  currencies.forEach(currency => {
    const cutoff = getLastRetirementDate(retirements, currency);
    const gross = sales
      .filter(s => s.currency === currency && (!cutoff || s.dateSold > cutoff))
      .reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const partials = sumPartialAmounts(retirements, currency, cutoff);
    result[currency] = Math.max(0, gross - partials);
  });

  return Object.fromEntries(
    Object.entries(result).filter(
      ([currency, amount]) =>
        amount > 0 || retirements.some(r => r.currency === currency)
    )
  );
}

export function countSalesAfterRetirement(
  sales: Sale[],
  retirements: MoneyRetirement[],
  currency: string
): number {
  const cutoff = getLastRetirementDate(retirements, currency);
  return sales.filter(s => s.currency === currency && (!cutoff || s.dateSold > cutoff)).length;
}

export function getTotalPartialWithdrawn(
  retirements: MoneyRetirement[],
  currency: string
): number {
  const cutoff = getLastRetirementDate(retirements, currency);
  return sumPartialAmounts(retirements, currency, cutoff);
}
