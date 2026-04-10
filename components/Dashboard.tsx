import React, { useMemo } from 'react';
import { StoreData, CurrencyTotal } from '../types';
import { TrendingUp, Truck, Wallet, PackageOpen, Users, Sparkles } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface DashboardProps {
  data: StoreData;
}

// Currency colors for chart
const getCurrencyColor = (currency: string) => {
  const colors: Record<string, string> = {
    'USD': '#3b82f6',
    'EUR': '#10b981',
    'CUP': '#f59e0b',
    'MLC': '#8b5cf6'
  };
  return colors[currency] || '#6b7280';
};

export const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  const { t } = useLanguage();

  // Sales revenue by currency
  const salesRevenue = useMemo(() => {
    const revenue: CurrencyTotal = {};
    data.sales.forEach(sale => {
      const currency = sale.currency || 'N/A';
      revenue[currency] = (revenue[currency] || 0) + (sale.totalAmount || 0);
    });
    return revenue;
  }, [data.sales]);

  // Sale delivery / transport costs by currency
  const salesTransport = useMemo(() => {
    const cost: CurrencyTotal = {};
    data.sales.forEach(sale => {
      const transportCurrency = sale.transportCurrency || 'N/A';
      cost[transportCurrency] = (cost[transportCurrency] || 0) + (sale.transportCost || 0);
    });
    return cost;
  }, [data.sales]);

  const currencyFlowRows = useMemo(() => {
    const keys = new Set([...Object.keys(salesRevenue), ...Object.keys(salesTransport)]);
    return Array.from(keys)
      .map(currency => ({
        currency,
        revenue: salesRevenue[currency] || 0,
        logistics: salesTransport[currency] || 0
      }))
      .filter(row => row.revenue > 0 || row.logistics > 0)
      .sort((a, b) => b.revenue - a.revenue || b.logistics - a.logistics);
  }, [salesRevenue, salesTransport]);

  const flowMaxRevenue = useMemo(
    () => currencyFlowRows.reduce((m, r) => Math.max(m, r.revenue), 0),
    [currencyFlowRows]
  );
  const flowMaxLogistics = useMemo(
    () => currencyFlowRows.reduce((m, r) => Math.max(m, r.logistics), 0),
    [currencyFlowRows]
  );

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <h2 className="text-3xl font-bold text-slate-800">{t('business_overview')}</h2>

      {/* High Level Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 font-medium">{t('total_participants')}</h3>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><UsersIcon size={20} /></div>
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

      {/* Revenue + logistics: single insight panel (replaces two large side-by-side cards) */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/40 to-indigo-50/50 shadow-sm">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.12), transparent 45%), radial-gradient(circle at 80% 0%, rgba(16, 185, 129, 0.1), transparent 40%)'
          }}
        />
        <div className="relative px-6 py-5 border-b border-slate-200/60 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/25">
              <Sparkles size={22} strokeWidth={2} aria-hidden />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 tracking-tight">{t('dashboard_flow_title')}</h3>
              <p className="text-sm text-slate-500 mt-0.5 max-w-xl">{t('dashboard_flow_subtitle')}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-6 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm" />
              {t('dashboard_flow_legend_revenue')}
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-6 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 shadow-sm" />
              {t('dashboard_flow_legend_logistics')}
            </span>
          </div>
        </div>

        <div className="relative p-6">
          {currencyFlowRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center text-slate-400">
              <div className="flex gap-3 mb-4">
                <TrendingUp size={40} className="opacity-25" />
                <Truck size={40} className="opacity-25" />
              </div>
              <p className="max-w-md text-slate-500">{t('dashboard_flow_empty')}</p>
            </div>
          ) : (
            <ul className="space-y-6">
              {currencyFlowRows.map(row => {
                const color = getCurrencyColor(row.currency);
                const revPct = flowMaxRevenue > 0 ? (row.revenue / flowMaxRevenue) * 100 : 0;
                const logPct = flowMaxLogistics > 0 ? (row.logistics / flowMaxLogistics) * 100 : 0;
                const share =
                  row.revenue > 0 && row.logistics > 0
                    ? t('dashboard_flow_logistics_share', { pct: ((row.logistics / row.revenue) * 100).toFixed(1) })
                    : null;

                return (
                  <li key={row.currency} className="group">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="flex items-center gap-3 shrink-0 lg:w-36">
                        <div
                          className="flex h-11 w-11 items-center justify-center rounded-xl text-xs font-bold text-white shadow-md ring-2 ring-white/80"
                          style={{ backgroundColor: color }}
                        >
                          {row.currency.length > 4 ? row.currency.slice(0, 3) : row.currency}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{row.currency}</p>
                          {share && (
                            <p className="text-xs text-violet-600 font-medium mt-0.5">{share}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 space-y-2.5">
                        <div>
                          <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>{t('dashboard_flow_legend_revenue')}</span>
                            <span className="font-semibold text-slate-700 tabular-nums">
                              {row.revenue.toLocaleString()}
                            </span>
                          </div>
                          <div className="h-3 rounded-full bg-slate-200/80 overflow-hidden ring-1 ring-slate-200/60">
                            <div
                              className="h-full rounded-full transition-all duration-500 ease-out group-hover:brightness-110"
                              style={{
                                width: `${revPct}%`,
                                background: `linear-gradient(90deg, ${color}, ${color}cc)`
                              }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span className="inline-flex items-center gap-1">
                              <Truck size={12} className="text-violet-500 shrink-0" />
                              {t('dashboard_flow_legend_logistics')}
                            </span>
                            <span className="font-semibold text-slate-700 tabular-nums">
                              {row.logistics > 0 ? row.logistics.toLocaleString() : '—'}
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-200/80 overflow-hidden ring-1 ring-slate-200/60">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500 ease-out opacity-90 group-hover:opacity-100"
                              style={{ width: `${logPct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper icon
const UsersIcon = (props: any) => <Users {...props} />;