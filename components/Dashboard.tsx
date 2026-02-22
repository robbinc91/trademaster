import React, { useMemo } from 'react';
import { StoreData, CurrencyTotal } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { TrendingUp, Truck, Wallet, PackageOpen, Users, ArrowUpRight, ArrowDownRight } from 'lucide-react';
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

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-xl border border-slate-200">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: getCurrencyColor(label) }}
          />
          <span className="font-bold text-slate-800">{label}</span>
        </div>
        <div className="text-2xl font-bold text-slate-900">
          {payload[0].value.toLocaleString()}
        </div>
      </div>
    );
  }
  return null;
};

export const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  const { t } = useLanguage();

  // 1. Calculate Amount Invested by Participant (Grouped by Currency)
  const investmentStats = useMemo(() => {
    const stats: Record<string, CurrencyTotal> = {};

    data.items.forEach(item => {
      if (!item.buyerId) return;

      if (!stats[item.buyerId]) stats[item.buyerId] = {};

      // Item cost - use buyCurrency
      const currency = item.buyCurrency || 'N/A';
      const cost = (item.buyPrice || 0) * (item.initialQuantity || 0);
      stats[item.buyerId][currency] = (stats[item.buyerId][currency] || 0) + cost;

      // Transport cost (invested)
      if (item.transportCost > 0) {
        const transportCurrency = item.transportCurrency || 'N/A';
        stats[item.buyerId][transportCurrency] = (stats[item.buyerId][transportCurrency] || 0) + item.transportCost;
      }
    });
    return stats;
  }, [data.items]);

  // 1b. Calculate Adjustments by Participant (Grouped by Currency)
  const adjustmentsStats = useMemo(() => {
    const paid: Record<string, CurrencyTotal> = {};
    const received: Record<string, CurrencyTotal> = {};

    data.adjustments.forEach(adj => {
      // What the sender paid (increases their position)
      if (!paid[adj.fromParticipantId]) paid[adj.fromParticipantId] = {};
      paid[adj.fromParticipantId][adj.currency] = (paid[adj.fromParticipantId][adj.currency] || 0) + adj.amount;

      // What the receiver received (decreases their position)
      if (!received[adj.toParticipantId]) received[adj.toParticipantId] = {};
      received[adj.toParticipantId][adj.currency] = (received[adj.toParticipantId][adj.currency] || 0) + adj.amount;
    });

    return { paid, received };
  }, [data.adjustments]);

  // 1c. Calculate Net Position (Investment + Paid Adjustments - Received Adjustments)
  const netPositionStats = useMemo(() => {
    const stats: Record<string, CurrencyTotal> = {};

    // Start with investments
    Object.entries(investmentStats).forEach(([participantId, currencies]) => {
      if (!stats[participantId]) stats[participantId] = {};
      Object.entries(currencies).forEach(([currency, amount]) => {
        stats[participantId][currency] = (stats[participantId][currency] || 0) + amount;
      });
    });

    // Add paid adjustments (increases position)
    Object.entries(adjustmentsStats.paid).forEach(([participantId, currencies]) => {
      if (!stats[participantId]) stats[participantId] = {};
      Object.entries(currencies).forEach(([currency, amount]) => {
        stats[participantId][currency] = (stats[participantId][currency] || 0) + amount;
      });
    });

    // Subtract received adjustments (decreases position)
    Object.entries(adjustmentsStats.received).forEach(([participantId, currencies]) => {
      if (!stats[participantId]) stats[participantId] = {};
      Object.entries(currencies).forEach(([currency, amount]) => {
        stats[participantId][currency] = (stats[participantId][currency] || 0) - amount;
      });
    });

    return stats;
  }, [investmentStats, adjustmentsStats]);

  // 2. Amount of Money by Sales (Grouped by Currency)
  const salesRevenue = useMemo(() => {
    const revenue: CurrencyTotal = {};
    data.sales.forEach(sale => {
      const currency = sale.currency || 'N/A';
      revenue[currency] = (revenue[currency] || 0) + (sale.totalAmount || 0);
    });
    return revenue;
  }, [data.sales]);

  // 3. Amount Invested in Transportation for Sales
  const salesTransport = useMemo(() => {
    const cost: CurrencyTotal = {};
    data.sales.forEach(sale => {
      const transportCurrency = sale.transportCurrency || 'N/A';
      cost[transportCurrency] = (cost[transportCurrency] || 0) + (sale.transportCost || 0);
    });
    return cost;
  }, [data.sales]);

  // Prepare Chart Data
  const revenueChartData = Object.entries(salesRevenue).map(([currency, amount]) => ({
    name: currency,
    amount: amount
  }));

  const getParticipantName = (id: string) => {
    const participant = data.participants.find(p => p.id === id);
    return participant?.name || t('unknown');
  };

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sales Revenue Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-800">{t('revenue_by_currency')}</h3>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <TrendingUp size={16} className="text-emerald-500" />
              <span>{revenueChartData.length} {t('currencies_active').toLowerCase()}</span>
            </div>
          </div>
          <div className="h-72">
            {revenueChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={revenueChartData}
                  barCategoryGap="30%"
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                  <defs>
                    {revenueChartData.map((entry, index) => (
                      <linearGradient
                        key={`gradient-${index}`}
                        id={`gradient-${entry.name}`}
                        x1="0" y1="0" x2="0" y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor={getCurrencyColor(entry.name)}
                          stopOpacity={1}
                        />
                        <stop
                          offset="100%"
                          stopColor={getCurrencyColor(entry.name)}
                          stopOpacity={0.6}
                        />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid
                    strokeDasharray="4 4"
                    vertical={false}
                    stroke="#e2e8f0"
                    strokeOpacity={0.8}
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 13, fontWeight: 600 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
                  <Bar
                    dataKey="amount"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={60}
                  >
                    {revenueChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`url(#gradient-${entry.name})`}
                        style={{
                          filter: 'drop-shadow(0 -2px 4px rgba(0,0,0,0.1))',
                          transition: 'all 0.3s ease'
                        }}
                      />
                    ))}
                    <LabelList
                      dataKey="amount"
                      position="top"
                      formatter={(value: number) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
                      style={{
                        fill: '#475569',
                        fontSize: 12,
                        fontWeight: 600
                      }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <TrendingUp size={48} className="mb-4 opacity-30" />
                <p>{t('no_sales_data')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Transport Costs (Sales) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">{t('logistics_spend')}</h3>
          <div className="space-y-4">
            {Object.entries(salesTransport).length > 0 ? (
              Object.entries(salesTransport).map(([currency, amount]) => (
                <div key={currency} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Truck size={18} className="text-slate-500" />
                    <span className="font-medium text-slate-700">{currency}</span>
                  </div>
                  <span className="font-bold text-slate-900">{amount.toLocaleString()}</span>
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-center py-10">{t('no_transport_costs')}</p>
            )}
          </div>
        </div>
      </div>

      {/* Participant Investments Table */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">{t('investment_by_participant')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="pb-3 text-sm font-semibold text-slate-500">{t('participant_header')}</th>
                <th className="pb-3 text-sm font-semibold text-slate-500 text-right">{t('invested_header')}</th>
                <th className="pb-3 text-sm font-semibold text-slate-500 text-right">{t('adjustments')}</th>
                <th className="pb-3 text-sm font-semibold text-slate-500 text-right">{t('net_position')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.keys(netPositionStats).length > 0 ? (
                Object.entries(netPositionStats).map(([participantId, netTotals]) => {
                  const investedTotals = investmentStats[participantId] || {};
                  const paidAdjustments = adjustmentsStats.paid[participantId] || {};
                  const receivedAdjustments = adjustmentsStats.received[participantId] || {};

                  // Get all currencies for this participant
                  const allCurrencies = new Set([
                    ...Object.keys(investedTotals),
                    ...Object.keys(paidAdjustments),
                    ...Object.keys(receivedAdjustments)
                  ]);

                  return (
                    <tr key={participantId} className="group hover:bg-slate-50">
                      <td className="py-4 text-slate-700 font-medium">{getParticipantName(participantId)}</td>
                      <td className="py-4 text-right">
                        <div className="flex flex-wrap gap-1 justify-end">
                          {Object.entries(investedTotals).map(([currency, amount]) => (
                            <span key={currency} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              {amount.toLocaleString()} {currency}
                            </span>
                          ))}
                          {Object.keys(investedTotals).length === 0 && (
                            <span className="text-slate-400 text-sm">-</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex flex-wrap gap-1 justify-end">
                          {Array.from(allCurrencies).map(currency => {
                            const paid = paidAdjustments[currency] || 0;
                            const received = receivedAdjustments[currency] || 0;
                            const net = paid - received;
                            if (net === 0) return null;
                            return (
                              <span key={currency} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${net > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                {net > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                                {net > 0 ? '+' : ''}{net.toLocaleString()} {currency}
                              </span>
                            );
                          })}
                          {allCurrencies.size === 0 && (
                            <span className="text-slate-400 text-sm">-</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex flex-wrap gap-1 justify-end">
                          {Object.entries(netTotals).map(([currency, amount]) => (
                            <span key={currency} className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${amount >= 0 ? 'bg-slate-100 text-slate-800' : 'bg-red-50 text-red-700'}`}>
                              {amount.toLocaleString()} {currency}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">{t('no_investments')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Helper icon
const UsersIcon = (props: any) => <Users {...props} />;