import React, { useState } from 'react';
import { Product } from '../types';
import { Plus, Tags, Trash2, X, Search, Edit, Check } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface ProductsProps {
    products: Product[];
    addProduct: (name: string) => void;
    editProduct: (id: string, name: string) => void;
    deleteProduct: (id: string) => void;
}

export const Products: React.FC<ProductsProps> = ({ products, addProduct, editProduct, deleteProduct }) => {
    const { t } = useLanguage();
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [newProductName, setNewProductName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const handleAddProduct = (e: React.FormEvent) => {
        e.preventDefault();
        if (newProductName.trim()) {
            addProduct(newProductName.trim());
            setNewProductName('');
            setShowForm(false);
        }
    };

    const handleEdit = (product: Product) => {
        setEditingId(product.id);
        setEditName(product.name);
    };

    const handleSaveEdit = (id: string) => {
        if (editName.trim()) {
            editProduct(id, editName.trim());
            setEditingId(null);
            setEditName('');
        }
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditName('');
    };

    const handleDelete = (product: Product) => {
        if (confirm(`${t('confirm_delete_product')}\n\n${product.name}`)) {
            deleteProduct(product.id);
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">{t('products_title')}</h2>
                    <p className="text-slate-500 mt-1">{t('products_subtitle')}</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                    {showForm ? <X size={18} /> : <Plus size={18} />}
                    {showForm ? t('cancel') : t('add_product')}
                </button>
            </div>

            {showForm && (
                <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-100 animate-slide-in-down">
                    <h3 className="text-lg font-semibold mb-4 text-slate-800">{t('new_product')}</h3>
                    <form onSubmit={handleAddProduct} className="flex gap-3">
                        <input
                            type="text"
                            value={newProductName}
                            onChange={(e) => setNewProductName(e.target.value)}
                            placeholder={t('product_name_placeholder')}
                            className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                        />
                        <button
                            type="submit"
                            className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors"
                        >
                            {t('add_btn')}
                        </button>
                    </form>
                </div>
            )}

            {/* Search */}
            <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={t('search_products')}
                    className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Products Grid */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                {filteredProducts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                        {filteredProducts.map(product => (
                            <div
                                key={product.id}
                                className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:border-blue-300 transition-colors"
                            >
                                {editingId === product.id ? (
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="w-full border rounded-lg px-3 py-2 text-sm"
                                            autoFocus
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleSaveEdit(product.id)}
                                                className="flex-1 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1"
                                            >
                                                <Check size={14} />
                                                {t('save_changes')}
                                            </button>
                                            <button
                                                onClick={handleCancelEdit}
                                                className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-sm hover:bg-slate-300 transition-colors"
                                            >
                                                {t('cancel')}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                                    <Tags size={18} />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-800">{product.name}</p>
                                                    <p className="text-xs text-slate-400">{product.id.slice(0, 8)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleEdit(product)}
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title={t('edit')}
                                                >
                                                    <Edit size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(product)}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title={t('delete')}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="mt-3 text-xs text-slate-500">
                                            {t('created')}: {new Date(product.createdAt).toLocaleDateString()}
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-12 text-center text-slate-400">
                        <Tags size={48} className="mx-auto mb-4 opacity-30" />
                        <p>{searchTerm ? t('no_products_found') : t('no_products')}</p>
                    </div>
                )}
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between text-sm text-slate-500">
                <span>{t('total_products')}: {products.length}</span>
            </div>
        </div>
    );
};