import React, { useState } from 'react';
import { Item, Participant } from '../types';
import { CURRENCIES } from '../constants';
import { Plus, Package, Calendar, Pencil, X, Trash2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface InventoryProps {
  items: Item[];
  participants: Participant[];
  addItem: (item: Omit<Item, 'id'>) => void;
  editItem: (id: string, item: Omit<Item, 'id'>) => void;
  deleteItem: (id: string) => void;
}

const emptyFormData = {
  name: '',
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

export const Inventory: React.FC<InventoryProps> = ({ items, participants, addItem, editItem, deleteItem }) => {
  const { t } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  // Form State
  const [formData, setFormData] = useState(emptyFormData);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData(emptyFormData);
    setEditingItem(null);
    setShowForm(false);
  };

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
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
    if (confirm(`${t('confirm_delete_item')}\n\n${item.name}`)) {
      deleteItem(item.id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.buyerId) {
      alert(t('select_buyer_alert'));
      return;
    }

    const itemData = {
      name: formData.name,
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
    };

    if (editingItem) {
      editItem(editingItem.id, itemData);
    } else {
      addItem(itemData);
    }

    resetForm();
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

            {/* Row 1: Basic Info */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('item_name')}</label>
              <input required name="name" value={formData.name} onChange={handleInputChange} className="w-full border rounded-md p-2" placeholder="e.g. iPhone 15" />
            </div>
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

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">{t('table_item')}</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">{t('table_stock')}</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">{t('table_prices')}</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">{t('table_invested')}</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">{t('date_added')}</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length > 0 ? items.map(item => {
                const buyerName = participants.find(p => p.id === item.buyerId)?.name || t('unknown');
                return (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 bg-blue-50 rounded-lg flex items-center justify-center text-blue-500 mr-4">
                          <Package size={20} />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{item.name}</div>
                          <div className="text-xs text-slate-500">{item.id.slice(0, 8)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900">{item.quantity} {item.unit}</div>
                      {item.initialQuantity !== item.quantity && (
                        <div className="text-xs text-slate-400">Initial: {item.initialQuantity}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm flex flex-col gap-1">
                        <span className="text-red-600 font-medium">B: {item.buyPrice} {item.buyCurrency}</span>
                        <span className="text-emerald-600 font-medium">S: {item.sellPrice} {item.sellCurrency}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {buyerName}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {item.dateAdded}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title={t('edit')}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title={t('delete')}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">{t('inventory_empty')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};