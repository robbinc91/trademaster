import React, { useState, useMemo } from 'react';
import { Item, SaleItem } from '../types';
import { CURRENCIES } from '../constants';
import { ShoppingCart, Trash, Plus, CheckCircle, Phone, Calendar, AlertCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface SalesProps {
    items: Item[];
    addSale: (sale: Omit<import('../types').Sale, 'id'>) => void;
}

/**
 * Normalize a name for comparison: lowercase + remove all spaces
 */
const normalizeName = (name: string): string => {
    return name.toLowerCase().replace(/\s+/g, '').trim();
};

/**
 * Calculate Levenshtein distance between two strings
 */
const levenshteinDistance = (a: string, b: string): number => {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (a[j - 1] === b[i - 1]) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[b.length][a.length];
};

/**
 * Check if two names are similar enough to be grouped (1-2 char differences allowed)
 */
const areNamesSimilar = (name1: string, name2: string, tolerance: number = 2): boolean => {
    const norm1 = normalizeName(name1);
    const norm2 = normalizeName(name2);

    if (norm1 === norm2) return true;

    const distance = levenshteinDistance(norm1, norm2);
    const maxLength = Math.max(norm1.length, norm2.length);
    const maxAllowedDistance = Math.min(tolerance, Math.floor(maxLength * 0.15));

    return distance <= maxAllowedDistance;
};

interface GroupedItem {
    name: string;
    displayNames: string[];
    totalQuantity: number;
    batches: Item[];
    minPrice: number;
    maxPrice: number;
    currencies: string[];
}

export const Sales: React.FC<SalesProps> = ({ items, addSale }) => {
    const { t } = useLanguage();
    const [cart, setCart] = useState<SaleItem[]>([]);
    const [selectedGroupName, setSelectedGroupName] = useState<string>('');

    // Item Input State
    const [qtyInput, setQtyInput] = useState<string>('1');
    const [priceInput, setPriceInput] = useState<string>('');
    const [currencyInput, setCurrencyInput] = useState<string>('CUP');

    // Checkout Details State
    const [transportCost, setTransportCost] = useState<string>('0');
    const [transportCurrency, setTransportCurrency] = useState<string>('USD');
    const [address, setAddress] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);

    // The currency of the current active sale (locked by first item)
    const [saleCurrency, setSaleCurrency] = useState<string>('CUP');

    // Group items by name with fuzzy matching
    const groupedItems = useMemo(() => {
        const groups: Record<string, GroupedItem> = {};

        items.forEach(item => {
            if (item.quantity <= 0) return;

            // Find existing group with fuzzy matching
            let matchingKey: string | null = null;
            for (const key of Object.keys(groups)) {
                if (areNamesSimilar(item.name, key)) {
                    matchingKey = key;
                    break;
                }
            }

            if (matchingKey) {
                const group = groups[matchingKey];
                group.totalQuantity += item.quantity;
                group.batches.push(item);
                if (!group.displayNames.includes(item.name)) {
                    group.displayNames.push(item.name);
                }
                if (item.sellPrice < group.minPrice) group.minPrice = item.sellPrice;
                if (item.sellPrice > group.maxPrice) group.maxPrice = item.sellPrice;
                if (!group.currencies.includes(item.sellCurrency)) {
                    group.currencies.push(item.sellCurrency);
                }
            } else {
                const normalizedKey = normalizeName(item.name);
                groups[normalizedKey] = {
                    name: item.name,
                    displayNames: [item.name],
                    totalQuantity: item.quantity,
                    batches: [item],
                    minPrice: item.sellPrice,
                    maxPrice: item.sellPrice,
                    currencies: [item.sellCurrency]
                };
            }
        });

        return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
    }, [items]);

    const selectedGroup = useMemo(() => {
        return groupedItems.find(g =>
            areNamesSimilar(g.name, selectedGroupName) ||
            g.displayNames.some(dn => areNamesSimilar(dn, selectedGroupName))
        );
    }, [selectedGroupName, groupedItems]);

    // Handle Item Selection - Pre-fill defaults
    const handleItemSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const name = e.target.value;
        setSelectedGroupName(name);

        const group = groupedItems.find(g =>
            areNamesSimilar(g.name, name) ||
            g.displayNames.some(dn => areNamesSimilar(dn, name))
        );

        if (group) {
            // Use average price or first available price
            const avgPrice = group.batches.reduce((sum, b) => sum + b.sellPrice, 0) / group.batches.length;
            setPriceInput(avgPrice.toString());
            setCurrencyInput(group.currencies[0] || 'CUP');
        } else {
            setPriceInput('');
        }
    };

    const addToCart = () => {
        if (!selectedGroup) return;

        const qty = parseFloat(qtyInput);
        const price = parseFloat(priceInput);

        // Validation: Quantity
        if (qty <= 0) return;
        if (qty > selectedGroup.totalQuantity) {
            alert(t('error_stock', { qty: selectedGroup.totalQuantity }));
            return;
        }

        // Validation: Price
        if (!price || price <= 0) {
            alert("Price must be greater than 0.");
            return;
        }

        // Validation: Currency Consistency
        if (cart.length > 0 && currencyInput !== saleCurrency) {
            alert(`Currency mismatch! Current order is in ${saleCurrency}. You cannot add items in ${currencyInput} to this order.`);
            return;
        }

        // Initialize Sale Currency if cart is empty
        if (cart.length === 0) {
            setSaleCurrency(currencyInput);
        }

        // FIFO: Sort batches by date (oldest first)
        const sortedBatches = [...selectedGroup.batches]
            .filter(b => b.quantity > 0)
            .sort((a, b) => new Date(a.dateAdded || a.purchaseDate).getTime() - new Date(b.dateAdded || b.purchaseDate).getTime());

        let remainingQty = qty;
        const itemsToAdd: SaleItem[] = [];

        for (const batch of sortedBatches) {
            if (remainingQty <= 0) break;
            const qtyFromBatch = Math.min(remainingQty, batch.quantity);
            itemsToAdd.push({
                itemId: batch.id,
                name: batch.name,
                quantity: qtyFromBatch,
                pricePerUnit: price,
                subtotal: qtyFromBatch * price
            });
            remainingQty -= qtyFromBatch;
        }

        // Add to cart
        setCart(prevCart => {
            const newCart = [...prevCart];
            itemsToAdd.forEach(newItem => {
                const existingIndex = newCart.findIndex(c => c.itemId === newItem.itemId && c.pricePerUnit === newItem.pricePerUnit);
                if (existingIndex >= 0) {
                    newCart[existingIndex] = {
                        ...newCart[existingIndex],
                        quantity: newCart[existingIndex].quantity + newItem.quantity,
                        subtotal: newCart[existingIndex].subtotal + newItem.subtotal
                    };
                } else {
                    newCart.push(newItem);
                }
            });
            return newCart;
        });

        // Reset Inputs
        setSelectedGroupName('');
        setQtyInput('1');
        setPriceInput('');
    };

    const removeFromCart = (itemId: string) => {
        setCart(cart.filter(i => i.itemId !== itemId));
    };

    const cartTotal = useMemo(() => cart.reduce((acc, item) => acc + item.subtotal, 0), [cart]);

    const handleCheckout = () => {
        if (cart.length === 0) return;
        if (!address) {
            alert(t('error_address'));
            return;
        }

        addSale({
            items: cart,
            transportCost: parseFloat(transportCost) || 0,
            transportCurrency: transportCurrency,
            address,
            customerPhone,
            totalAmount: cartTotal,
            currency: saleCurrency,
            dateSold: saleDate
        });

        // Reset Form
        setCart([]);
        setAddress('');
        setCustomerPhone('');
        setTransportCost('0');
        alert(t('sale_success'));
    };

    return (
        <div className="p-8 h-full flex flex-col lg:flex-row gap-8">
            {/* Left Column: POS Interface */}
            <div className="flex-1 space-y-6">
                <h2 className="text-3xl font-bold text-slate-800">{t('sales_title')}</h2>

                {/* Item Selection Panel */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 animate-fade-in-up">
                    <h3 className="text-lg font-semibold mb-4 text-slate-700">{t('add_items_order')}</h3>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        {/* 1. Item Selector */}
                        <div className="md:col-span-5">
                            <label className="block text-xs font-medium text-slate-500 mb-1">{t('select_item_label')}</label>
                            <select
                                value={selectedGroupName}
                                onChange={handleItemSelect}
                                className="w-full border rounded-lg p-2.5 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">{t('choose_item_placeholder')}</option>
                                {groupedItems.map(group => (
                                    <option key={group.name} value={group.name}>
                                        {group.name} | Stock: {group.totalQuantity} | {group.minPrice !== group.maxPrice
                                            ? `${group.minPrice}-${group.maxPrice}`
                                            : group.minPrice} {group.currencies.join('/')}
                                        {group.displayNames.length > 1 && ` (${group.displayNames.length} ${t('variants')})`}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* 2. Quantity */}
                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-slate-500 mb-1">{t('qty_label')}</label>
                            <input
                                type="number"
                                min="0.1"
                                step="any"
                                value={qtyInput}
                                onChange={e => setQtyInput(e.target.value)}
                                className="w-full border rounded-lg p-2.5 text-center focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        {/* 3. Price Override */}
                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-slate-500 mb-1">{t('unit_price')}</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={priceInput}
                                disabled={!selectedGroupName}
                                onChange={e => setPriceInput(e.target.value)}
                                className="w-full border rounded-lg p-2.5 text-center bg-white disabled:bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        {/* 4. Currency Override */}
                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-slate-500 mb-1">{t('currency_label')}</label>
                            <select
                                value={currencyInput}
                                disabled={!selectedGroupName}
                                onChange={e => setCurrencyInput(e.target.value)}
                                className="w-full border rounded-lg p-2.5 bg-white disabled:bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        {/* 5. Add Button */}
                        <div className="md:col-span-1">
                            <button
                                onClick={addToCart}
                                disabled={!selectedGroupName}
                                className="w-full bg-blue-600 text-white p-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center shadow-lg shadow-blue-200"
                            >
                                <Plus size={24} />
                            </button>
                        </div>
                    </div>

                    {/* Contextual Help */}
                    {selectedGroupName && selectedGroup && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                            <AlertCircle size={14} />
                            <span>
                                {selectedGroup.batches.length > 1
                                    ? `${selectedGroup.batches.length} ${t('batches')} available. `
                                    : ''}
                                Price and currency can be modified for this sale only.
                            </span>
                        </div>
                    )}
                </div>

                {/* Cart View */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex-1 flex flex-col min-h-[300px]">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                            <ShoppingCart size={18} /> {t('current_order')}
                        </h3>
                        <span className="text-sm text-slate-500">{t('items_count', { count: cart.length })}</span>
                    </div>
                    <div className="p-4 flex-1 overflow-y-auto">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                <ShoppingCart size={48} className="mb-2" />
                                <p>{t('cart_empty')}</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {cart.map(item => (
                                    <div key={item.itemId} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                                        <div>
                                            <div className="font-medium text-slate-900">{item.name}</div>
                                            <div className="text-xs text-slate-500 flex items-center gap-1">
                                                <span className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-700">{item.quantity}</span>
                                                <span>x</span>
                                                <span className="font-medium">{item.pricePerUnit}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="font-bold text-slate-700">{item.subtotal.toFixed(2)}</span>
                                            <button onClick={() => removeFromCart(item.itemId)} className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded">
                                                <Trash size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="p-4 border-t border-slate-100 bg-slate-50">
                        <div className="flex justify-between items-center text-lg font-bold text-slate-800">
                            <span>{t('total')}</span>
                            <span>{cartTotal.toFixed(2)} {saleCurrency}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Checkout Form */}
            <div className="w-full lg:w-96 flex flex-col gap-6">

                <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <CheckCircle size={20} className="text-emerald-500" /> {t('checkout')}
                    </h3>

                    <div className="space-y-4">
                        {/* Date */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">{t('date_sale')}</label>
                            <div className="relative">
                                <Calendar size={16} className="absolute left-3 top-3 text-slate-400" />
                                <input
                                    type="date"
                                    value={saleDate}
                                    onChange={e => setSaleDate(e.target.value)}
                                    className="w-full pl-10 border rounded-lg p-2.5 text-sm outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>

                        {/* Phone */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">{t('customer_phone')}</label>
                            <div className="relative">
                                <Phone size={16} className="absolute left-3 top-3 text-slate-400" />
                                <input
                                    type="tel"
                                    value={customerPhone}
                                    onChange={e => setCustomerPhone(e.target.value)}
                                    className="w-full pl-10 border rounded-lg p-2.5 text-sm outline-none focus:border-blue-500"
                                    placeholder="+53 5xxx xxxx"
                                />
                            </div>
                        </div>

                        {/* Address */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">{t('delivery_address')}</label>
                            <textarea
                                value={address}
                                onChange={e => setAddress(e.target.value)}
                                className="w-full border rounded-lg p-2.5 h-16 text-sm resize-none outline-none focus:border-blue-500"
                                placeholder={t('address_placeholder')}
                            ></textarea>
                        </div>

                        {/* Transport */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">{t('transport_fee')}</label>
                                <input
                                    type="number"
                                    value={transportCost}
                                    onChange={e => setTransportCost(e.target.value)}
                                    className="w-full border rounded-lg p-2.5 text-sm outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">{t('currency_label')}</label>
                                <select
                                    value={transportCurrency}
                                    onChange={e => setTransportCurrency(e.target.value)}
                                    className="w-full border rounded-lg p-2.5 text-sm outline-none focus:border-blue-500"
                                >
                                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 mt-2">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-slate-600 font-medium">{t('total')}</span>
                                <span className="text-xl font-bold text-slate-900">{cartTotal.toFixed(2)} {saleCurrency}</span>
                            </div>
                            <button
                                onClick={handleCheckout}
                                disabled={cart.length === 0}
                                className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-200 flex justify-center items-center gap-2"
                            >
                                <CheckCircle size={20} />
                                {t('complete_sale')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};