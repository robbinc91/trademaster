import React, { useMemo, useState } from 'react';
import { StoreData, CurrencyTotal, AddMoneyRetirementInput } from '../types';
import {
  TrendingUp,
  Wallet,
  PackageOpen,
  Users,
  Receipt,
  Scale,
  Package,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { AvailableCash } from './AvailableCash';
import { TabType, TABS } from '../constants';
import {
  computeNetProfit,
  computeInventoryValueByCurrency,
  computePartnerBalanceTeasers
} from '../src/utils/financeStats';

interface DashboardProps {
  data: StoreData;
  addMoneyRetirement: (input: AddMoneyRetirementInput) => void;
  deleteMoneyRetirement: (id: string) => void;
  setActiveTab?: (tab: TabType) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  data,
  addMoneyRetirement,
  deleteMoneyRetirement,
  setActiveTab
}) => {
  const { t } = useLanguage();
  const [profitCurrency, setProfitCurrency] = useState<'USD' | 'CUP'>('USD');

  const salesRevenue = useMemo(() => {
    const revenue: CurrencyTotal = {};
    data.sales.forEach(sale => {
      const currency = sale.currency || 'N/A';
      revenue[currency] = (revenue[currency] || 0) + (sale.totalAmount || 0);
    });
    return revenue;
  }, [data.sales]);

  const netProfit = useMemo(
    () => computeNetProfit(data, profitCurrency),
    [data, profitCurrency]
  );

  const inventoryValue = useMemo(
    () => computeInventoryValueByCurrency(data),
    [data.items]
  );

  const inventoryValueRows = useMemo(() => {
    const currencies = new Set([
      ...Object.keys(inventoryValue.atCost),
      ...Object.keys(inventoryValue.atSell)
    ]);
    return Array.from(currencies)
      .map(currency => ({
        currency,
        atCost: inventoryValue.atCost[currency] || 0,
        atSell: inventoryValue.atSell[currency] || 0
      }))
      .filter(row => row.atCost > 0 || row.atSell > 0)
      .sort((a, b) => b.atSell + b.atCost - (a.atSell + a.atCost));
  }, [inventoryValue]);

  const partnerTeasers = useMemo(
    () => computePartnerBalanceTeasers(data).slice(0, 6),
    [data]
  );

  const recentSales = useMemo(() => {
    return [...(data.sales || [])]
      .sort((a, b) => {
        const d = (b.dateSold || '').localeCompare(a.dateSold || '');
        if (d !== 0) return d;
        return (b.id || '').localeCompare(a.id || '');
      })
      .slice(0, 5);
  }, [data.sales]);

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <h2 className="text-3xl font-bold text-slate-800">{t('business_overview')}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 font-medium">{t('total_participants')}</h3>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Users size={20} /></div>
          </div>
          <p className="text-3xl font-bold text-slate-800">{data.participants.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 font-medium">{t('total_items')}</h3>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><PackageOpen size={20} /></div>
          </div>
          <p className="text-3xl font-bold text-slate-800">
            {data.items.reduce((acc, item) => acc + (item.quantity || 0), 0)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 font-medium">{t('total_sales')}</h3>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><TrendingUp size={20} /></div>
          </div>
          <p className="text-3xl font-bold text-slate-800">{data.sales.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 font-medium">{t('currencies_active')}</h3>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Wallet size={20} /></div>
          </div>
          <p className="text-3xl font-bold text-slate-800">{Object.keys(salesRevenue).length || 0}</p>
        </div>
      </div>

      <AvailableCash
        sales={data.sales}
        moneyRetirements={data.moneyRetirements || []}
        addMoneyRetirement={addMoneyRetirement}
        deleteMoneyRetirement={deleteMoneyRetirement}
        compact
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Net profit snapshot */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-start gap-2">
              <div className={`p-2 rounded-lg ${netProfit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                <TrendingUp size={20} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">{t('dashboard_net_profit_title')}</h3>
                <p className="text-sm text-slate-500">{t('dashboard_net_profit_desc')}</p>
              </div>
            </div>
            <select
              value={profitCurrency}
              onChange={e => setProfitCurrency(e.target.value as 'USD' | 'CUP')}
              className="border rounded-lg px-2 py-1.5 text-sm bg-slate-50 text-slate-700"
              aria-label={t('profit_currency')}
            >
              <option value="USD">USD</option>
              <option value="CUP">CUP</option>
            </select>
          </div>
          <p className={`text-3xl font-bold tabular-nums ${netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {netProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })} {profitCurrency}
          </p>
          {setActiveTab && (
            <button
              type="button"
              onClick={() => setActiveTab(TABS.STATISTICS)}
              className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              {t('dashboard_open_statistics')}
            </button>
          )}
        </div>

        {/* Inventory value */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-start gap-2 mb-4">
            <div className="p-2 rounded-lg bg-sky-50 text-sky-600">
              <Package size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">{t('dashboard_inventory_value_title')}</h3>
              <p className="text-sm text-slate-500">{t('dashboard_inventory_value_desc')}</p>
            </div>
          </div>
          {inventoryValueRows.length === 0 ? (
            <p className="text-sm text-slate-400 py-4">{t('dashboard_inventory_value_empty')}</p>
          ) : (
            <ul className="space-y-3">
              {inventoryValueRows.map(row => (
                <li
                  key={row.currency}
                  className="py-2 border-b border-slate-100 last:border-0"
                >
                  <p className="text-sm font-semibold text-slate-700 mb-1.5">{row.currency}</p>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
                    <div className="flex justify-between sm:block gap-4">
                      <span className="text-xs text-slate-500">{t('dashboard_inventory_at_cost')}</span>
                      <p className="text-sm font-bold text-slate-800 tabular-nums">
                        {row.atCost > 0
                          ? row.atCost.toLocaleString(undefined, { maximumFractionDigits: 2 })
                          : '—'}
                      </p>
                    </div>
                    <div className="flex justify-between sm:block gap-4 sm:text-right">
                      <span className="text-xs text-slate-500">{t('dashboard_inventory_at_sell')}</span>
                      <p className="text-sm font-bold text-emerald-700 tabular-nums">
                        {row.atSell > 0
                          ? row.atSell.toLocaleString(undefined, { maximumFractionDigits: 2 })
                          : '—'}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {setActiveTab && (
            <button
              type="button"
              onClick={() => setActiveTab(TABS.INVENTORY)}
              className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              {t('dashboard_open_inventory')}
            </button>
          )}
        </div>

        {/* Partner balance teaser */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-start gap-2 mb-4">
            <div className="p-2 rounded-lg bg-cyan-50 text-cyan-600">
              <Scale size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">{t('dashboard_partner_balance_title')}</h3>
              <p className="text-sm text-slate-500">{t('dashboard_partner_balance_desc')}</p>
            </div>
          </div>
          {partnerTeasers.length === 0 ? (
            <p className="text-sm text-slate-400 py-4">{t('dashboard_partner_balance_empty')}</p>
          ) : (
            <ul className="space-y-2">
              {partnerTeasers.map(row => (
                <li
                  key={`${row.participantId}-${row.currency}`}
                  className="flex items-center justify-between gap-2 py-2 border-b border-slate-100 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{row.name}</p>
                    <p className="text-xs text-slate-500">{row.currency}</p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${
                      row.status === 'receives'
                        ? 'bg-emerald-100 text-emerald-900 dark:text-emerald-100'
                        : 'bg-red-100 text-red-900 dark:text-red-100'
                    }`}
                  >
                    {row.status === 'receives' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {row.status === 'receives' ? t('receives') : t('owes')}{' '}
                    {Math.abs(row.difference).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {setActiveTab && (
            <button
              type="button"
              onClick={() => setActiveTab(TABS.BALANCE)}
              className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              {t('dashboard_open_balance')}
            </button>
          )}
        </div>

        {/* Recent sales */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-start gap-2 mb-4">
            <div className="p-2 rounded-lg bg-violet-50 text-violet-600">
              <Receipt size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">{t('dashboard_recent_sales_title')}</h3>
              <p className="text-sm text-slate-500">{t('dashboard_recent_sales_desc')}</p>
            </div>
          </div>
          {recentSales.length === 0 ? (
            <p className="text-sm text-slate-400 py-4">{t('dashboard_recent_sales_empty')}</p>
          ) : (
            <ul className="space-y-2">
              {recentSales.map(sale => (
                <li
                  key={sale.id}
                  className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">{sale.dateSold}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {sale.customerPhone || sale.address || t('pdf_walk_in')}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-slate-800 tabular-nums">
                    {(sale.totalAmount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
                    {sale.currency}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {setActiveTab && (
            <button
              type="button"
              onClick={() => setActiveTab(TABS.SALES_HISTORY)}
              className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              {t('dashboard_open_sales_history')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
