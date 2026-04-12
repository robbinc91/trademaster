// --- Types ---
import type { Language } from '../../contexts/LanguageContext';

export type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

// --- Helpers ---
const localeFor = (lang: Language): string => (lang === 'es' ? 'es-ES' : 'en-US');

const formatCurrency = (amount: number, currency: string, locale: string): string => {
    return `${amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
};

type ItemLike = { buyCurrency?: string; buyPrice?: number; quantity?: number; productId?: string };

/** Inventory items use `buyCurrency`, not `currency`. */
const itemBuyCurrency = (item: ItemLike): string => (item.buyCurrency || 'CUP').toUpperCase();

function metaLine(t: TranslateFn, contextKey: string, lang: Language): string {
    const datetime = new Date().toLocaleString(localeFor(lang));
    return t('pdf_subtitle_line', {
        brand: t('pdf_brand'),
        context: t(contextKey),
        datetime
    });
}

/**
 * Full HTML document for PDF export (same shell as Electron print window).
 */
export const wrapReportHtml = (bodyFragment: string, lang: Language = 'en'): string => {
    return `<!DOCTYPE html>
<html lang="${lang}">
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
      h1 { color: #1F4E79; text-align: center; font-size: 28px; margin-bottom: 5px; }
      h2 { color: #666; text-align: center; font-size: 14px; margin-top: 0; margin-bottom: 30px; font-weight: normal; }
      h3 { color: #1F4E79; font-size: 18px; margin-top: 30px; border-bottom: 2px solid #1F4E79; padding-bottom: 5px; }
      table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
      th, td { border: 1px solid #ddd; padding: 10px 12px; text-align: left; }
      th { background-color: #1F4E79; color: white; font-weight: bold; }
      tr:nth-child(even) { background-color: #f9f9f9; }
      .summary-container { display: flex; justify-content: space-between; gap: 15px; margin-bottom: 30px; }
      .summary-card { flex: 1; border: 1px solid #ddd; padding: 15px; text-align: center; border-radius: 6px; }
      .summary-value { font-size: 20px; font-weight: bold; margin-top: 5px; }
      .text-primary { color: #1F4E79; }
      .text-secondary { color: #2E7D32; }
      .text-accent { color: #F57C00; }
      .text-danger { color: #D32F2F; }
      .text-right { text-align: right; }
      .pdf-dual { display: inline-block; text-align: right; vertical-align: top; }
      .pdf-dual .pdf-cup { display: block; font-weight: 600; }
      .pdf-dual .pdf-usd { display: block; font-size: 10px; color: #444; margin-top: 3px; font-weight: normal; }
      .pdf-dual--summary .pdf-cup { font-size: 18px; }
      .pdf-dual--summary .pdf-usd { font-size: 13px; margin-top: 4px; }
      .pdf-dual--compact .pdf-cup { font-size: 11px; }
      .pdf-dual--compact .pdf-usd { font-size: 10px; margin-top: 2px; }
    </style>
  </head>
  <body>
    ${bodyFragment}
  </body>
</html>`;
};

const formatDate = (dateStr: string, locale: string): string => {
    try {
        return new Date(dateStr).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
        return dateStr;
    }
};

const getProductName = (productId: string, products: any[], t: TranslateFn): string => {
    const product = products.find(p => p.id === productId);
    return product?.name || t('pdf_unknown');
};

const getParticipantName = (participantId: string, participants: any[], t: TranslateFn): string => {
    const participant = participants.find(p => p.id === participantId);
    return participant?.name || t('pdf_unknown');
};

const convertToCUP = (amount: number, currency: string, rates: any = {}): number => {
    if (!amount) return 0;
    const curr = (currency || 'CUP').toUpperCase();
    if (curr === 'CUP') return amount;

    const rate = rates[curr] || 1;
    return amount * rate;
};

/** CUP per 1 USD — inverse of convertToCUP for USD amounts. */
const cupToUsd = (cupAmount: number, rates: any): number | null => {
    const r = rates?.USD;
    if (!r || r <= 0 || !Number.isFinite(cupAmount)) return null;
    return cupAmount / r;
};

const formatDualCupUsd = (
    cupAmount: number,
    rates: any,
    loc: string,
    variant: 'summary' | 'table' | 'compact' = 'table'
): string => {
    const usd = cupToUsd(cupAmount, rates);
    const usdHtml =
        usd === null
            ? `<span class="pdf-usd">—</span>`
            : `<span class="pdf-usd">${formatCurrency(usd, 'USD', loc)}</span>`;
    const cls =
        variant === 'summary' ? 'pdf-dual pdf-dual--summary' : variant === 'compact' ? 'pdf-dual pdf-dual--compact' : 'pdf-dual';
    return `<span class="${cls}"><span class="pdf-cup">${formatCurrency(cupAmount, 'CUP', loc)}</span>${usdHtml}</span>`;
};

// --- Report Generators ---

export const generateSalesSummaryHtml = (data: any, t: TranslateFn, lang: Language): string => {
    const loc = localeFor(lang);
    const { sales = [], rates = {} } = data;
    const totalSales = sales.length;

    const totalRevenueCUP = sales.reduce((sum: number, sale: any) => {
        return sum + convertToCUP(sale.totalAmount, sale.currency, rates);
    }, 0);

    const rows = sales.map((sale: any) => `
        <tr>
            <td>${formatDate(sale.dateSold, loc)}</td>
            <td>${sale.customerPhone || t('pdf_walk_in')}</td>
            <td>${t('pdf_items_count', { count: sale.items?.length || 0 })}</td>
            <td class="text-right font-bold text-secondary">${formatCurrency(sale.totalAmount, sale.currency || 'CUP', loc)}</td>
        </tr>
    `).join('');

    return `
        <h1>${t('pdf_sales_summary_title')}</h1>
        <h2>${metaLine(t, 'pdf_sales_context', lang)}</h2>
        
        <div class="summary-container">
            <div class="summary-card">
                <div>${t('pdf_total_transactions')}</div>
                <div class="summary-value text-primary">${totalSales}</div>
            </div>
            <div class="summary-card">
                <div>${t('pdf_total_revenue_converted')}</div>
                <div class="summary-value text-secondary">${formatDualCupUsd(totalRevenueCUP, rates, loc, 'summary')}</div>
            </div>
        </div>

        <h3>${t('pdf_recent_transactions')}</h3>
        <table>
            <thead><tr><th>${t('pdf_col_date')}</th><th>${t('pdf_col_customer')}</th><th>${t('pdf_col_items')}</th><th class="text-right">${t('pdf_col_original_total')}</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
    `;
};

export const generateInventoryHtml = (data: any, t: TranslateFn, lang: Language): string => {
    const loc = localeFor(lang);
    const { items = [], products = [], rates = {} } = data;

    const totalItems = items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);

    const totalValueCUP = items.reduce((sum: number, item: any) => {
        const itemValue = (item.buyPrice || 0) * (item.quantity || 0);
        return sum + convertToCUP(itemValue, itemBuyCurrency(item), rates);
    }, 0);

    const rows = items.map((item: any) => {
        const itemTotalCUP = convertToCUP((item.buyPrice || 0) * (item.quantity || 0), itemBuyCurrency(item), rates);
        return `
            <tr>
                <td>${getProductName(item.productId, products, t)}</td>
                <td>${item.quantity || 0}</td>
                <td class="text-right">${formatCurrency(item.buyPrice || 0, itemBuyCurrency(item), loc)}</td>
                <td class="text-right font-bold">${formatDualCupUsd(itemTotalCUP, rates, loc)}</td>
            </tr>
        `;
    }).join('');

    return `
        <h1>${t('pdf_inventory_title')}</h1>
        <h2>${metaLine(t, 'pdf_inventory_context', lang)}</h2>
        
        <div class="summary-container">
            <div class="summary-card">
                <div>${t('pdf_total_units_stock')}</div>
                <div class="summary-value text-primary">${totalItems}</div>
            </div>
            <div class="summary-card">
                <div>${t('pdf_total_inventory_value_converted')}</div>
                <div class="summary-value text-secondary">${formatDualCupUsd(totalValueCUP, rates, loc, 'summary')}</div>
            </div>
        </div>

        <h3>${t('pdf_current_stock_details')}</h3>
        <table>
            <thead><tr><th>${t('pdf_col_product')}</th><th>${t('pdf_col_quantity')}</th><th class="text-right">${t('pdf_col_unit_price_orig')}</th><th class="text-right">${t('pdf_col_total_value_cup')}</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
    `;
};

export const generateProfitLossHtml = (data: any, t: TranslateFn, lang: Language): string => {
    const loc = localeFor(lang);
    const { items = [], sales = [], rates = {} } = data;
    const itemsMap = new Map(items.map((i: any) => [i.id, i]));

    const totalRevenueCUP = sales.reduce((sum: number, sale: any) => sum + convertToCUP(sale.totalAmount, sale.currency, rates), 0);
    const totalTransportCUP = sales.reduce((sum: number, sale: any) => sum + convertToCUP(sale.transportCost, sale.transportCurrency, rates), 0);

    let cogSoldCUP = 0;
    sales.forEach((sale: any) => {
        sale.items?.forEach((line: any) => {
            const originalItem = itemsMap.get(line.itemId);
            if (originalItem) {
                const cost = (originalItem.buyPrice || 0) * (line.quantity || 0);
                cogSoldCUP += convertToCUP(cost, itemBuyCurrency(originalItem), rates);
            }
        });
    });

    const grossProfitCUP = totalRevenueCUP - cogSoldCUP;
    const netProfitCUP = grossProfitCUP - totalTransportCUP;

    return `
        <h1>${t('pdf_profit_loss_title')}</h1>
        <h2>${metaLine(t, 'pdf_pl_context', lang)}</h2>
        
        <div class="summary-container">
            <div class="summary-card">
                <div>${t('pdf_total_revenue_cup')}</div>
                <div class="summary-value text-secondary">${formatDualCupUsd(totalRevenueCUP, rates, loc, 'summary')}</div>
            </div>
            <div class="summary-card">
                <div>${t('pdf_cogs_cup')}</div>
                <div class="summary-value text-danger">${formatDualCupUsd(cogSoldCUP, rates, loc, 'summary')}</div>
            </div>
            <div class="summary-card">
                <div>${t('pdf_net_profit_cup_label')}</div>
                <div class="summary-value ${netProfitCUP >= 0 ? 'text-secondary' : 'text-danger'}">${formatDualCupUsd(netProfitCUP, rates, loc, 'summary')}</div>
            </div>
        </div>

        <h3>${t('pdf_financial_breakdown_cup')}</h3>
        <table>
            <thead><tr><th>${t('pdf_col_category')}</th><th class="text-right">${t('pdf_col_amount')}</th></tr></thead>
            <tbody>
                <tr><td><strong>${t('pdf_gross_revenue_sales')}</strong></td><td class="text-right text-secondary">${formatDualCupUsd(totalRevenueCUP, rates, loc)}</td></tr>
                <tr><td>${t('pdf_cogs_inventory_value')}</td><td class="text-right text-danger">- ${formatDualCupUsd(cogSoldCUP, rates, loc)}</td></tr>
                <tr style="background-color: #f0f4f8;"><td><strong>${t('pdf_gross_profit')}</strong></td><td class="text-right text-primary"><strong>${formatDualCupUsd(grossProfitCUP, rates, loc)}</strong></td></tr>
                <tr><td>${t('pdf_operating_transport')}</td><td class="text-right text-danger">- ${formatDualCupUsd(totalTransportCUP, rates, loc)}</td></tr>
                <tr style="background-color: #e8f5e9;"><td><strong>${t('pdf_net_profit')}</strong></td><td class="text-right ${netProfitCUP >= 0 ? 'text-secondary' : 'text-danger'}"><strong>${formatDualCupUsd(netProfitCUP, rates, loc)}</strong></td></tr>
            </tbody>
        </table>
    `;
};

export const generateSalesHistoryHtml = (data: any, t: TranslateFn, lang: Language): string => {
    const loc = localeFor(lang);
    const { sales = [], items = [], products = [], rates = {} } = data;
    const itemsMap = new Map(items.map((i: any) => [i.id, i]));
    const sortedSales = [...sales].sort((a: any, b: any) => (b.dateSold || '').localeCompare(a.dateSold || ''));

    const totalRevenueCUP = sales.reduce((sum: number, sale: any) => sum + convertToCUP(sale.totalAmount, sale.currency, rates), 0);
    const avgSaleCUP = sales.length > 0 ? totalRevenueCUP / sales.length : 0;

    const rows = sortedSales.map((sale: any) => {
        const itemCount = sale.items?.length || 0;
        const firstItem = sale.items?.[0];
        let description = t('pdf_no_items');
        if (firstItem) {
            const original = itemsMap.get(firstItem.itemId);
            const name = original ? getProductName(original.productId, products, t) : t('pdf_unknown');
            description = `${name} (${firstItem.quantity})` + (itemCount > 1 ? ` ${t('pdf_more_items', { count: itemCount - 1 })}` : '');
        }

        const convertedTotal = convertToCUP(sale.totalAmount, sale.currency, rates);

        return `
            <tr>
                <td>${formatDate(sale.dateSold, loc)}</td>
                <td>${sale.customerPhone || t('pdf_walk_in')}</td>
                <td>${description}</td>
                <td class="text-right">
                    <span class="font-bold">${formatCurrency(sale.totalAmount, sale.currency || 'CUP', loc)}</span>
                    <br/>
                    ${formatDualCupUsd(convertedTotal, rates, loc, 'compact')}
                </td>
            </tr>
        `;
    }).join('');

    return `
        <h1>${t('pdf_sales_history_title')}</h1>
        <h2>${metaLine(t, 'pdf_history_context', lang)}</h2>
        
        <div class="summary-container">
            <div class="summary-card">
                <div>${t('pdf_total_transactions')}</div>
                <div class="summary-value text-primary">${sales.length}</div>
            </div>
            <div class="summary-card">
                <div>${t('pdf_total_revenue_cup')}</div>
                <div class="summary-value text-secondary">${formatDualCupUsd(totalRevenueCUP, rates, loc, 'summary')}</div>
            </div>
            <div class="summary-card">
                <div>${t('pdf_avg_sale_cup')}</div>
                <div class="summary-value text-accent">${formatDualCupUsd(avgSaleCUP, rates, loc, 'summary')}</div>
            </div>
        </div>

        <table>
            <thead><tr><th>${t('pdf_col_date')}</th><th>${t('pdf_col_customer')}</th><th>${t('pdf_col_items_summary')}</th><th class="text-right">${t('pdf_col_total')}</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
    `;
};

export const generateAdjustmentsHtml = (data: any, t: TranslateFn, lang: Language): string => {
    const loc = localeFor(lang);
    const { adjustments = [], participants = [], rates = {} } = data;
    const sortedAdjustments = [...adjustments].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const rows = sortedAdjustments.map((adj: any) => {
        const convertedAmount = convertToCUP(adj.amount, adj.currency, rates);

        return `
            <tr>
                <td>${formatDate(adj.date, loc)}</td>
                <td>${getParticipantName(adj.fromParticipantId, participants, t)}</td>
                <td>${getParticipantName(adj.toParticipantId, participants, t)}</td>
                <td>${adj.note || '-'}</td>
                <td class="text-right">
                    <span class="font-bold">${formatCurrency(adj.amount, adj.currency || 'CUP', loc)}</span>
                    <br/>
                    ${formatDualCupUsd(convertedAmount, rates, loc, 'compact')}
                </td>
            </tr>
        `;
    }).join('');

    return `
        <h1>${t('pdf_adjustments_title')}</h1>
        <h2>${metaLine(t, 'pdf_adj_context', lang)}</h2>
        <table>
            <thead><tr><th>${t('pdf_col_date')}</th><th>${t('pdf_col_from')}</th><th>${t('pdf_col_to')}</th><th>${t('pdf_col_note')}</th><th class="text-right">${t('pdf_col_amount')}</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
    `;
};

/** Partner balances: investment in purchases + transport, adjustments, equal share (same logic as Balance view). */
export const generatePartnerStatementHtml = (data: any, t: TranslateFn, lang: Language): string => {
    const loc = localeFor(lang);
    const { items = [], adjustments = [], participants = [], rates = {} } = data;

    const investmentByParticipant: Record<string, Record<string, number>> = {};
    items.forEach((item: any) => {
        if (!item.buyerId) return;
        if (!investmentByParticipant[item.buyerId]) investmentByParticipant[item.buyerId] = {};
        const buyCur = item.buyCurrency || 'N/A';
        const cost = (item.buyPrice || 0) * (item.initialQuantity || 0);
        investmentByParticipant[item.buyerId][buyCur] =
            (investmentByParticipant[item.buyerId][buyCur] || 0) + cost;
        if (item.transportCost > 0) {
            const tc = item.transportCurrency || 'N/A';
            investmentByParticipant[item.buyerId][tc] =
                (investmentByParticipant[item.buyerId][tc] || 0) + item.transportCost;
        }
    });

    const paid: Record<string, Record<string, number>> = {};
    const received: Record<string, Record<string, number>> = {};
    adjustments.forEach((adj: any) => {
        if (!paid[adj.fromParticipantId]) paid[adj.fromParticipantId] = {};
        paid[adj.fromParticipantId][adj.currency] = (paid[adj.fromParticipantId][adj.currency] || 0) + adj.amount;
        if (!received[adj.toParticipantId]) received[adj.toParticipantId] = {};
        received[adj.toParticipantId][adj.currency] = (received[adj.toParticipantId][adj.currency] || 0) + adj.amount;
    });

    const currencies = new Set<string>();
    Object.values(investmentByParticipant).forEach(cur => Object.keys(cur).forEach(c => currencies.add(c)));
    adjustments.forEach((adj: any) => currencies.add(adj.currency));
    const sortedCurrencies = Array.from(currencies).sort();

    const currencySections = sortedCurrencies.map(currency => {
        const participantsWithCurrency = new Set<string>();
        Object.entries(investmentByParticipant).forEach(([pid, cur]) => {
            if (cur[currency]) participantsWithCurrency.add(pid);
        });
        adjustments.forEach((adj: any) => {
            if (adj.currency === currency) {
                participantsWithCurrency.add(adj.fromParticipantId);
                participantsWithCurrency.add(adj.toParticipantId);
            }
        });

        const relevant =
            participantsWithCurrency.size > 0
                ? Array.from(participantsWithCurrency)
                : participants.map((p: any) => p.id);

        if (relevant.length === 0) {
            return '';
        }

        let totalInvestment = 0;
        relevant.forEach(pid => {
            totalInvestment += investmentByParticipant[pid]?.[currency] || 0;
        });
        const equalShare = relevant.length > 0 ? totalInvestment / relevant.length : 0;

        const rows = relevant
            .map((pid: string) => {
                const invested = investmentByParticipant[pid]?.[currency] || 0;
                const pay = paid[pid]?.[currency] || 0;
                const recv = received[pid]?.[currency] || 0;
                const netAdj = pay - recv;
                const netPosition = invested + netAdj;
                const difference = netPosition - equalShare;
                const name = getParticipantName(pid, participants, t);
                return `
                    <tr>
                        <td>${name}</td>
                        <td class="text-right">${formatCurrency(invested, currency, loc)}</td>
                        <td class="text-right">${formatCurrency(pay, currency, loc)}</td>
                        <td class="text-right">${formatCurrency(recv, currency, loc)}</td>
                        <td class="text-right font-bold">${formatCurrency(netPosition, currency, loc)}</td>
                        <td class="text-right">${formatCurrency(equalShare, currency, loc)}</td>
                        <td class="text-right ${difference >= 0 ? 'text-secondary' : 'text-danger'}">${formatCurrency(difference, currency, loc)}</td>
                    </tr>
                `;
            })
            .join('');

        return `
            <h3>${currency}</h3>
            <table>
                <thead>
                    <tr>
                        <th>${t('pdf_partner_col_name')}</th>
                        <th class="text-right">${t('pdf_partner_col_invested')}</th>
                        <th class="text-right">${t('pdf_partner_col_paid')}</th>
                        <th class="text-right">${t('pdf_partner_col_received')}</th>
                        <th class="text-right">${t('pdf_partner_col_net_position')}</th>
                        <th class="text-right">${t('pdf_partner_col_equal_share')}</th>
                        <th class="text-right">${t('pdf_partner_col_difference')}</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;
    }).join('');

    return `
        <h1>${t('pdf_partner_statement_title')}</h1>
        <h2>${metaLine(t, 'pdf_partner_statement_context', lang)}</h2>
        <p class="text-sm" style="color:#666;margin-bottom:16px;">${t('pdf_partner_statement_note')}</p>
        ${currencySections || `<p>${t('pdf_no_data_section')}</p>`}
    `;
};

export const generateSelfTakeLogHtml = (data: any, t: TranslateFn, lang: Language): string => {
    const loc = localeFor(lang);
    const { selfTakes = [], items = [], products = [], participants = [], rates = {} } = data;
    const itemsMap = new Map(items.map((i: any) => [i.id, i]));

    const sorted = [...selfTakes].sort(
        (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const rows = sorted
        .map((st: any) => {
            let costCUP = 0;
            const lineParts: string[] = [];
            st.lines.forEach((line: any) => {
                const inv = itemsMap.get(line.itemId);
                const qty = line.quantity || 0;
                if (inv) {
                    const c = (inv.buyPrice || 0) * qty;
                    costCUP += convertToCUP(c, itemBuyCurrency(inv), rates);
                    const pname = getProductName(inv.productId, products, t);
                    lineParts.push(`${pname} × ${qty}`);
                } else {
                    lineParts.push(`${t('pdf_unknown')} × ${qty}`);
                }
            });
            const partner = getParticipantName(st.participantId, participants, t);
            const detail = lineParts.join('; ') || '—';
            const note = st.note || '—';
            return `
                <tr>
                    <td>${formatDate(st.date, loc)}</td>
                    <td>${partner}</td>
                    <td>${detail}</td>
                    <td>${note}</td>
                    <td class="text-right">${formatDualCupUsd(costCUP, rates, loc)}</td>
                </tr>
            `;
        })
        .join('');

    return `
        <h1>${t('pdf_self_take_log_title')}</h1>
        <h2>${metaLine(t, 'pdf_self_take_log_context', lang)}</h2>
        <p class="text-sm" style="color:#666;margin-bottom:16px;">${t('pdf_self_take_log_note')}</p>
        <table>
            <thead>
                <tr>
                    <th>${t('pdf_col_date')}</th>
                    <th>${t('pdf_self_take_col_partner')}</th>
                    <th>${t('pdf_self_take_col_detail')}</th>
                    <th>${t('pdf_col_note')}</th>
                    <th class="text-right">${t('pdf_self_take_col_cost')}</th>
                </tr>
            </thead>
            <tbody>${rows || `<tr><td colspan="5">${t('pdf_no_data_section')}</td></tr>`}</tbody>
        </table>
    `;
};

/** Margin by product: sold quantities, revenue and COGS in CUP (+ USD). */
export const generateMarginByProductHtml = (data: any, t: TranslateFn, lang: Language): string => {
    const loc = localeFor(lang);
    const { sales = [], items = [], products = [], rates = {} } = data;
    const itemsMap = new Map(items.map((i: any) => [i.id, i]));
    const productsMap = new Map((products || []).map((p: any) => [p.id, p]));

    type Agg = { qty: number; revenueCUP: number; costCUP: number };
    const byProduct: Record<string, Agg> = {};

    sales.forEach((sale: any) => {
        const saleCur = sale.currency || 'CUP';
        sale.items?.forEach((si: any) => {
            const orig = itemsMap.get(si.itemId);
            const productId = orig?.productId || 'unknown';
            if (!byProduct[productId]) {
                byProduct[productId] = { qty: 0, revenueCUP: 0, costCUP: 0 };
            }
            const q = si.quantity || 0;
            byProduct[productId].qty += q;
            byProduct[productId].revenueCUP += convertToCUP(si.subtotal || 0, saleCur, rates);
            if (orig) {
                byProduct[productId].costCUP += convertToCUP(
                    (orig.buyPrice || 0) * q,
                    itemBuyCurrency(orig),
                    rates
                );
            }
        });
    });

    const rows = Object.entries(byProduct)
        .map(([productId, agg]) => {
            const name =
                productsMap.get(productId)?.name ||
                (productId === 'unknown' ? t('pdf_unknown') : productId);
            const margin = agg.revenueCUP - agg.costCUP;
            const marginPct = agg.revenueCUP > 0 ? (margin / agg.revenueCUP) * 100 : 0;
            return {
                name,
                qty: agg.qty,
                revenueCUP: agg.revenueCUP,
                costCUP: agg.costCUP,
                margin,
                marginPct
            };
        })
        .sort((a, b) => b.revenueCUP - a.revenueCUP);

    const tableRows = rows
        .map(
            r => `
        <tr>
            <td>${r.name}</td>
            <td class="text-right">${r.qty.toLocaleString(loc)}</td>
            <td class="text-right">${formatDualCupUsd(r.revenueCUP, rates, loc)}</td>
            <td class="text-right">${formatDualCupUsd(r.costCUP, rates, loc)}</td>
            <td class="text-right ${r.margin >= 0 ? '' : 'text-danger'}">${formatDualCupUsd(r.margin, rates, loc)}</td>
            <td class="text-right">${r.marginPct.toFixed(1)}%</td>
        </tr>
    `
        )
        .join('');

    const totalRev = rows.reduce((s, r) => s + r.revenueCUP, 0);
    const totalCost = rows.reduce((s, r) => s + r.costCUP, 0);
    const totalMargin = totalRev - totalCost;

    return `
        <h1>${t('pdf_margin_by_product_title')}</h1>
        <h2>${metaLine(t, 'pdf_margin_product_context', lang)}</h2>
        <p class="text-sm" style="color:#666;margin-bottom:16px;">${t('pdf_margin_by_product_note')}</p>
        <div class="summary-container" style="margin-bottom:20px;">
            <div class="summary-card">
                <div>${t('pdf_margin_total_revenue')}</div>
                <div class="summary-value text-secondary">${formatDualCupUsd(totalRev, rates, loc, 'summary')}</div>
            </div>
            <div class="summary-card">
                <div>${t('pdf_margin_total_cogs')}</div>
                <div class="summary-value text-danger">${formatDualCupUsd(totalCost, rates, loc, 'summary')}</div>
            </div>
            <div class="summary-card">
                <div>${t('pdf_margin_total_margin')}</div>
                <div class="summary-value ${totalMargin >= 0 ? 'text-secondary' : 'text-danger'}">${formatDualCupUsd(totalMargin, rates, loc, 'summary')}</div>
            </div>
        </div>
        <table>
            <thead>
                <tr>
                    <th>${t('pdf_col_product')}</th>
                    <th class="text-right">${t('pdf_margin_col_qty_sold')}</th>
                    <th class="text-right">${t('pdf_margin_col_revenue')}</th>
                    <th class="text-right">${t('pdf_margin_col_cogs')}</th>
                    <th class="text-right">${t('pdf_margin_col_margin')}</th>
                    <th class="text-right">${t('pdf_margin_col_margin_pct')}</th>
                </tr>
            </thead>
            <tbody>${tableRows || `<tr><td colspan="6">${t('pdf_no_data_section')}</td></tr>`}</tbody>
        </table>
    `;
};
