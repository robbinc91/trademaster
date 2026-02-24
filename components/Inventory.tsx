import React, { useState, useMemo } from 'react';
import { Item, Participant, Product } from '../types';
import { CURRENCIES } from '../constants';
import { Plus, Package, Calendar, Pencil, X, Trash2, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface InventoryProps {
  items: Item[];
  participants: Participant[];
  products: Product[];
  addProduct: (name: string) => string;
  addItem: (item: Omit<Item, 'id'>) => void;
  editItem: (id: string, item: Omit<Item, 'id'>) => void;
  deleteItem: (id: string) => void;
}

const emptyFormData = {
  productId: '',
  newProductName: '',
  unit: 'pcs',
  buyPrice: '',
  buyCurrency: 'USD',
  sellPrice: '',
  sellCurrency: 'CUP',
  quantity: '',
  buyerId: '',
  transportCost: '',
  transportCurrency: 'USD',
  dateAdded: new Date().toISOString().split('T')[0]
};

export const Inventory: React.FC<InventoryProps> = ({ items, participants, products, addProduct, addItem, editItem, deleteItem }) => {
  const { t } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Form State
  const [formData, setFormData] = useState(emptyFormData);
  const [showNewProductInput, setShowNewProductInput] = useState(false);

  // Group items by productId
  const groupedItems = useMemo(() => {
    const groups: Record<string, { product: Product | null; items: Item[] }> = {};

    items.forEach(item => {
      const productId = item.productId || 'unknown';
      if (!groups[productId]) {
        groups[productId] = {
          product: products.find(p => p.id === productId) || null,
          items: []
        };
      }
      groups[productId].items.push(item);
    });

    return Object.entries(groups).map(([productId, data]) => ({
      productId,
      productName: data.product?.name || t('unknown'),
      product: data.product,
      items: data.items,
      totalQuantity: data.items.reduce((sum, item) => sum + item.quantity, 0)
    })).sort((a, b) => a.productName.localeCompare(b.productName));
  }, [items, products, t]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Handle product selection
    if (name === 'productId') {
      if (value === '__new__') {
        setShowNewProductInput(true);
        setFormData(prev => ({ ...prev, productId: '', newProductName: '' }));
      } else {
        setShowNewProductInput(false);
        setFormData(prev => ({ ...prev, productId: value }));
      }
    }
  };

  const resetForm = () => {
    setFormData(emptyFormData);
    setEditingItem(null);
    setShowForm(false);
    setShowNewProductInput(false);
  };

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    setFormData({
      productId: item.productId || '',
      newProductName: '',
      unit: item.unit,
      buyPrice: item.buyPrice.toString(),
      buyCurrency: item.buyCurrency,
      sellPrice: item.sellPrice.toString(),
      sellCurrency: item.sellCurrency,
      quantity: item.quantity.toString(),
      buyerId: item.buyerId,
      transportCost: item.transportCost.toString(),
      transportCurrency: item.transportCurrency,
      dateAdded: item.dateAdded || new Date().toISOString().split('T')[0]
    });
    setShowForm(true);
  };

  const handleDelete = (item: Item) => {
    const product = products.find(p => p.id === item.productId);
    const itemName = product?.name || t('unknown');
    if (confirm(`${t('confirm_delete_item')}\n\n${itemName}`)) {
      deleteItem(item.id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.buyerId) {
      alert(t('select_buyer_alert'));
      return;
    }

    let productId = formData.productId;

    // If creating a new product
    if (showNewProductInput && formData.newProductName.trim()) {
      // Check if product with same name already exists (case insensitive)
      const existingProduct = products.find(p => p.name.toLowerCase() === formData.newProductName.trim().toLowerCase());
      if (existingProduct) {
        productId = existingProduct.id;
      } else {
        // Create new product and get the ID
        productId = addProduct(formData.newProductName.trim());
      }
    }

    if (!productId) {
      alert(t('select_product'));
      return;
    }

    const itemData = {
      productId: productId,
      unit: formData.unit,
      buyPrice: parseFloat(formData.buyPrice),
      buyCurrency: formData.buyCurrency,
      sellPrice: parseFloat(formData.sellPrice),
      sellCurrency: formData.sellCurrency,
      quantity: parseFloat(formData.quantity),
      initialQuantity: editingItem ? editingItem.initialQuantity : parseFloat(formData.quantity),
      buyerId: formData.buyerId,
      transportCost: parseFloat(formData.transportCost) || 0,
      transportCurrency: formData.transportCurrency,
      dateAdded: formData.dateAdded,
      purchaseDate: formData.dateAdded,
    };

    if (editingItem) {
      editItem(editingItem.id, itemData);
    } else {
      addItem(itemData);
    }

    resetForm();
  };

  const toggleGroup = (productId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedGroups(newExpanded);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">{t('inventory_purchases')}</h2>
          <p className="text-slate-500 mt-1">{t('register_stock')}</p>
        </div>
        <button
          onClick={() => {
            if (showForm) {
              resetForm();
            } else {
              setShowForm(true);
            }
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
          {showForm ? t('cancel') : t('new_purchase')}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-100 animate-slide-in-down">
          <h3 className="text-lg font-semibold mb-4 text-slate-800">
            {editingItem ? t('edit_item_title') : t('register_purchase_title')}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* Row 1: Product Selection */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('select_product')}</label>
              <select
                required
                name="productId"
                value={formData.productId}
                onChange={handleInputChange}
                className="w-full border rounded-md p-2 bg-slate-50"
                disabled={showNewProductInput}
              >
                <option value="">{t('choose_product_placeholder')}</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                <option value="__new__">+ {t('create_product')}</option>
              </select>
            </div>

            {showNewProductInput && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('new_product')}</label>
                <div className="flex gap-2">
                  <input
                    required
                    name="newProductName"
                    value={formData.newProductName}
                    onChange={handleInputChange}
                    className="flex-1 border rounded-md p-2"
                    placeholder={t('product_name_placeholder')}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewProductInput(false);
                      setFormData(prev => ({ ...prev, productId: '' }));
                    }}
                    className="px-3 py-2 text-slate-500 hover:text-slate-700"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('measurement_unit')}</label>
              <input required name="unit" value={formData.unit} onChange={handleInputChange} className="w-full border rounded-md p-2" placeholder="pcs" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('quantity')}</label>
              <input required type="number" min="0" step="any" name="quantity" value={formData.quantity} onChange={handleInputChange} className="w-full border rounded-md p-2" />
            </div>

            {/* Row 2: Buy Prices & Currency */}
            <div className="flex gap-2 col-span-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('buy_price')}</label>
                <input required type="number" min="0" step="0.01" name="buyPrice" value={formData.buyPrice} onChange={handleInputChange} className="w-full border rounded-md p-2" placeholder="0.00" />
              </div>
              <div className="w-24">
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('currency')}</label>
                <select name="buyCurrency" value={formData.buyCurrency} onChange={handleInputChange} className="w-full border rounded-md p-2 bg-slate-50">
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Row 3: Sell Prices & Currency */}
            <div className="flex gap-2 col-span-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('sell_price')}</label>
                <input required type="number" min="0" step="0.01" name="sellPrice" value={formData.sellPrice} onChange={handleInputChange} className="w-full border rounded-md p-2" placeholder="0.00" />
              </div>
              <div className="w-24">
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('currency')}</label>
                <select name="sellCurrency" value={formData.sellCurrency} onChange={handleInputChange} className="w-full border rounded-md p-2 bg-slate-50">
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Row 4: Logistics & Buyer */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('transport_cost')}</label>
              <input type="number" min="0" step="0.01" name="transportCost" value={formData.transportCost} onChange={handleInputChange} className="w-full border rounded-md p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Trans. Currency</label>
              <select name="transportCurrency" value={formData.transportCurrency} onChange={handleInputChange} className="w-full border rounded-md p-2">
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('buyer')}</label>
              <select required name="buyerId" value={formData.buyerId} onChange={handleInputChange} className="w-full border rounded-md p-2 bg-slate-50">
                <option value="">{t('select_participant')}</option>
                {participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            {/* Row 5: Date */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('date_purchase')}</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="date"
                  name="dateAdded"
                  value={formData.dateAdded}
                  onChange={handleInputChange}
                  className="w-full border rounded-md pl-10 p-2"
                />
              </div>
            </div>

            <div className="col-span-full mt-4 flex justify-end gap-3">
              {editingItem && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-slate-200 text-slate-700 px-6 py-2 rounded-lg font-medium hover:bg-slate-300 transition-colors"
                >
                  {t('cancel')}
                </button>
              )}
              <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors">
                {editingItem ? t('save_changes') : t('register_item_btn')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grouped List */}
      <div className="space-y-4">
        {groupedItems.length > 0 ? (
          groupedItems.map(group => (
            <div key={group.productId} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              {/* Group Header */}
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => toggleGroup(group.productId)}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Layers size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{group.productName}</p>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span>{group.totalQuantity} {t('units')}</span>
                      <span className="px-1.5 py-0.5 bg-slate-100 rounded text-xs">
                        {group.items.length} {group.items.length === 1 ? 'batch' : t('batches')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm text-slate-500">{t('table_stock')}</p>
                    <p className="font-semibold text-slate-800">{group.totalQuantity}</p>
                  </div>
                  {expandedGroups.has(group.productId) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </div>

              {/* Expanded Items */}
              {expandedGroups.has(group.productId) && (
                <div className="border-t border-slate-100 divide-y divide-slate-50">
                  {group.items.map(item => {
                    const buyerName = participants.find(p => p.id === item.buyerId)?.name || t('unknown');
                    return (
                      <div key={item.id} className="p-4 hover:bg-slate-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-slate-100 text-slate-500 rounded-lg">
                              <Package size={16} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-700">{item.quantity} {item.unit}</span>
                                <span className="text-xs text-slate-400">•</span>
                                <span className="text-sm text-slate-600">{item.dateAdded}</span>
                              </div>
                              <div className="text-sm flex gap-3 mt-1">
                                <span className="text-red-600">B: {item.buyPrice} {item.buyCurrency}</span>
                                <span className="text-emerald-600">S: {item.sellPrice} {item.sellCurrency}</span>
                              </div>
                              <div className="text-xs text-slate-500 mt-1">{buyerName}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
                              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title={t('edit')}
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title={t('delete')}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center text-slate-400">
            <Package size={48} className="mx-auto mb-4 opacity-30" />
            <p>{t('inventory_empty')}</p>
          </div>
        )}
      </div>
    </div>
  );
};