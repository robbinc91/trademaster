import React, { useState, useMemo } from 'react';
import { Sale, SaleItem, Item, Product } from '../types';
import { Calendar, Phone, Search, MapPin, Pencil, X, Trash2, ChevronDown, ChevronUp, Receipt, DollarSign, Truck, Filter, Package, RotateCcw, Plus, Minus } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { CURRENCIES } from '../constants';

interface SalesHistoryProps {
    sales: Sale[];
    items: Item[];
    products: Product[];
    editSale: (id: string, sale: Omit<Sale, 'id'>) => void;
    deleteSale: (id: string) => void;
}

type DateFilter = 'all' | 'today' | 'week' | 'month';

export const SalesHistory: React.FC<SalesHistoryProps> = ({ sales, items, products, editSale, deleteSale }) => {
    const { t } = useLanguage();
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState<DateFilter>('all');
    const [expandedSales, setExpandedSales] = useState<Set<string>>(new Set());
    const [editingSale, setEditingSale] = useState<Sale | null>(null);

    // Edit form state
    const [editForm, setEditForm] = useState({
        customerPhone: '',
        address: '',
        transportCost: '',
        transportCurrency: 'USD',
        totalAmount: '',
        currency: 'CUP',
        dateSold: ''
    });

    // Edit items state - for modifying quantities
    const [editItems, setEditItems] = useState<SaleItem[]>([]);

    // Helper to get product name from item
    const getProductName = (itemId: string): string => {
        const item = items.find(i => i.id === itemId);
        if (item) {
            const product = products.find(p => p.id === item.productId);
            return product?.name || t('unknown');
        }
        return t('unknown');
    };

    // Date filter logic
    const getDateRange = (filter: DateFilter): { start: Date; end: Date } | null => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (filter) {
            case 'today':
                return { start: today, end: now };
            case 'week':
                const weekAgo = new Date(today);
                weekAgo.setDate(weekAgo.getDate() - 7);
                return { start: weekAgo, end: now };
            case 'month':
                const monthAgo = new Date(today);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                return { start: monthAgo, end: now };
            default:
                return null;
        }
    };

    // Filter sales based on search and date
    const filteredSales = useMemo(() => {
        let result = [...sales];

        // Date filter
        const dateRange = getDateRange(dateFilter);
        if (dateRange) {
            result = result.filter(sale => {
                const saleDate = new Date(sale.dateSold);
                return saleDate >= dateRange.start && saleDate <= dateRange.end;
            });
        }

        // Search filter
        if (searchTerm) {
            result = result.filter(sale =>
                (sale.customerPhone && sale.customerPhone.includes(searchTerm)) ||
                (sale.address && sale.address.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        return result.reverse(); // Show newest first
    }, [sales, searchTerm, dateFilter]);

    // Group sales by date
    const groupedSales = useMemo(() => {
        const groups: Record<string, Sale[]> = {};

        filteredSales.forEach(sale => {
            const dateKey = sale.dateSold;
            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(sale);
        });

        return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
    }, [filteredSales]);

    // Summary stats
    const summaryStats = useMemo(() => {
        const totalSales = filteredSales.length;
        const revenueByCurrency: Record<string, number> = {};

        filteredSales.forEach(sale => {
            revenueByCurrency[sale.currency] = (revenueByCurrency[sale.currency] || 0) + sale.totalAmount;
        });

        const totalItems = filteredSales.reduce((sum, sale) =>
            sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
        );

        return { totalSales, revenueByCurrency, totalItems };
    }, [filteredSales]);

    const toggleSaleExpansion = (saleId: string) => {
        const newExpanded = new Set(expandedSales);
        if (newExpanded.has(saleId)) {
            newExpanded.delete(saleId);
        } else {
            newExpanded.add(saleId);
        }
        setExpandedSales(newExpanded);
    };

    const handleEditClick = (sale: Sale) => {
        setEditingSale(sale);
        setEditItems([...sale.items]); // Copy items for editing
        setEditForm({
            customerPhone: sale.customerPhone || '',
            address: sale.address || '',
            transportCost: sale.transportCost.toString(),
            transportCurrency: sale.transportCurrency || 'USD',
            totalAmount: sale.totalAmount.toString(),
            currency: sale.currency,
            dateSold: sale.dateSold
        });
    };

    // Calculate total from edit items
    const calculateItemsTotal = (itemsList: SaleItem[]): number => {
        return itemsList.reduce((sum, item) => sum + item.subtotal, 0);
    };

    // Update item quantity and recalculate subtotal
    const updateItemQuantity = (index: number, newQuantity: number) => {
        if (newQuantity < 1) return;

        setEditItems(prev => {
            const updated = [...prev];
            updated[index] = {
                ...updated[index],
                quantity: newQuantity,
                subtotal: newQuantity * updated[index].pricePerUnit
            };

            // Update the total in editForm
            const newTotal = calculateItemsTotal(updated);
            setEditForm(form => ({ ...form, totalAmount: newTotal.toString() }));

            return updated;
        });
    };

    // Update item price per unit and recalculate subtotal
    const updateItemPrice = (index: number, newPrice: number) => {
        if (newPrice < 0) return;

        setEditItems(prev => {
            const updated = [...prev];
            updated[index] = {
                ...updated[index],
                pricePerUnit: newPrice,
                subtotal: updated[index].quantity * newPrice
            };

            // Update the total in editForm
            const newTotal = calculateItemsTotal(updated);
            setEditForm(form => ({ ...form, totalAmount: newTotal.toString() }));

            return updated;
        });
    };

    // Remove item from edit
    const removeEditItem = (index: number) => {
        setEditItems(prev => {
            const updated = prev.filter((_, i) => i !== index);
            // Update the total in editForm
            const newTotal = calculateItemsTotal(updated);
            setEditForm(form => ({ ...form, totalAmount: newTotal.toString() }));
            return updated;
        });
    };

    const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setEditForm(prev => ({ ...prev, [name]: value }));
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSale) return;

        // Validate items
        if (editItems.length === 0) {
            alert(t('no_items_error') || 'Cannot save a sale with no items');
            return;
        }

        editSale(editingSale.id, {
            items: editItems,
            customerPhone: editForm.customerPhone,
            address: editForm.address,
            transportCost: parseFloat(editForm.transportCost) || 0,
            transportCurrency: editForm.transportCurrency,
            totalAmount: parseFloat(editForm.totalAmount),
            currency: editForm.currency,
            dateSold: editForm.dateSold
        });

        setEditingSale(null);
    };

    const handleRollback = (sale: Sale) => {
        const itemsList = sale.items.map(i => `${i.quantity}x ${getProductName(i.itemId)}`).join('\n  • ');
        const totalRestored = sale.items.reduce((sum, i) => sum + i.quantity, 0);

        if (confirm(
            `🔄 ${t('rollback_sale_title')}\n\n` +
            `${t('rollback_confirm_message')}\n\n` +
            `📦 ${t('items_to_restore')}:\n  • ${itemsList}\n\n` +
            `📊 ${t('total_units_restore')}: ${totalRestored}\n` +
            `💰 ${t('sale_amount')}: ${sale.totalAmount.toFixed(2)} ${sale.currency}\n\n` +
            `⚠️ ${t('rollback_warning')}`
        )) {
            deleteSale(sale.id);
        }
    };

    const closeEditModal = () => {
        setEditingSale(null);
    };

    // Format date for display
    const formatDisplayDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (dateStr === today.toISOString().split('T')[0]) {
            return t('today') || 'Today';
        } else if (dateStr === yesterday.toISOString().split('T')[0]) {
            return t('yesterday') || 'Yesterday';
        }
        return dateStr;
    };

    return (
        <div className="p-8 space-y-6 h-full flex flex-col animate-fade-in">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">{t('history_title')}</h2>
                    <p className="text-slate-500 mt-1">{t('history_subtitle')}</p>
                </div>

                {/* Search & Filters */}
                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                    {/* Date Filter */}
                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-slate-400" />
                        <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                            className="border rounded-lg px-3 py-2 bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="all">{t('all_time') || 'All Time'}</option>
                            <option value="today">{t('today') || 'Today'}</option>
                            <option value="week">{t('this_week') || 'This Week'}</option>
                            <option value="month">{t('this_month') || 'This Month'}</option>
                        </select>
                    </div>

                    {/* Search Bar */}
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder={t('search_placeholder')}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                    <div className="flex items-center gap-2 mb-1">
                        <Receipt size={16} className="text-blue-600" />
                        <span className="text-xs font-medium text-blue-600">{t('total_sales')}</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-800">{summaryStats.totalSales}</p>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-xl border border-emerald-200">
                    <div className="flex items-center gap-2 mb-1">
                        <DollarSign size={16} className="text-emerald-600" />
                        <span className="text-xs font-medium text-emerald-600">{t('total_revenue')}</span>
                    </div>
                    <div className="text-lg font-bold text-emerald-800">
                        {Object.entries(summaryStats.revenueByCurrency).map(([currency, amount]) => (
                            <div key={currency}>{amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency}</div>
                        ))}
                        {Object.keys(summaryStats.revenueByCurrency).length === 0 && <span className="text-slate-400">-</span>}
                    </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                    <div className="flex items-center gap-2 mb-1">
                        <Package size={16} className="text-purple-600" />
                        <span className="text-xs font-medium text-purple-600">{t('total_qty_sold')}</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-800">{summaryStats.totalItems}</p>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-xl border border-amber-200">
                    <div className="flex items-center gap-2 mb-1">
                        <Truck size={16} className="text-amber-600" />
                        <span className="text-xs font-medium text-amber-600">{t('transport_fee')}</span>
                    </div>
                    <p className="text-lg font-bold text-amber-800">
                        {filteredSales.filter(s => s.transportCost > 0).length} {t('with_transport') || 'w/ transport'}
                    </p>
                </div>
            </div>

            {/* Sales List */}
            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                {groupedSales.length > 0 ? (
                    groupedSales.map(([date, dateSales]) => (
                        <div key={date} className="space-y-3">
                            {/* Date Header */}
                            <div className="flex items-center gap-3 sticky top-0 bg-slate-50 py-2 z-10">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                    <Calendar size={18} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-800">{formatDisplayDate(date)}</h3>
                                    <p className="text-xs text-slate-500">{dateSales.length} {t('sales') || 'sales'}</p>
                                </div>
                            </div>

                            {/* Sales Cards for this date */}
                            <div className="space-y-3 pl-2">
                                {dateSales.map(sale => (
                                    <div
                                        key={sale.id}
                                        className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow"
                                    >
                                        {/* Main Content - Always Visible */}
                                        <div
                                            className="p-4 cursor-pointer"
                                            onClick={() => toggleSaleExpansion(sale.id)}
                                        >
                                            <div className="flex items-center justify-between">
                                                {/* Left: Customer Info */}
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2 bg-slate-100 rounded-lg">
                                                        <Receipt size={20} className="text-slate-500" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            {sale.customerPhone ? (
                                                                <span className="font-medium text-slate-800 flex items-center gap-1">
                                                                    <Phone size={14} className="text-blue-500" />
                                                                    {sale.customerPhone}
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-400 italic">{t('no_phone')}</span>
                                                            )}
                                                        </div>
                                                        <div className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                                                            <MapPin size={12} />
                                                            <span className="truncate max-w-[200px]">{sale.address || t('local_pickup')}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Center: Items Preview */}
                                                <div className="hidden md:flex items-center gap-2 text-sm text-slate-600">
                                                    <span className="font-medium text-slate-900">{sale.items.length}</span>
                                                    {t('items_count').replace('{count}', '')}
                                                    {sale.items.length > 0 && (
                                                        <span className="text-slate-400">
                                                            ({sale.items.slice(0, 2).map(i => getProductName(i.itemId)).join(', ')}{sale.items.length > 2 ? '...' : ''})
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Right: Total & Expand */}
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <p className="font-bold text-lg text-emerald-600">
                                                            {sale.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {sale.currency}
                                                        </p>
                                                        {sale.transportCost > 0 && (
                                                            <p className="text-xs text-slate-400">
                                                                +{sale.transportCost} {sale.transportCurrency} {t('transport_fee')}
                                                            </p>
                                                        )}
                                                    </div>
                                                    {expandedSales.has(sale.id) ? (
                                                        <ChevronUp size={20} className="text-slate-400" />
                                                    ) : (
                                                        <ChevronDown size={20} className="text-slate-400" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Expanded Details */}
                                        {expandedSales.has(sale.id) && (
                                            <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-4">
                                                {/* Items List */}
                                                <div>
                                                    <h4 className="text-sm font-semibold text-slate-700 mb-2">{t('items_in_sale')}</h4>
                                                    <div className="grid gap-2">
                                                        {sale.items.map((item, idx) => (
                                                            <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-100">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded text-xs font-medium">
                                                                        {item.quantity}x
                                                                    </div>
                                                                    <span className="font-medium text-slate-800">{getProductName(item.itemId)}</span>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="font-semibold text-slate-700">{item.subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                                                                    <p className="text-xs text-slate-400">@ {item.pricePerUnit} {sale.currency}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleEditClick(sale); }}
                                                        className="flex items-center gap-2 px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                                    >
                                                        <Pencil size={16} />
                                                        {t('edit')}
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleRollback(sale); }}
                                                        className="flex items-center gap-2 px-4 py-2 text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                                                    >
                                                        <RotateCcw size={16} />
                                                        {t('rollback')}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <Receipt size={64} className="mb-4 opacity-30" />
                        <p className="text-lg font-medium">{t('no_sales_found')}</p>
                        <p className="text-sm">{t('try_different_filter') || 'Try a different filter or search term'}</p>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editingSale && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl animate-slide-in-down">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h3 className="text-lg font-bold text-slate-800">{t('edit_sale_title')}</h3>
                            <button
                                onClick={closeEditModal}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X size={18} className="text-slate-500" />
                            </button>
                        </div>

                        <form onSubmit={handleEditSubmit} className="p-4 grid grid-cols-2 gap-3">
                            {/* Sale Items (Editable) */}
                            <div className="bg-slate-50 p-3 rounded-lg col-span-2">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-semibold text-slate-700">{t('items_in_sale')}</label>
                                    <span className="text-xs text-slate-500">
                                        {editItems.length} {editItems.length === 1 ? t('item_label') : t('items_count').replace('{count}', '')}
                                    </span>
                                </div>
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                    {editItems.length > 0 ? editItems.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
                                            {/* Product Name */}
                                            <div className="flex-1 min-w-0">
                                                <span className="text-sm font-medium text-slate-800 truncate block">
                                                    {getProductName(item.itemId)}
                                                </span>
                                            </div>

                                            {/* Quantity Controls */}
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => updateItemQuantity(idx, item.quantity - 1)}
                                                    disabled={item.quantity <= 1}
                                                    className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    <Minus size={14} />
                                                </button>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={(e) => updateItemQuantity(idx, parseInt(e.target.value) || 1)}
                                                    className="w-14 text-center border rounded px-1 py-1 text-sm font-medium"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => updateItemQuantity(idx, item.quantity + 1)}
                                                    className="p-1 rounded bg-slate-100 hover:bg-slate-200 transition-colors"
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            </div>

                                            {/* Price Per Unit */}
                                            <div className="flex items-center gap-1">
                                                <span className="text-xs text-slate-400">@</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={item.pricePerUnit}
                                                    onChange={(e) => updateItemPrice(idx, parseFloat(e.target.value) || 0)}
                                                    className="w-20 border rounded px-2 py-1 text-sm text-right"
                                                />
                                            </div>

                                            {/* Subtotal */}
                                            <div className="w-20 text-right">
                                                <span className="text-sm font-semibold text-slate-700">
                                                    {item.subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                </span>
                                            </div>

                                            {/* Delete Button */}
                                            <button
                                                type="button"
                                                onClick={() => removeEditItem(idx)}
                                                className="p-1.5 rounded bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                                                title={t('remove_item') || 'Remove item'}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    )) : (
                                        <div className="text-center py-4 text-slate-400">
                                            <Package size={32} className="mx-auto mb-2 opacity-30" />
                                            <p className="text-sm">{t('no_items_error') || 'No items in sale'}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Items Total */}
                                {editItems.length > 0 && (
                                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200">
                                        <span className="text-sm font-medium text-slate-600">{t('items_subtotal') || 'Items Subtotal'}</span>
                                        <span className="font-bold text-slate-800">
                                            {calculateItemsTotal(editItems).toLocaleString(undefined, { maximumFractionDigits: 2 })} {editForm.currency}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Customer Phone */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{t('customer_phone')}</label>
                                <input
                                    type="tel"
                                    name="customerPhone"
                                    value={editForm.customerPhone}
                                    onChange={handleEditInputChange}
                                    className="w-full border rounded-lg p-2"
                                    placeholder="+53 5XXX XXXX"
                                />
                            </div>

                            {/* Address */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{t('delivery_address')}</label>
                                <input
                                    type="text"
                                    name="address"
                                    value={editForm.address}
                                    onChange={handleEditInputChange}
                                    className="w-full border rounded-lg p-2"
                                    placeholder={t('address_placeholder')}
                                />
                            </div>

                            {/* Total Amount */}
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('total')}</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="totalAmount"
                                        value={editForm.totalAmount}
                                        onChange={handleEditInputChange}
                                        className="w-full border rounded-lg p-2"
                                        required
                                    />
                                </div>
                                <div className="w-20">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('currency')}</label>
                                    <select
                                        name="currency"
                                        value={editForm.currency}
                                        onChange={handleEditInputChange}
                                        className="w-full border rounded-lg p-2 bg-slate-50"
                                    >
                                        {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Transport Cost */}
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('transport_fee')}</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="transportCost"
                                        value={editForm.transportCost}
                                        onChange={handleEditInputChange}
                                        className="w-full border rounded-lg p-2"
                                    />
                                </div>
                                <div className="w-20">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('transport_currency')}</label>
                                    <select
                                        name="transportCurrency"
                                        value={editForm.transportCurrency}
                                        onChange={handleEditInputChange}
                                        className="w-full border rounded-lg p-2 bg-slate-50"
                                    >
                                        {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Date */}
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">{t('date_sale')}</label>
                                <div className="relative">
                                    <Calendar size={16} className="absolute left-3 top-2.5 text-slate-400" />
                                    <input
                                        type="date"
                                        name="dateSold"
                                        value={editForm.dateSold}
                                        onChange={handleEditInputChange}
                                        className="w-full border rounded-lg pl-10 p-2"
                                    />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="col-span-2 flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={closeEditModal}
                                    className="px-4 py-2 rounded-lg font-medium bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
                                >
                                    {t('cancel')}
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                                >
                                    {t('save_changes')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};