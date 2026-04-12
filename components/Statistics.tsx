import React, { useMemo, useState } from 'react';
import { StoreData, CurrencyTotal } from '../types';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, LabelList,
    Line, Area, CartesianGrid, ComposedChart
} from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Filter, Users, Package, PackageCheck, ArrowUpRight, ArrowDownRight, ShoppingCart, Award, AlertTriangle, BarChart3, LineChart as LineChartIcon } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface StatisticsProps {
    data: StoreData;
}

// Colors for pie charts
const PIE_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

function startOfWeekMonday(d: Date): Date {
    const x = new Date(d);
    const day = x.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    x.setDate(x.getDate() + diff);
    x.setHours(0, 0, 0, 0);
    return x;
}

export const Statistics: React.FC<StatisticsProps> = ({ data }) => {
    const { t, language } = useLanguage();

    // Filter states
    const [selectedParticipant, setSelectedParticipant] = useState<string>('all');
    const [selectedCurrency, setSelectedCurrency] = useState<string>('all');
    const [profitCurrency, setProfitCurrency] = useState<'USD' | 'CUP'>('USD');

    // Get all unique currencies from items and sales
    const allCurrencies = useMemo(() => {
        const currencies = new Set<string>();
        data.items.forEach(item => {
            if (item.buyCurrency) currencies.add(item.buyCurrency);
            if (item.transportCurrency) currencies.add(item.transportCurrency);
        });
        data.sales.forEach(sale => {
            if (sale.currency) currencies.add(sale.currency);
            if (sale.transportCurrency) currencies.add(sale.transportCurrency);
        });
        return Array.from(currencies).sort();
    }, [data.items, data.sales]);

    // 1. Money spent by participant, grouped by currency
    const spendingByParticipant = useMemo(() => {
        const stats: Record<string, CurrencyTotal> = {};

        // Filter items by participant if selected
        const filteredItems = selectedParticipant === 'all'
            ? data.items
            : data.items.filter(item => item.buyerId === selectedParticipant);

        filteredItems.forEach(item => {
            if (!item.buyerId) return;

            if (!stats[item.buyerId]) stats[item.buyerId] = {};

            // Item cost
            const currency = item.buyCurrency || 'N/A';
            const cost = (item.buyPrice || 0) * (item.initialQuantity || 0);
            stats[item.buyerId][currency] = (stats[item.buyerId][currency] || 0) + cost;

            // Transport cost
            if (item.transportCost > 0) {
                const transportCurrency = item.transportCurrency || 'N/A';
                stats[item.buyerId][transportCurrency] = (stats[item.buyerId][transportCurrency] || 0) + item.transportCost;
            }
        });

        return stats;
    }, [data.items, selectedParticipant]);

    // 1b. Calculate adjustments by participant
    const adjustmentsByParticipant = useMemo(() => {
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

    // 1c. Calculate net position (Investment + Paid - Received)
    const netPositionByParticipant = useMemo(() => {
        const stats: Record<string, CurrencyTotal> = {};

        // Start with investments
        Object.entries(spendingByParticipant).forEach(([participantId, currencies]) => {
            if (!stats[participantId]) stats[participantId] = {};
            Object.entries(currencies).forEach(([currency, amount]) => {
                stats[participantId][currency] = (stats[participantId][currency] || 0) + amount;
            });
        });

        // Add paid adjustments (increases position)
        Object.entries(adjustmentsByParticipant.paid).forEach(([participantId, currencies]) => {
            if (!stats[participantId]) stats[participantId] = {};
            Object.entries(currencies).forEach(([currency, amount]) => {
                stats[participantId][currency] = (stats[participantId][currency] || 0) + amount;
            });
        });

        // Subtract received adjustments (decreases position)
        Object.entries(adjustmentsByParticipant.received).forEach(([participantId, currencies]) => {
            if (!stats[participantId]) stats[participantId] = {};
            Object.entries(currencies).forEach(([currency, amount]) => {
                stats[participantId][currency] = (stats[participantId][currency] || 0) - amount;
            });
        });

        return stats;
    }, [spendingByParticipant, adjustmentsByParticipant]);

    // 2. Sales revenue by currency
    const salesRevenue = useMemo(() => {
        const revenue: CurrencyTotal = {};
        data.sales.forEach(sale => {
            const currency = sale.currency || 'N/A';
            revenue[currency] = (revenue[currency] || 0) + (sale.totalAmount || 0);
        });
        return revenue;
    }, [data.sales]);

    // 3. Transport costs from sales by currency
    const salesTransportCosts = useMemo(() => {
        const costs: CurrencyTotal = {};
        data.sales.forEach(sale => {
            const currency = sale.transportCurrency || 'N/A';
            costs[currency] = (costs[currency] || 0) + (sale.transportCost || 0);
        });
        return costs;
    }, [data.sales]);

    // 4. Get conversion rate to target currency
    const getConversionRate = (fromCurrency: string, toCurrency: string): number => {
        if (fromCurrency === toCurrency) return 1;

        const rates = data.rates;

        // Convert to CUP first (CUP is the base)
        let valueInCUP = 1;
        if (fromCurrency === 'USD') {
            valueInCUP = rates.USD;
        } else if (fromCurrency === 'EUR') {
            valueInCUP = rates.EUR;
        } else if (fromCurrency === 'CUP') {
            valueInCUP = 1;
        } else {
            // For other currencies, assume they're already in CUP or use 1:1
            valueInCUP = 1;
        }

        // Convert from CUP to target currency
        if (toCurrency === 'USD') {
            return valueInCUP / rates.USD;
        } else if (toCurrency === 'EUR') {
            return valueInCUP / rates.EUR;
        } else if (toCurrency === 'CUP') {
            return valueInCUP;
        }

        return 1;
    };

    // 5. Calculate total spending converted to target currency
    const totalSpending = useMemo(() => {
        let total = 0;

        Object.entries(spendingByParticipant).forEach(([participantId, currencies]) => {
            Object.entries(currencies).forEach(([currency, amount]) => {
                if (selectedCurrency === 'all' || currency === selectedCurrency) {
                    total += amount * getConversionRate(currency, profitCurrency);
                }
            });
        });

        return total;
    }, [spendingByParticipant, selectedCurrency, profitCurrency, data.rates]);

    // 6. Calculate total revenue converted to target currency
    const totalRevenue = useMemo(() => {
        let total = 0;

        Object.entries(salesRevenue).forEach(([currency, amount]) => {
            total += amount * getConversionRate(currency, profitCurrency);
        });

        return total;
    }, [salesRevenue, profitCurrency, data.rates]);

    // 7. Calculate total sales transport costs converted to target currency
    const totalSalesTransport = useMemo(() => {
        let total = 0;

        Object.entries(salesTransportCosts).forEach(([currency, amount]) => {
            total += amount * getConversionRate(currency, profitCurrency);
        });

        return total;
    }, [salesTransportCosts, profitCurrency, data.rates]);

    // 8. Calculate profit (Revenue - Spending - Sales Transport)
    const profit = useMemo(() => {
        return totalRevenue - totalSpending - totalSalesTransport;
    }, [totalRevenue, totalSpending, totalSalesTransport]);

    // 9. Calculate PARTIAL EARNINGS (only from sold items)
    const partialEarnings = useMemo(() => {
        // Build a map of items by ID for quick lookup
        const itemsMap = new Map(data.items.map(item => [item.id, item]));

        // Track cost of sold items by currency
        const costOfSoldItems: CurrencyTotal = {};

        // Go through all sales and sum up the cost of items sold
        // Note: We only track the BUY PRICE of items, NOT their purchase transport cost
        // Purchase transport is part of investment/capital, not an operating expense
        data.sales.forEach(sale => {
            sale.items.forEach(saleItem => {
                const originalItem = itemsMap.get(saleItem.itemId);
                if (originalItem) {
                    const currency = originalItem.buyCurrency || 'N/A';
                    const costPerUnit = originalItem.buyPrice || 0;
                    costOfSoldItems[currency] = (costOfSoldItems[currency] || 0) + (costPerUnit * saleItem.quantity);
                }
            });
        });

        // Convert cost of sold items to target currency
        let totalCostOfSoldInTargetCurrency = 0;
        Object.entries(costOfSoldItems).forEach(([currency, amount]) => {
            totalCostOfSoldInTargetCurrency += amount * getConversionRate(currency, profitCurrency);
        });

        // Total costs = cost of sold items + sales transport (delivery costs)
        // Note: totalSalesTransport is the transport cost for DELIVERING sales, which is an operating expense
        const totalCosts = totalCostOfSoldInTargetCurrency + totalSalesTransport;

        // Partial earnings = Revenue - Total costs
        const partialEarningsValue = totalRevenue - totalCosts;

        return {
            earnings: partialEarningsValue,
            costOfSoldItems: totalCostOfSoldInTargetCurrency
        };
    }, [data.sales, data.items, totalRevenue, totalSalesTransport, profitCurrency, data.rates]);

    // 10. Calculate inventory summary (from actual sales data)
    const inventorySummary = useMemo(() => {
        let totalItems = 0;
        let remainingItems = 0;

        // Calculate total purchased and remaining from inventory
        data.items.forEach(item => {
            totalItems += item.initialQuantity || 0;
            remainingItems += item.quantity || 0;
        });

        // Calculate total sold from actual sales data (more accurate)
        let soldItems = 0;
        data.sales.forEach(sale => {
            sale.items.forEach(saleItem => {
                soldItems += saleItem.quantity;
            });
        });

        let selfTakenItems = 0;
        (data.selfTakes || []).forEach(st => {
            st.lines.forEach(line => {
                selfTakenItems += line.quantity;
            });
        });

        const outflowItems = soldItems + selfTakenItems;

        return {
            total: totalItems,
            sold: soldItems,
            selfTaken: selfTakenItems,
            remaining: remainingItems,
            soldPercentage: totalItems > 0 ? (soldItems / totalItems) * 100 : 0,
            selfTakenPercentage: totalItems > 0 ? (selfTakenItems / totalItems) * 100 : 0,
            outflowPercentage: totalItems > 0 ? (outflowItems / totalItems) * 100 : 0
        };
    }, [data.items, data.sales, data.selfTakes]);

    // 10b. Time series from first purchase through latest activity (sales-based metrics)
    const activityTimeline = useMemo(() => {
        const items = data.items || [];
        const sales = data.sales || [];
        const rates = data.rates;

        const convertToTarget = (amount: number, fromCurrency: string): number => {
            if (!amount) return 0;
            if (fromCurrency === profitCurrency) return amount;
            let valueInCUP = amount;
            if (fromCurrency === 'USD') valueInCUP = amount * rates.USD;
            else if (fromCurrency === 'EUR') valueInCUP = amount * rates.EUR;
            else if (fromCurrency === 'CUP') valueInCUP = amount;
            else valueInCUP = amount;

            if (profitCurrency === 'USD') return valueInCUP / rates.USD;
            if (profitCurrency === 'EUR') return valueInCUP / rates.EUR;
            return valueInCUP;
        };

        let firstTs = Infinity;
        items.forEach(item => {
            const raw = item.purchaseDate || item.dateAdded;
            const ts = new Date(raw).getTime();
            if (Number.isFinite(ts)) firstTs = Math.min(firstTs, ts);
        });
        if (sales.length > 0 && (!Number.isFinite(firstTs) || firstTs === Infinity)) {
            sales.forEach(sale => {
                const ts = new Date(sale.dateSold).getTime();
                if (Number.isFinite(ts)) firstTs = Math.min(firstTs, ts);
            });
        }
        if (!Number.isFinite(firstTs) || firstTs === Infinity) {
            return null;
        }

        const startDay = new Date(firstTs);
        startDay.setHours(0, 0, 0, 0);

        let endDay = new Date();
        endDay.setHours(0, 0, 0, 0);
        sales.forEach(sale => {
            const ts = new Date(sale.dateSold).getTime();
            if (Number.isFinite(ts)) {
                const d = new Date(ts);
                d.setHours(0, 0, 0, 0);
                if (d > endDay) endDay = d;
            }
        });
        if (endDay < startDay) endDay = new Date(startDay);

        const dayKey = (iso: string) => {
            if (!iso) return '';
            return iso.includes('T') ? iso.split('T')[0] : iso.slice(0, 10);
        };

        const itemsMap = new Map(items.map(i => [i.id, i]));
        type Agg = { revenue: number; units: number; cogs: number; sales: number };
        const byDay = new Map<string, Agg>();

        sales.forEach(sale => {
            const key = dayKey(sale.dateSold);
            if (!key || key.length < 8) return;
            const cur: Agg = byDay.get(key) || { revenue: 0, units: 0, cogs: 0, sales: 0 };
            cur.revenue += convertToTarget(sale.totalAmount || 0, sale.currency || 'CUP');
            cur.sales += 1;
            sale.items?.forEach(si => {
                cur.units += si.quantity || 0;
                const orig = itemsMap.get(si.itemId);
                if (orig) {
                    const c = (orig.buyPrice || 0) * (si.quantity || 0);
                    cur.cogs += convertToTarget(c, orig.buyCurrency || 'CUP');
                }
            });
            byDay.set(key, cur);
        });

        const spanDays =
            Math.ceil((endDay.getTime() - startDay.getTime()) / 86400000) + 1;
        const useWeekly = spanDays > 120;
        const locale = language === 'es' ? 'es-ES' : 'en-US';

        const buildSeries = (bucket: 'day' | 'week', source: Map<string, Agg>) => {
            const series: Array<{
                date: string;
                label: string;
                dailyRevenue: number;
                dailyUnits: number;
                dailyCogs: number;
                dailySales: number;
                cumulativeRevenue: number;
            }> = [];
            let cum = 0;

            if (bucket === 'day') {
                const cursor = new Date(startDay);
                while (cursor <= endDay) {
                    const key = cursor.toISOString().slice(0, 10);
                    const agg = source.get(key) || { revenue: 0, units: 0, cogs: 0, sales: 0 };
                    cum += agg.revenue;
                    series.push({
                        date: key,
                        label: cursor.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' }),
                        dailyRevenue: agg.revenue,
                        dailyUnits: agg.units,
                        dailyCogs: agg.cogs,
                        dailySales: agg.sales,
                        cumulativeRevenue: cum
                    });
                    cursor.setDate(cursor.getDate() + 1);
                }
            } else {
                const byWeek = new Map<string, Agg>();
                source.forEach((agg, key) => {
                    const wk = startOfWeekMonday(new Date(key + 'T12:00:00')).toISOString().slice(0, 10);
                    const cur: Agg = byWeek.get(wk) || { revenue: 0, units: 0, cogs: 0, sales: 0 };
                    cur.revenue += agg.revenue;
                    cur.units += agg.units;
                    cur.cogs += agg.cogs;
                    cur.sales += agg.sales;
                    byWeek.set(wk, cur);
                });
                const wStart = startOfWeekMonday(startDay);
                const wEnd = startOfWeekMonday(endDay);
                const cursor = new Date(wStart);
                while (cursor <= wEnd) {
                    const key = cursor.toISOString().slice(0, 10);
                    const agg = byWeek.get(key) || { revenue: 0, units: 0, cogs: 0, sales: 0 };
                    cum += agg.revenue;
                    series.push({
                        date: key,
                        label:
                            cursor.toLocaleDateString(locale, { month: 'short', day: 'numeric' }) +
                            (language === 'es' ? ' (sem.)' : ' (wk)'),
                        dailyRevenue: agg.revenue,
                        dailyUnits: agg.units,
                        dailyCogs: agg.cogs,
                        dailySales: agg.sales,
                        cumulativeRevenue: cum
                    });
                    cursor.setDate(cursor.getDate() + 7);
                }
            }
            return series;
        };

        const series = useWeekly ? buildSeries('week', byDay) : buildSeries('day', byDay);

        return {
            series,
            granularity: useWeekly ? 'week' as const : 'day' as const,
            fromLabel: startDay.toLocaleDateString(locale, { dateStyle: 'medium' }),
            toLabel: endDay.toLocaleDateString(locale, { dateStyle: 'medium' })
        };
    }, [data.items, data.sales, data.rates, profitCurrency, language]);

    // 11. Sold Items Analysis (with currency conversion and productId grouping)
    const soldItemsAnalysis = useMemo(() => {
        // Build a map of items by ID
        const itemsMap = new Map(data.items.map(item => [item.id, item]));

        // Build a map of products by ID
        const productsMap = new Map((data.products || []).map(product => [product.id, product]));

        // Track sales per PRODUCT ID with currency-separated values
        const groupedStats: Record<string, {
            productId: string;
            productName: string;
            itemIds: string[];
            quantitySold: number;
            revenueByCurrency: CurrencyTotal;
            costByCurrency: CurrencyTotal;
            salesCount: number;
        }> = {};

        // Process all sales
        data.sales.forEach(sale => {
            sale.items.forEach(saleItem => {
                const originalItem = itemsMap.get(saleItem.itemId);

                // Get productId from the original item
                const productId = originalItem?.productId || 'unknown';

                // Get product name from products map, or fall back to sale item name
                const product = productsMap.get(productId);
                const productName = product?.name || saleItem.name || t('unknown');

                if (!groupedStats[productId]) {
                    groupedStats[productId] = {
                        productId,
                        productName,
                        itemIds: [],
                        quantitySold: 0,
                        revenueByCurrency: {},
                        costByCurrency: {},
                        salesCount: 0
                    };
                }

                const group = groupedStats[productId];

                // Track item ID if not already in group
                if (!group.itemIds.includes(saleItem.itemId)) {
                    group.itemIds.push(saleItem.itemId);
                }

                // Track revenue in sale currency
                const saleCurrency = sale.currency;
                group.revenueByCurrency[saleCurrency] =
                    (group.revenueByCurrency[saleCurrency] || 0) + saleItem.subtotal;

                // Track cost in buy currency (only if we have inventory data)
                if (originalItem) {
                    const buyCurrency = originalItem.buyCurrency;
                    const cost = (originalItem.buyPrice || 0) * saleItem.quantity;
                    group.costByCurrency[buyCurrency] =
                        (group.costByCurrency[buyCurrency] || 0) + cost;
                }

                group.quantitySold += saleItem.quantity;
                group.salesCount += 1;
            });
        });

        // Calculate averages and profit with currency conversion
        const analyzedItems = Object.values(groupedStats).map(stat => {
            // Convert all revenues to target currency
            let totalRevenueConverted = 0;
            Object.entries(stat.revenueByCurrency).forEach(([currency, amount]) => {
                totalRevenueConverted += amount * getConversionRate(currency, profitCurrency);
            });

            // Convert all costs to target currency
            let totalCostConverted = 0;
            Object.entries(stat.costByCurrency).forEach(([currency, amount]) => {
                totalCostConverted += amount * getConversionRate(currency, profitCurrency);
            });

            const avgSellPrice = stat.quantitySold > 0 ? totalRevenueConverted / stat.quantitySold : 0;
            const profit = totalRevenueConverted - totalCostConverted;
            const profitMargin = totalRevenueConverted > 0 ? (profit / totalRevenueConverted) * 100 : 0;

            return {
                productId: stat.productId,
                itemId: stat.productId,
                itemName: stat.productName,
                quantitySold: stat.quantitySold,
                totalRevenue: totalRevenueConverted,
                totalCost: totalCostConverted,
                avgSellPrice,
                profit,
                profitMargin,
                revenueCurrency: profitCurrency,
                costCurrency: profitCurrency
            };
        });

        // Sort by revenue (highest first)
        const topByRevenue = [...analyzedItems].sort((a, b) => b.totalRevenue - a.totalRevenue);

        // Sort by quantity sold
        const topByQuantity = [...analyzedItems].sort((a, b) => b.quantitySold - a.quantitySold);

        // Sort by profit margin
        const topByMargin = [...analyzedItems].sort((a, b) => b.profitMargin - a.profitMargin);

        // Items never sold (dead stock) - group by productId
        const soldProductIds = new Set(Object.keys(groupedStats));
        const unsoldGroups: Record<string, {
            productId: string;
            productName: string;
            remainingStock: number;
            value: number;
        }> = {};

        data.items
            .filter(item => item.quantity > 0)
            .forEach(item => {
                const productId = item.productId || 'unknown';

                // Skip if already sold
                if (soldProductIds.has(productId)) return;

                const product = productsMap.get(productId);
                const productName = product?.name || t('unknown');
                const value = (item.sellPrice || 0) * item.quantity;
                const valueConverted = value * getConversionRate(item.sellCurrency, profitCurrency);

                if (unsoldGroups[productId]) {
                    unsoldGroups[productId].remainingStock += item.quantity;
                    unsoldGroups[productId].value += valueConverted;
                } else {
                    unsoldGroups[productId] = {
                        productId,
                        productName,
                        remainingStock: item.quantity,
                        value: valueConverted
                    };
                }
            });

        const unsoldItems = Object.values(unsoldGroups).map(group => ({
            itemId: group.productId,
            itemName: group.productName,
            remainingStock: group.remainingStock,
            value: group.value,
            currency: profitCurrency
        }));

        // Total stats (all already converted to profitCurrency)
        const totalRevenueConverted = analyzedItems.reduce((sum, item) => sum + item.totalRevenue, 0);
        const totalProfit = analyzedItems.reduce((sum, item) => sum + item.profit, 0);
        const totalQuantitySold = analyzedItems.reduce((sum, item) => sum + item.quantitySold, 0);
        const avgProfitMargin = totalRevenueConverted > 0 ? (totalProfit / totalRevenueConverted) * 100 : 0;

        return {
            items: analyzedItems,
            topByRevenue: topByRevenue.slice(0, 5),
            topByQuantity: topByQuantity.slice(0, 5),
            topByMargin: topByMargin.slice(0, 5),
            unsoldItems,
            summary: {
                totalRevenue: totalRevenueConverted,
                totalProfit,
                totalQuantitySold,
                avgProfitMargin,
                itemsSold: analyzedItems.length,
                unsoldCount: unsoldItems.length
            }
        };
    }, [data.sales, data.items, data.products, profitCurrency, data.rates, t]);

    // 12. Pie chart data for each currency (using net positions)
    const pieChartDataByCurrency = useMemo(() => {
        const result: Record<string, { name: string; value: number; participantId: string }[]> = {};

        Object.entries(netPositionByParticipant).forEach(([participantId, currencies]) => {
            const participantName = data.participants.find(p => p.id === participantId)?.name || t('unknown');

            Object.entries(currencies).forEach(([currency, amount]) => {
                // Only include positive values in pie chart
                if (amount <= 0) return;

                if (!result[currency]) result[currency] = [];

                // Check if this participant already exists in this currency's data
                const existingEntry = result[currency].find(d => d.participantId === participantId);
                if (existingEntry) {
                    existingEntry.value += amount;
                } else {
                    result[currency].push({
                        name: participantName,
                        value: amount,
                        participantId: participantId
                    });
                }
            });
        });

        // Sort each currency's data by value descending
        Object.keys(result).forEach(currency => {
            result[currency].sort((a, b) => b.value - a.value);
        });

        return result;
    }, [netPositionByParticipant, data.participants, t]);

    // Get participant name
    const getParticipantName = (id: string) => {
        return data.participants.find(p => p.id === id)?.name || t('unknown');
    };

    // Custom tooltip for pie chart
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const total = payload[0].payload.totalValue || 0;
            const percentage = total > 0 ? ((payload[0].value / total) * 100).toFixed(1) : 0;
            return (
                <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
                    <p className="font-semibold text-slate-800">{payload[0].name}</p>
                    <p className="text-slate-600">{payload[0].value.toLocaleString()} {payload[0].payload.currency}</p>
                    <p className="text-slate-500 text-sm">{percentage}% of total</p>
                </div>
            );
        }
        return null;
    };

    // Render pie chart with total calculation
    const renderPieChart = (currency: string, chartData: { name: string; value: number; participantId: string }[]) => {
        const totalValue = chartData.reduce((sum, item) => sum + item.value, 0);
        const dataWithTotal = chartData.map(item => ({ ...item, totalValue, currency }));

        // Filter by participant if selected
        const filteredData = selectedParticipant === 'all'
            ? dataWithTotal
            : dataWithTotal.filter(d => d.participantId === selectedParticipant);

        if (filteredData.length === 0) return null;

        return (
            <div key={currency} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <DollarSign size={18} className="text-blue-500" />
                    {t('position_distribution')} - {currency}
                </h3>
                <p className="text-sm text-slate-500 mb-4">
                    {t('total')}: <span className="font-bold text-slate-800">{totalValue.toLocaleString()} {currency}</span>
                </p>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={filteredData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            >
                                {filteredData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        );
    };

    return (
        <div className="p-8 space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">{t('statistics')}</h2>
                    <p className="text-slate-500 mt-1">{t('statistics_desc')}</p>
                </div>
            </div>

            {/* Filters Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-4">
                    <Filter size={18} className="text-slate-500" />
                    <h3 className="text-lg font-semibold text-slate-800">{t('filters')}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Participant Filter */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('filter_participant')}</label>
                        <select
                            value={selectedParticipant}
                            onChange={(e) => setSelectedParticipant(e.target.value)}
                            className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="all">{t('all_participants')}</option>
                            {data.participants.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Currency Filter */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('filter_currency')}</label>
                        <select
                            value={selectedCurrency}
                            onChange={(e) => setSelectedCurrency(e.target.value)}
                            className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="all">{t('all_currencies')}</option>
                            {allCurrencies.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    {/* Profit Calculation Currency */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('profit_currency')}</label>
                        <select
                            value={profitCurrency}
                            onChange={(e) => setProfitCurrency(e.target.value as 'USD' | 'CUP')}
                            className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="USD">USD</option>
                            <option value="CUP">CUP</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Inventory Summary */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-4">
                    <Package size={18} className="text-slate-500" />
                    <h3 className="text-lg font-semibold text-slate-800">{t('inventory_summary')}</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="text-center p-4 bg-slate-50 rounded-lg">
                        <p className="text-2xl font-bold text-slate-800">{inventorySummary.total}</p>
                        <p className="text-sm text-slate-500">{t('total_purchased')}</p>
                    </div>
                    <div className="text-center p-4 bg-emerald-50 rounded-lg">
                        <p className="text-2xl font-bold text-emerald-700">{inventorySummary.sold}</p>
                        <p className="text-sm text-emerald-600">{t('total_sold')}</p>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <p className="text-2xl font-bold text-orange-700">{inventorySummary.selfTaken}</p>
                        <p className="text-sm text-orange-600">{t('total_self_taken')}</p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-700">{inventorySummary.remaining}</p>
                        <p className="text-sm text-blue-600">{t('remaining_stock')}</p>
                    </div>
                    <div className="text-center p-4 bg-amber-50 rounded-lg">
                        <p className="text-2xl font-bold text-amber-700">{inventorySummary.outflowPercentage.toFixed(1)}%</p>
                        <p className="text-sm text-amber-600">{t('sell_through_rate')}</p>
                    </div>
                </div>
                {/* Progress bar: sales + partner withdrawals vs initial stock */}
                <div className="mt-4">
                    <div className="flex flex-wrap justify-between gap-2 text-sm text-slate-500 mb-1">
                        <span>{t('sold')}: {inventorySummary.sold} · {t('total_self_taken')}: {inventorySummary.selfTaken}</span>
                        <span>{t('remaining')}: {inventorySummary.remaining}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3 relative overflow-hidden">
                        <div
                            className="absolute inset-y-0 left-0 bg-emerald-500 rounded-l-full transition-all duration-500"
                            style={{ width: `${inventorySummary.soldPercentage}%` }}
                            title={`${t('total_sold')}: ${inventorySummary.sold}`}
                        />
                        <div
                            className="absolute inset-y-0 bg-orange-400 transition-all duration-500"
                            style={{
                                left: `${inventorySummary.soldPercentage}%`,
                                width: `${inventorySummary.selfTakenPercentage}%`
                            }}
                            title={`${t('total_self_taken')}: ${inventorySummary.selfTaken}`}
                        />
                    </div>
                </div>
            </div>

            {/* Activity timeline: from first purchase */}
            {activityTimeline && activityTimeline.series.length > 0 && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-sky-100 text-sky-700 rounded-lg shrink-0">
                                <LineChartIcon size={22} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">{t('stats_timeline_title')}</h3>
                                <p className="text-sm text-slate-500 mt-0.5">{t('stats_timeline_desc')}</p>
                                <p className="text-xs text-slate-400 mt-1">
                                    {activityTimeline.fromLabel} — {activityTimeline.toLabel}
                                    {activityTimeline.granularity === 'week' && (
                                        <span className="ml-2 text-amber-600">· {t('stats_timeline_weekly')}</span>
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {/* Sold items: revenue, COGS, units */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                            <h4 className="text-lg font-semibold text-slate-800 mb-1">{t('stats_timeline_sold_title')}</h4>
                            <p className="text-sm text-slate-500 mb-4">{t('stats_timeline_sold_sub')}</p>
                            <div className="h-72 w-full min-w-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={activityTimeline.series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                        <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" minTickGap={24} />
                                        <YAxis
                                            yAxisId="left"
                                            tick={{ fontSize: 11 }}
                                            tickFormatter={v => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0))}
                                            width={48}
                                        />
                                        <YAxis
                                            yAxisId="right"
                                            orientation="right"
                                            tick={{ fontSize: 11 }}
                                            width={40}
                                        />
                                        <Tooltip
                                            formatter={(value: number, name: string) => [
                                                typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value,
                                                name
                                            ]}
                                            labelStyle={{ color: '#334155' }}
                                            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                                        <Line
                                            yAxisId="left"
                                            type="monotone"
                                            dataKey="dailyRevenue"
                                            name={`${t('stats_chart_daily_revenue')} (${profitCurrency})`}
                                            stroke="#2563eb"
                                            strokeWidth={2}
                                            dot={false}
                                        />
                                        <Line
                                            yAxisId="left"
                                            type="monotone"
                                            dataKey="dailyCogs"
                                            name={`${t('stats_chart_daily_cogs')} (${profitCurrency})`}
                                            stroke="#dc2626"
                                            strokeWidth={1.5}
                                            strokeDasharray="4 4"
                                            dot={false}
                                        />
                                        <Line
                                            yAxisId="right"
                                            type="monotone"
                                            dataKey="dailyUnits"
                                            name={t('stats_chart_units_sold')}
                                            stroke="#059669"
                                            strokeWidth={2}
                                            dot={false}
                                        />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* General: cumulative revenue + sales count */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                            <h4 className="text-lg font-semibold text-slate-800 mb-1">{t('stats_timeline_general_title')}</h4>
                            <p className="text-sm text-slate-500 mb-4">{t('stats_timeline_general_sub')}</p>
                            <div className="h-72 w-full min-w-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={activityTimeline.series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                        <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" minTickGap={24} />
                                        <YAxis
                                            yAxisId="left"
                                            tick={{ fontSize: 11 }}
                                            tickFormatter={v => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0))}
                                            width={48}
                                        />
                                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} width={36} allowDecimals={false} />
                                        <Tooltip
                                            formatter={(value: number, name: string) => [
                                                typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value,
                                                name
                                            ]}
                                            labelStyle={{ color: '#334155' }}
                                            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                                        <Area
                                            yAxisId="left"
                                            type="monotone"
                                            dataKey="cumulativeRevenue"
                                            name={`${t('stats_chart_cumulative_revenue')} (${profitCurrency})`}
                                            stroke="#1d4ed8"
                                            fill="#93c5fd"
                                            fillOpacity={0.35}
                                            strokeWidth={2}
                                        />
                                        <Line
                                            yAxisId="right"
                                            type="monotone"
                                            dataKey="dailySales"
                                            name={t('stats_chart_sales_count')}
                                            stroke="#d97706"
                                            strokeWidth={2}
                                            dot={false}
                                        />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {(!activityTimeline || activityTimeline.series.length === 0) && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center text-slate-500 text-sm">
                    {t('stats_timeline_empty')}
                </div>
            )}

            {/* Partial Earnings Section */}
            <div className="bg-gradient-to-r from-emerald-50 to-blue-50 p-6 rounded-xl shadow-sm border border-emerald-200">
                <div className="flex items-center gap-2 mb-4">
                    <PackageCheck size={18} className="text-emerald-600" />
                    <h3 className="text-lg font-semibold text-slate-800">{t('partial_earnings_title')}</h3>
                </div>
                <p className="text-sm text-slate-500 mb-4">{t('partial_earnings_desc')}</p>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Revenue from Sold Items */}
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-slate-500">{t('revenue_from_sold')}</h4>
                            <TrendingUp size={16} className="text-emerald-500" />
                        </div>
                        <p className="text-xl font-bold text-emerald-700">
                            {totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 2 })} {profitCurrency}
                        </p>
                    </div>

                    {/* Cost of Sold Items */}
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-slate-500">{t('cost_of_sold_items')}</h4>
                            <TrendingDown size={16} className="text-red-500" />
                        </div>
                        <p className="text-xl font-bold text-red-600">
                            {partialEarnings.costOfSoldItems.toLocaleString(undefined, { maximumFractionDigits: 2 })} {profitCurrency}
                        </p>
                    </div>

                    {/* Transport Costs */}
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-slate-500">{t('transport_costs')}</h4>
                            <TrendingDown size={16} className="text-amber-500" />
                        </div>
                        <p className="text-xl font-bold text-amber-600">
                            {totalSalesTransport.toLocaleString(undefined, { maximumFractionDigits: 2 })} {profitCurrency}
                        </p>
                    </div>

                    {/* Partial Earnings */}
                    <div className={`p-4 rounded-lg shadow-sm ${partialEarnings.earnings >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                        <div className="flex items-center justify-between mb-2">
                            <h4 className={`text-sm font-medium ${partialEarnings.earnings >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                {t('partial_earnings')}
                            </h4>
                            <DollarSign size={16} className={partialEarnings.earnings >= 0 ? 'text-emerald-500' : 'text-red-500'} />
                        </div>
                        <p className={`text-xl font-bold ${partialEarnings.earnings >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                            {partialEarnings.earnings.toLocaleString(undefined, { maximumFractionDigits: 2 })} {profitCurrency}
                        </p>
                    </div>
                </div>

                {/* Profit margin */}
                <div className="mt-4 p-3 bg-white rounded-lg">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">{t('profit_margin')}</span>
                        <span className={`font-bold ${partialEarnings.earnings > 0 && totalRevenue > 0
                            ? ((partialEarnings.earnings / totalRevenue) * 100) >= 0 ? 'text-emerald-600' : 'text-red-600'
                            : 'text-slate-400'}`}>
                            {totalRevenue > 0 ? ((partialEarnings.earnings / totalRevenue) * 100).toFixed(1) : 0}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Profit Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Spending */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-slate-500 font-medium">{t('total_spending')}</h3>
                        <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                            <TrendingDown size={20} />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">
                        {totalSpending.toLocaleString(undefined, { maximumFractionDigits: 2 })} {profitCurrency}
                    </p>
                </div>

                {/* Total Revenue */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-slate-500 font-medium">{t('total_revenue')}</h3>
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                            <TrendingUp size={20} />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">
                        {totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 2 })} {profitCurrency}
                    </p>
                </div>

                {/* Sales Transport Costs */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-slate-500 font-medium">{t('sales_transport_costs')}</h3>
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                            <TrendingDown size={20} />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">
                        {totalSalesTransport.toLocaleString(undefined, { maximumFractionDigits: 2 })} {profitCurrency}
                    </p>
                </div>

                {/* Net Profit */}
                <div className={`p-6 rounded-xl shadow-sm border ${profit >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className={`font-medium ${profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                            {t('net_profit')}
                        </h3>
                        <div className={`p-2 rounded-lg ${profit >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                            <DollarSign size={20} />
                        </div>
                    </div>
                    <p className={`text-2xl font-bold ${profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {profit.toLocaleString(undefined, { maximumFractionDigits: 2 })} {profitCurrency}
                    </p>
                    <p className={`text-sm mt-2 ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {profit >= 0 ? t('profit_positive') : t('profit_negative')}
                    </p>
                </div>
            </div>

            {/* Sold Items Analysis Section */}
            {soldItemsAnalysis?.items?.length > 0 && (
                <div className="space-y-6">
                    {/* Section Header */}
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                            <ShoppingCart size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">{t('sold_items_analysis')}</h3>
                            <p className="text-sm text-slate-500">{t('sold_items_analysis_desc')}</p>
                        </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                            <p className="text-xs font-medium text-blue-600 mb-1">{t('items_sold_count')}</p>
                            <p className="text-2xl font-bold text-blue-800">{soldItemsAnalysis.summary.itemsSold}</p>
                        </div>
                        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-xl border border-emerald-200">
                            <p className="text-xs font-medium text-emerald-600 mb-1">{t('total_qty_sold')}</p>
                            <p className="text-2xl font-bold text-emerald-800">{soldItemsAnalysis.summary.totalQuantitySold}</p>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                            <p className="text-xs font-medium text-purple-600 mb-1">{t('avg_profit_margin')}</p>
                            <p className="text-2xl font-bold text-purple-800">{soldItemsAnalysis.summary.avgProfitMargin.toFixed(1)}%</p>
                        </div>
                        <div className={`p-4 rounded-xl border ${soldItemsAnalysis.summary.unsoldCount > 0 ? 'bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200' : 'bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200'}`}>
                            <p className={`text-xs font-medium mb-1 ${soldItemsAnalysis.summary.unsoldCount > 0 ? 'text-amber-600' : 'text-slate-500'}`}>{t('unsold_items')}</p>
                            <p className={`text-2xl font-bold ${soldItemsAnalysis.summary.unsoldCount > 0 ? 'text-amber-800' : 'text-slate-600'}`}>{soldItemsAnalysis.summary.unsoldCount}</p>
                        </div>
                    </div>

                    {/* Top Performers Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Top by Revenue */}
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                            <div className="flex items-center gap-2 mb-4">
                                <DollarSign size={18} className="text-emerald-500" />
                                <h4 className="font-semibold text-slate-800">{t('top_by_revenue')}</h4>
                            </div>
                            <div className="space-y-3">
                                {soldItemsAnalysis.topByRevenue.map((item, idx) => (
                                    <div key={item.itemId} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>
                                                {idx + 1}
                                            </span>
                                            <span className="text-sm font-medium text-slate-700 truncate max-w-[100px]">{item.itemName}</span>
                                        </div>
                                        <span className="text-sm font-bold text-emerald-600">{item.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-slate-400 text-xs font-normal">{profitCurrency}</span></span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Top by Quantity */}
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                            <div className="flex items-center gap-2 mb-4">
                                <BarChart3 size={18} className="text-blue-500" />
                                <h4 className="font-semibold text-slate-800">{t('top_by_quantity')}</h4>
                            </div>
                            <div className="space-y-3">
                                {soldItemsAnalysis.topByQuantity.map((item, idx) => (
                                    <div key={item.itemId} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>
                                                {idx + 1}
                                            </span>
                                            <span className="text-sm font-medium text-slate-700 truncate max-w-[100px]">{item.itemName}</span>
                                        </div>
                                        <span className="text-sm font-bold text-blue-600">{item.quantitySold} {t('units')}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Top by Profit Margin */}
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                            <div className="flex items-center gap-2 mb-4">
                                <Award size={18} className="text-purple-500" />
                                <h4 className="font-semibold text-slate-800">{t('top_by_margin')}</h4>
                            </div>
                            <div className="space-y-3">
                                {soldItemsAnalysis.topByMargin.map((item, idx) => (
                                    <div key={item.itemId} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>
                                                {idx + 1}
                                            </span>
                                            <span className="text-sm font-medium text-slate-700 truncate max-w-[100px]">{item.itemName}</span>
                                        </div>
                                        <span className="text-sm font-bold text-purple-600">{item.profitMargin.toFixed(1)}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Detailed Items Table */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                        <h4 className="font-semibold text-slate-800 mb-4">{t('all_sold_items')}</h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200">
                                        <th className="pb-3 font-semibold text-slate-500">{t('item_name')}</th>
                                        <th className="pb-3 font-semibold text-slate-500 text-right">{t('qty_sold')}</th>
                                        <th className="pb-3 font-semibold text-slate-500 text-right">{t('avg_price')}</th>
                                        <th className="pb-3 font-semibold text-slate-500 text-right">{t('total_revenue')}</th>
                                        <th className="pb-3 font-semibold text-slate-500 text-right">{t('total_cost')}</th>
                                        <th className="pb-3 font-semibold text-slate-500 text-right">{t('profit')}</th>
                                        <th className="pb-3 font-semibold text-slate-500 text-right">{t('margin')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {soldItemsAnalysis.items.map(item => (
                                        <tr key={item.itemId} className="hover:bg-slate-50">
                                            <td className="py-3 font-medium text-slate-800">
                                                {item.itemName}
                                            </td>
                                            <td className="py-3 text-right text-slate-700">{item.quantitySold}</td>
                                            <td className="py-3 text-right text-slate-600">{item.avgSellPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-slate-400 text-xs">{profitCurrency}</span></td>
                                            <td className="py-3 text-right font-semibold text-emerald-600">{item.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-slate-400 text-xs">{profitCurrency}</span></td>
                                            <td className="py-3 text-right text-red-600">{item.totalCost.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-slate-400 text-xs">{profitCurrency}</span></td>
                                            <td className={`py-3 text-right font-bold ${item.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {item.profit >= 0 ? '+' : ''}{item.profit.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-slate-400 text-xs font-normal">{profitCurrency}</span>
                                            </td>
                                            <td className="py-3 text-right">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${item.profitMargin >= 50 ? 'bg-emerald-100 text-emerald-700' : item.profitMargin >= 20 ? 'bg-blue-100 text-blue-700' : item.profitMargin >= 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                                    {item.profitMargin.toFixed(1)}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Unsold Items Alert */}
                    {soldItemsAnalysis.unsoldItems.length > 0 && (
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-5 rounded-xl border border-amber-200">
                            <div className="flex items-center gap-2 mb-4">
                                <AlertTriangle size={18} className="text-amber-600" />
                                <h4 className="font-semibold text-amber-800">{t('unsold_items_alert')}</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {soldItemsAnalysis.unsoldItems.map(item => (
                                    <div key={item.itemId} className="bg-white p-3 rounded-lg border border-amber-100">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-medium text-slate-800">{item.itemName}</p>
                                                <p className="text-xs text-slate-500">{t('remaining')}: {item.remainingStock} {t('units')}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-amber-600">{item.value.toLocaleString()}</p>
                                                <p className="text-xs text-slate-400">{item.currency}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Spending by Participant Table */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-4">
                    <Users size={18} className="text-slate-500" />
                    <h3 className="text-lg font-semibold text-slate-800">{t('spending_by_participant')}</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="pb-3 text-sm font-semibold text-slate-500">{t('participant_header')}</th>
                                <th className="pb-3 text-sm font-semibold text-slate-500 text-right">{t('invested')}</th>
                                <th className="pb-3 text-sm font-semibold text-slate-500 text-right">{t('adjustments')}</th>
                                <th className="pb-3 text-sm font-semibold text-slate-500 text-right">{t('net_position')}</th>
                                <th className="pb-3 text-sm font-semibold text-slate-500 text-right">{t('total_in')} {profitCurrency}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {Object.keys(netPositionByParticipant).length > 0 ? (
                                Object.entries(netPositionByParticipant)
                                    .filter(([participantId]) => selectedParticipant === 'all' || participantId === selectedParticipant)
                                    .map(([participantId, netTotals]) => {
                                        const investedTotals = spendingByParticipant[participantId] || {};
                                        const paidAdjustments = adjustmentsByParticipant.paid[participantId] || {};
                                        const receivedAdjustments = adjustmentsByParticipant.received[participantId] || {};

                                        // Get all currencies for this participant
                                        const allCurrencies = new Set([
                                            ...Object.keys(investedTotals),
                                            ...Object.keys(paidAdjustments),
                                            ...Object.keys(receivedAdjustments)
                                        ]);

                                        // Calculate net position total in target currency
                                        let netTotalInTargetCurrency = 0;
                                        Object.entries(netTotals).forEach(([currency, amount]) => {
                                            if (selectedCurrency === 'all' || currency === selectedCurrency) {
                                                netTotalInTargetCurrency += amount * getConversionRate(currency, profitCurrency);
                                            }
                                        });

                                        return (
                                            <tr key={participantId} className="group hover:bg-slate-50">
                                                <td className="py-4 text-slate-700 font-medium">{getParticipantName(participantId)}</td>
                                                <td className="py-4 text-right">
                                                    <div className="flex flex-wrap gap-1 justify-end">
                                                        {Object.entries(investedTotals)
                                                            .filter(([currency]) => selectedCurrency === 'all' || currency === selectedCurrency)
                                                            .map(([currency, amount]) => (
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
                                                        {Array.from(allCurrencies)
                                                            .filter(currency => selectedCurrency === 'all' || currency === selectedCurrency)
                                                            .map(currency => {
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
                                                        {Object.entries(netTotals)
                                                            .filter(([currency]) => selectedCurrency === 'all' || currency === selectedCurrency)
                                                            .map(([currency, amount]) => (
                                                                <span key={currency} className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${amount >= 0 ? 'bg-slate-100 text-slate-800' : 'bg-red-50 text-red-700'}`}>
                                                                    {amount.toLocaleString()} {currency}
                                                                </span>
                                                            ))}
                                                    </div>
                                                </td>
                                                <td className="py-4 text-right font-semibold text-slate-800">
                                                    {netTotalInTargetCurrency.toLocaleString(undefined, { maximumFractionDigits: 2 })} {profitCurrency}
                                                </td>
                                            </tr>
                                        );
                                    })
                            ) : (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-slate-400">{t('no_spending_data')}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pie Charts by Currency */}
            <div>
                <h3 className="text-xl font-semibold text-slate-800 mb-4">{t('spending_distribution_by_currency')}</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {Object.entries(pieChartDataByCurrency)
                        .filter(([currency]) => selectedCurrency === 'all' || currency === selectedCurrency)
                        .map(([currency, chartData]) => renderPieChart(currency, chartData))
                    }
                </div>
                {Object.keys(pieChartDataByCurrency).length === 0 && (
                    <div className="bg-white p-12 rounded-xl shadow-sm border border-slate-100 text-center text-slate-400">
                        {t('no_data_for_charts')}
                    </div>
                )}
            </div>

            {/* Exchange Rates Info */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h4 className="text-sm font-semibold text-slate-600 mb-2">{t('current_rates')}</h4>
                <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                    <span>1 USD = {data.rates.USD} CUP</span>
                    <span>1 EUR = {data.rates.EUR} CUP</span>
                </div>
            </div>
        </div>
    );
};