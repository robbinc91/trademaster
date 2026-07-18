import { ConversionRates, CurrencyTotal, StoreData } from '../../types';

export function getConversionRate(
  fromCurrency: string,
  toCurrency: string,
  rates: ConversionRates
): number {
  if (fromCurrency === toCurrency) return 1;

  let valueInCUP = 1;
  if (fromCurrency === 'USD') {
    valueInCUP = rates.USD;
  } else if (fromCurrency === 'EUR') {
    valueInCUP = rates.EUR;
  } else if (fromCurrency === 'CUP') {
    valueInCUP = 1;
  } else {
    valueInCUP = 1;
  }

  if (toCurrency === 'USD') {
    return valueInCUP / rates.USD;
  } else if (toCurrency === 'EUR') {
    return valueInCUP / rates.EUR;
  } else if (toCurrency === 'CUP') {
    return valueInCUP;
  }

  return 1;
}

/** Same net profit formula as Statistics (all participants, all currencies). */
export function computeNetProfit(
  data: StoreData,
  profitCurrency: 'USD' | 'CUP'
): number {
  const rates = data.rates;
  const spendingByParticipant: Record<string, CurrencyTotal> = {};

  data.items.forEach(item => {
    if (!item.buyerId) return;
    if (!spendingByParticipant[item.buyerId]) spendingByParticipant[item.buyerId] = {};
    const currency = item.buyCurrency || 'N/A';
    const cost = (item.buyPrice || 0) * (item.initialQuantity || 0);
    spendingByParticipant[item.buyerId][currency] =
      (spendingByParticipant[item.buyerId][currency] || 0) + cost;
    if (item.transportCost > 0) {
      const tc = item.transportCurrency || 'N/A';
      spendingByParticipant[item.buyerId][tc] =
        (spendingByParticipant[item.buyerId][tc] || 0) + item.transportCost;
    }
  });

  data.sales.forEach(sale => {
    if (!sale.transportCost || sale.transportCost <= 0) return;
    const payerId = sale.transportPaidByParticipantId;
    if (!payerId) return;
    if (!spendingByParticipant[payerId]) spendingByParticipant[payerId] = {};
    const tc = sale.transportCurrency || 'N/A';
    spendingByParticipant[payerId][tc] =
      (spendingByParticipant[payerId][tc] || 0) + sale.transportCost;
  });

  let totalSpending = 0;
  Object.values(spendingByParticipant).forEach(currencies => {
    Object.entries(currencies).forEach(([currency, amount]) => {
      totalSpending += amount * getConversionRate(currency, profitCurrency, rates);
    });
  });

  let totalRevenue = 0;
  data.sales.forEach(sale => {
    totalRevenue +=
      (sale.totalAmount || 0) *
      getConversionRate(sale.currency || 'CUP', profitCurrency, rates);
  });

  let totalSalesTransport = 0;
  data.sales.forEach(sale => {
    totalSalesTransport +=
      (sale.transportCost || 0) *
      getConversionRate(sale.transportCurrency || 'CUP', profitCurrency, rates);
  });

  let attributedSaleTransportTotal = 0;
  data.sales.forEach(sale => {
    if (!sale.transportCost || sale.transportCost <= 0) return;
    if (!sale.transportPaidByParticipantId) return;
    attributedSaleTransportTotal +=
      sale.transportCost *
      getConversionRate(sale.transportCurrency || 'CUP', profitCurrency, rates);
  });

  return totalRevenue - totalSpending - (totalSalesTransport - attributedSaleTransportTotal);
}

export type InventoryValueByCurrency = {
  /** Remaining qty × buy price, keyed by buy currency. */
  atCost: CurrencyTotal;
  /** Remaining qty × sell price, keyed by sell currency. */
  atSell: CurrencyTotal;
};

