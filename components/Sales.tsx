import React, { useState, useMemo } from 'react';
import { Item, SaleItem, Product, Participant } from '../types';
import { ShoppingCart, Plus, Trash2, Package, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { CURRENCIES } from '../constants';

interface SalesProps {
    items: Item[];
    products: Product[];
    participants: Participant[];
    addSale: (sale: Omit<import('../types').Sale, 'id'>) => void;
}

interface GroupedItem {
    productId: string;
    productName: string;
    totalQuantity: number;
    batches: Item[];
    minPrice: number;
    maxPrice: number;
    currencies: string[];
    avgPrice: number;
}

export const Sales: React.FC<SalesProps> = ({ items, products, participants, addSale }) => {
    const { t } = useLanguage();

    // Cart state
    const [cart, setCart] = useState<SaleItem[]>([]);
    const [saleCurrency, setSaleCurrency] = useState<string>('USD');
    const [address, setAddress] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [transportCost, setTransportCost] = useState(0);
    const [transportCurrency, setTransportCurrency] = useState<string>('USD');
    const [transportPaidByParticipantId, setTransportPaidByParticipantId] = useState<string>('');
    const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
    const [customPrice, setCustomPrice] = useState<string>('');
    const [qtyInput, setQtyInput] = useState<string>('');

    // Group items by productId (exact match)
    const groupedItems = useMemo(() => {
        const groups: Record<string, GroupedItem> = {};

        items.forEach(item => {
            if (item.quantity <= 0) return;

            const productId = item.productId || 'unknown';
            const product = products.find(p => p.id === productId);
            const productName = product?.name || t('unknown');

            if (!groups[productId]) {
                groups[productId] = {
                    productId,
                    productName,
                    totalQuantity: 0,
                    batches: [],
                    minPrice: item.sellPrice,
                    maxPrice: item.sellPrice,
                    currencies: [item.sellCurrency],
                    avgPrice: 0
                };
            }

            const group = groups[productId];
            group.totalQuantity += item.quantity;
            group.batches.push(item);

            if (item.sellPrice < group.minPrice) {
                group.minPrice = item.sellPrice;
            }
            if (item.sellPrice > group.maxPrice) {
                group.maxPrice = item.sellPrice;
            }

            if (!group.currencies.includes(item.sellCurrency)) {
                group.currencies.push(item.sellCurrency);
            }
        });

        // Calculate average price
        Object.values(groups).forEach(group => {
            const totalValue = group.batches.reduce((sum, batch) => sum + (batch.sellPrice * batch.quantity), 0);
            group.avgPrice = group.totalQuantity > 0 ? totalValue / group.totalQuantity : 0;
        });

        return Object.values(groups).sort((a, b) => a.productName.localeCompare(b.productName));
    }, [items, products, t]);

    const toggleGroup = (productId: string) => {
        const newExpanded = new Set(expandedGroups);
        if (newExpanded.has(productId)) {
            newExpanded.delete(productId);
        } else {
            newExpanded.add(productId);
        }
        setExpandedGroups(newExpanded);
    };

    const addToCart = (productId: string, quantity: number, pricePerUnit: number, currency: string) => {
        const group = groupedItems.find(g => g.productId === productId);
        if (!group) return;

        let remainingQty = quantity;
        const itemsToAdd: SaleItem[] = [];

        const sortedBatches = [...group.batches]
            .filter(b => b.quantity > 0)
            .sort((a, b) => new Date(a.dateAdded || a.purchaseDate).getTime() - new Date(b.dateAdded || b.purchaseDate).getTime());

        for (const batch of sortedBatches) {
            if (remainingQty <= 0) break;

            const qtyFromBatch = Math.min(remainingQty, batch.quantity);

            itemsToAdd.push({
                itemId: batch.id,
                quantity: qtyFromBatch,
                pricePerUnit: pricePerUnit,
                subtotal: qtyFromBatch * pricePerUnit
            });

            remainingQty -= qtyFromBatch;
        }

        if (itemsToAdd.length === 0) return;

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

        setQtyInput('');
        setCustomPrice('');
        setSelectedBatch(null);
    };

    const removeFromCart = (itemId: string) => {
        setCart(prevCart => prevCart.filter(item => item.itemId !== itemId));
    };

    const cartTotal = useMemo(() => {
        return cart.reduce((sum, item) => sum + item.subtotal, 0);
    }, [cart]);

    const handleCompleteSale = () => {
        if (cart.length === 0) return;
        if (transportCost > 0 && !transportPaidByParticipantId) {
            alert(t('alert_transport_payer_required'));
            return;
        }

        const productIds = new Set<string>();
        cart.forEach(ci => {
            const inv = items.find(i => i.id === ci.itemId);
            if (inv?.productId) productIds.add(inv.productId);
        });
        const saleProducts = [...productIds]
            .map(id => products.find(p => p.id === id))
            .filter((p): p is Product => Boolean(p));

        addSale({
            dateSold: saleDate,
            items: cart,
            products: saleProducts,
            totalAmount: cartTotal,
            currency: saleCurrency,
            address,
            customerPhone,
            transportCost,
            transportCurrency,
            transportPaidByParticipantId:
                transportCost > 0 ? transportPaidByParticipantId : undefined
        });

        setCart([]);
        setAddress('');
        setCustomerPhone('');
        setTransportCost(0);
        setTransportPaidByParticipantId('');
        setSaleDate(new Date().toISOString().split('T')[0]);
    };

    const totalItemsInCart = cart.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">{t('sales_title')}</h2>
                    <p className="text-slate-500 mt-1">{t('add_items_order')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Product Selection */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-200">
                        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                            <Package size={18} />
                            {t('select_item_label')}
                        </h3>
                    </div>

                    <div className="max-h-[500px] overflow-y-auto">
                        {groupedItems.length > 0 ? (
                            <div className="divide-y divide-slate-100">
                                {groupedItems.map(group => (
                                    <div key={group.productId} className="group">
                                        {/* Group Header */}
                                        <div
                                            className="p-4 hover:bg-slate-50 cursor-pointer flex items-center justify-between"
                                            onClick={() => toggleGroup(group.productId)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                                    <Layers size={18} />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-800">{group.productName}</p>
                                                    <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                                                        <span>{group.totalQuantity} {t('units')}</span>
                                                        {group.batches.length > 1 && (
                                                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">
                                                                {group.batches.length} {t('batches')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="text-right">
                                                    <p className="font-semibold text-slate-800">
                                                        {group.minPrice !== group.maxPrice
                                                            ? `${group.minPrice.toLocaleString()} - ${group.maxPrice.toLocaleString()}`
                                                            : group.minPrice.toLocaleString()}
                                                    </p>
                                                    <p className="text-xs text-slate-500">{group.currencies.join(', ')}</p>
                                                </div>
                                                {expandedGroups.has(group.productId) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                            </div>
                                        </div>

                                        {/* Expanded Batches */}
                                        {expandedGroups.has(group.productId) && (
                                            <div className="bg-slate-50 p-3 space-y-2">
                                                {group.batches.map(batch => (
                                                    <div
                                                        key={batch.id}
                                                        className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between"
                                                    >
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-medium text-slate-700">{batch.quantity} {t('units')}</span>
                                                                <span className="text-xs text-slate-400">•</span>
                                                                <span className="text-sm text-slate-600">@ {batch.sellPrice.toLocaleString()} {batch.sellCurrency}</span>
                                                            </div>
                                                            <div className="text-xs text-slate-400 mt-1">
                                                                {batch.dateAdded || batch.purchaseDate}
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedBatch(batch.id);
                                                                setCustomPrice(batch.sellPrice.toString());
                                                                setQtyInput('1');
                                                            }}
                                                            className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                                                        >
                                                            <Plus size={16} />
                                                        </button>
                                                    </div>
                                                ))}

                                                {/* Quick Add Section */}
                                                {selectedBatch && group.batches.some(b => b.id === selectedBatch) && (
                                                    <div className="bg-white p-3 rounded-lg border border-blue-200 mt-3">
                                                        <p className="text-sm font-medium text-slate-700 mb-2">{t('add_to_cart')}</p>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                max={group.totalQuantity}
                                                                value={qtyInput}
                                                                onChange={(e) => setQtyInput(e.target.value)}
                                                                className="w-20 border rounded-lg px-2 py-1 text-sm"
                                                                placeholder={t('qty_label')}
                                                            />
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                value={customPrice}
                                                                onChange={(e) => setCustomPrice(e.target.value)}
                                                                className="flex-1 border rounded-lg px-2 py-1 text-sm"
                                                                placeholder={t('unit_price')}
                                                            />
                                                            <select
                                                                value={saleCurrency}
                                                                onChange={(e) => setSaleCurrency(e.target.value)}
                                                                className="border rounded-lg px-2 py-1 text-sm bg-white"
                                                            >
                                                                {CURRENCIES.map(c => (
                                                                    <option key={c} value={c}>{c}</option>
                                                                ))}
                                                            </select>
                                                            <button
                                                                onClick={() => {
                                                                    const qty = parseInt(qtyInput) || 0;
                                                                    const price = parseFloat(customPrice) || 0;
                                                                    if (qty > 0 && price > 0) {
                                                                        addToCart(group.productId, qty, price, saleCurrency);
                                                                    }
                                                                }}
                                                                className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700"
                                                            >
                                                                {t('add_btn')}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-12 text-center text-slate-400">
                                <Package size={48} className="mx-auto mb-4 opacity-30" />
                                <p>{t('inventory_empty')}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Cart & Checkout */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                            <ShoppingCart size={18} />
                            {t('current_order')}
                        </h3>
                        <span className="text-sm text-slate-500">
                            {totalItemsInCart} {t('items_count').replace('{count}', totalItemsInCart.toString())}
                        </span>
                    </div>

                    <div className="p-4 space-y-3 max-h-[250px] overflow-y-auto">
                        {cart.length > 0 ? (
                            cart.map(cartItem => {
                                // Find item and product name
                                const item = items.find(i => i.id === cartItem.itemId);
                                const product = item ? products.find(p => p.id === item.productId) : null;
                                const productName = product?.name || t('unknown');
                                return (
                                    <div key={cartItem.itemId} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                        <div>
                                            <p className="font-medium text-slate-800">{productName}</p>
                                            <p className="text-sm text-slate-500">
                                                {cartItem.quantity} × {cartItem.pricePerUnit.toLocaleString()} = {cartItem.subtotal.toLocaleString()} {saleCurrency}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => removeFromCart(cartItem.itemId)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-center text-slate-400 py-8">{t('cart_empty')}</p>
                        )}
                    </div>

                    {/* Sale Details */}
                    <div className="p-4 border-t border-slate-200 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">{t('date_sale')}</label>
                                <input
                                    type="date"
                                    value={saleDate}
                                    onChange={(e) => setSaleDate(e.target.value)}
                                    className="w-full border rounded-lg px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">{t('currency_label')}</label>
                                <select
                                    value={saleCurrency}
                                    onChange={(e) => setSaleCurrency(e.target.value)}
                                    className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                                >
                                    {CURRENCIES.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">{t('customer_phone')}</label>
                            <input
                                type="text"
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                                className="w-full border rounded-lg px-3 py-2 text-sm"
                                placeholder="+53 5xxx xxxx"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">{t('delivery_address')}</label>
                            <input
                                type="text"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                className="w-full border rounded-lg px-3 py-2 text-sm"
                                placeholder={t('address_placeholder')}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">{t('transport_fee')}</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={transportCost}
                                    onChange={(e) => {
                                        const v = parseFloat(e.target.value) || 0;
                                        setTransportCost(v);
                                        if (v <= 0) setTransportPaidByParticipantId('');
                                    }}
                                    className="w-full border rounded-lg px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">{t('currency_label')}</label>
                                <select
                                    value={transportCurrency}
                                    onChange={(e) => setTransportCurrency(e.target.value)}
                                    className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                                >
                                    {CURRENCIES.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {transportCost > 0 && (
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">
                                    {t('transport_paid_by_partner')}
                                </label>
                                <select
                                    value={transportPaidByParticipantId}
                                    onChange={(e) => setTransportPaidByParticipantId(e.target.value)}
                                    className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                                >
                                    <option value="">{t('select_participant')}</option>
                                    {participants.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-slate-400 mt-1">{t('transport_payer_hint')}</p>
                            </div>
                        )}
                    </div>

                    {/* Total & Checkout */}
                    <div className="p-4 bg-slate-50 border-t border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-lg font-semibold text-slate-700">{t('total')}</span>
                            <span className="text-2xl font-bold text-slate-900">
                                {cartTotal.toLocaleString()} {saleCurrency}
                            </span>
                        </div>

                        <button
                            onClick={handleCompleteSale}
                            disabled={
                                cart.length === 0 ||
                                (transportCost > 0 && !transportPaidByParticipantId)
                            }
                            className="w-full py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {t('complete_sale')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};