/** Remaining stock valued at both buy and sell prices. */
export function computeInventoryValueByCurrency(data: StoreData): InventoryValueByCurrency {
  const atCost: CurrencyTotal = {};
  const atSell: CurrencyTotal = {};
  data.items.forEach(item => {
    const qty = item.quantity || 0;
    if (qty <= 0) return;

    const buyCur = item.buyCurrency || 'N/A';
    const cost = (item.buyPrice || 0) * qty;
    if (cost > 0) atCost[buyCur] = (atCost[buyCur] || 0) + cost;

    const sellCur = item.sellCurrency || 'N/A';
    const sell = (item.sellPrice || 0) * qty;
    if (sell > 0) atSell[sellCur] = (atSell[sellCur] || 0) + sell;
  });
  return { atCost, atSell };
}

export type PartnerBalanceTeaserRow = {
  participantId: string;
  name: string;
  currency: string;
  difference: number;
  status: 'receives' | 'owes' | 'balanced';
};

/** Compact partner imbalances (same investment / equal-share logic as Balance). */
export function computePartnerBalanceTeasers(data: StoreData): PartnerBalanceTeaserRow[] {
  const investment: Record<string, CurrencyTotal> = {};

  data.items.forEach(item => {
    if (!item.buyerId) return;
    if (!investment[item.buyerId]) investment[item.buyerId] = {};
    const currency = item.buyCurrency || 'N/A';
    const cost = (item.buyPrice || 0) * (item.initialQuantity || 0);
    investment[item.buyerId][currency] = (investment[item.buyerId][currency] || 0) + cost;
    if (item.transportCost > 0) {
      const tc = item.transportCurrency || 'N/A';
      investment[item.buyerId][tc] = (investment[item.buyerId][tc] || 0) + item.transportCost;
    }
  });

  data.sales.forEach(sale => {
    if (!sale.transportCost || sale.transportCost <= 0) return;
    const payerId = sale.transportPaidByParticipantId;
    if (!payerId) return;
    if (!investment[payerId]) investment[payerId] = {};
    const tc = sale.transportCurrency || 'N/A';
    investment[payerId][tc] = (investment[payerId][tc] || 0) + sale.transportCost;
  });

  const paid: Record<string, CurrencyTotal> = {};
  const received: Record<string, CurrencyTotal> = {};
  data.adjustments.forEach(adj => {
    if (!paid[adj.fromParticipantId]) paid[adj.fromParticipantId] = {};
    paid[adj.fromParticipantId][adj.currency] =
      (paid[adj.fromParticipantId][adj.currency] || 0) + adj.amount;
    if (!received[adj.toParticipantId]) received[adj.toParticipantId] = {};
    received[adj.toParticipantId][adj.currency] =
      (received[adj.toParticipantId][adj.currency] || 0) + adj.amount;
  });

  const currencies = new Set<string>();
  Object.values(investment).forEach(c => Object.keys(c).forEach(k => currencies.add(k)));
  data.adjustments.forEach(a => currencies.add(a.currency));

  const nameOf = (id: string) => data.participants.find(p => p.id === id)?.name || id;
  const rows: PartnerBalanceTeaserRow[] = [];

  currencies.forEach(currency => {
    const participantIds = new Set<string>();
    Object.entries(investment).forEach(([pid, totals]) => {
      if (totals[currency]) participantIds.add(pid);
    });
    data.adjustments.forEach(adj => {
      if (adj.currency === currency) {
        participantIds.add(adj.fromParticipantId);
        participantIds.add(adj.toParticipantId);
      }
    });
    const ids = Array.from(participantIds);
    if (ids.length === 0) return;

    let totalInvestment = 0;
    ids.forEach(pid => {
      totalInvestment += investment[pid]?.[currency] || 0;
    });
    const equalShare = totalInvestment / ids.length;

    ids.forEach(pid => {
      const invested = investment[pid]?.[currency] || 0;
      const netAdj = (paid[pid]?.[currency] || 0) - (received[pid]?.[currency] || 0);
      const difference = invested + netAdj - equalShare;
      let status: PartnerBalanceTeaserRow['status'] = 'balanced';
      if (difference > 0.01) status = 'receives';
      else if (difference < -0.01) status = 'owes';
      if (status === 'balanced') return;
      rows.push({
        participantId: pid,
        name: nameOf(pid),
        currency,
        difference,
        status
      });
    });
  });

  return rows.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
}
