import React, { useState, useEffect, useRef } from 'react';
import { Globe, Loader2, Moon, Sun, Keyboard, X } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Statistics } from './components/Statistics';
import { Balance } from './components/Balance';
import { Participants } from './components/Participants';
import { Products } from './components/Products';
import { Inventory } from './components/Inventory';
import { Sales } from './components/Sales';
import { SalesHistory } from './components/SalesHistory';
import { ExchangeRates } from './components/ExchangeRates';
import { AIAnalyst } from './components/AIAnalyst';
import { TabType, TABS, TAB_CONFIG } from './constants';
import { StoreData, Participant, Product, Item, Sale, ConversionRates, Adjustment, SelfTake, SelfTakeLine, AddSelfTakeInput } from './types';
import { LanguageProvider, Language, useLanguage } from './contexts/LanguageContext';
import { jsonStorage } from './src/utils/jsonStorage';
import { translations } from './translations';
import { Reports } from './components/Reports';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

const electron = (window as any).electron;

/** Order matches sidebar & TAB_CONFIG for Alt+1 … Alt+0, Alt+-. */
const SHORTCUT_TAB_LABEL_KEYS = [
  'dashboard',
  'statistics',
  'tab_balance',
  'participants',
  'products',
  'inventory',
  'sales',
  'sales_history',
  'exchange_rates',
  'reports',
  'ai_analyst',
] as const;

const MainWorkspace: React.FC<{
  setActiveTab: (t: TabType) => void;
  toggleLanguage: () => void;
  langLabel: string;
  children: React.ReactNode;
}> = ({ setActiveTab, toggleLanguage, langLabel, children }) => {
  const { t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useEffect(() => {
    const tabKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        if (e.key === 'Escape') setShortcutsOpen(false);
        return;
      }
      if (e.key === 'Escape') {
        setShortcutsOpen(false);
        return;
      }
      if (e.ctrlKey && !e.altKey && !e.metaKey && e.key === '/') {
        e.preventDefault();
        setShortcutsOpen((o) => !o);
        return;
      }
      if (e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey && (e.key === 'T' || e.key === 't')) {
        e.preventDefault();
        toggleTheme();
        return;
      }
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        if (e.code === 'Minus' || e.key === '-') {
          e.preventDefault();
          const last = TAB_CONFIG[10];
          if (last) setActiveTab(last.id);
          return;
        }
        const idx = tabKeys.indexOf(e.key);
        if (idx >= 0 && idx < TAB_CONFIG.length) {
          e.preventDefault();
          setActiveTab(TAB_CONFIG[idx].id);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setActiveTab, toggleTheme]);

  return (
    <main className="flex-1 overflow-y-auto relative">
      <div className="fixed top-6 right-8 z-[100] flex flex-col gap-2 items-end">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShortcutsOpen(true)}
            className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-xl border-2 border-slate-200 hover:border-purple-500 hover:text-purple-600 transition-all text-slate-700 font-bold text-sm cursor-pointer"
            title={t('shortcut_help_title')}
            aria-label={t('shortcut_help_title')}
          >
            <Keyboard size={18} className="text-purple-600" />
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-xl border-2 border-slate-200 hover:border-amber-500 transition-all text-slate-700 font-bold text-sm cursor-pointer"
            title={t('theme_toggle')}
            aria-label={t('theme_toggle')}
          >
            {theme === 'dark' ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} className="text-slate-600" />}
          </button>
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-xl border-2 border-slate-200 hover:border-blue-500 hover:text-blue-600 hover:scale-105 transition-all text-slate-700 font-bold text-sm cursor-pointer"
          >
            <Globe size={18} className="text-blue-600" />
            <span>{langLabel}</span>
          </button>
        </div>
      </div>
      {children}
      {shortcutsOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="shortcuts-modal-title"
          onClick={() => setShortcutsOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 overflow-y-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <h2 id="shortcuts-modal-title" className="text-lg font-bold text-slate-800">
                {t('shortcuts_title')}
              </h2>
              <button
                type="button"
                onClick={() => setShortcutsOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-600"
                aria-label={t('shortcuts_close')}
              >
                <X size={20} />
              </button>
            </div>
            <ul className="space-y-4 text-sm text-slate-600">
              <li>
                <span className="font-semibold text-slate-800">{t('shortcut_nav_label')}</span>
                <div className="mt-2 space-y-1 text-xs">
                  {SHORTCUT_TAB_LABEL_KEYS.map((key, i) => (
                    <div key={key} className="flex justify-between gap-2">
                      <span>{t(key)}</span>
                      <span className="font-mono text-slate-400 shrink-0">
                        {i === 10 ? 'Alt+-' : i < 9 ? `Alt+${i + 1}` : 'Alt+0'}
                      </span>
                    </div>
                  ))}
                </div>
              </li>
              <li className="flex justify-between gap-2">
                <span>{t('shortcut_theme_label')}</span>
                <span className="font-mono text-xs">Alt+Shift+T</span>
              </li>
              <li className="flex justify-between gap-2">
                <span>{t('shortcut_help_label')}</span>
                <span className="font-mono text-xs">Ctrl+/</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </main>
  );
};

const INITIAL_DATA: StoreData = {
  participants: [],
  products: [],
  items: [],
  sales: [],
  selfTakes: [],
  rates: { USD: 320, EUR: 335 },
  adjustments: [],
  language: 'es'
};

/** Oldest purchase batches first (same convention as Point of Sale). */
function allocateSelfTakeFromProduct(
  items: Item[],
  productId: string,
  quantity: number
): { lines: SelfTakeLine[]; shortfall: number } {
  const batches = [...items]
    .filter(i => i.productId === productId && i.quantity > 0)
    .sort((a, b) => {
      const ta = new Date(a.dateAdded || a.purchaseDate).getTime();
      const tb = new Date(b.dateAdded || b.purchaseDate).getTime();
      return ta - tb;
    });

  let remaining = quantity;
  const lines: SelfTakeLine[] = [];
  for (const batch of batches) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, batch.quantity);
    lines.push({ itemId: batch.id, quantity: take });
    remaining -= take;
  }
  return { lines, shortfall: remaining };
}

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>(TABS.DASHBOARD);
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const [storeData, setStoreData] = useState<StoreData>(INITIAL_DATA);
  const [isLoaded, setIsLoaded] = useState(false);

  const isInitialLoad = useRef(true);

  // --- Auto-Save Effect ---
  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    jsonStorage.autoSave(storeData);
  }, [storeData]);

  // --- Initial File Load ---
  useEffect(() => {
    const initApp = async () => {
      let loadedData: StoreData | null = null;
      let loadedFilePath: string | null = null;

      try {
        const internalsData = await jsonStorage.autoLoad();
        if (internalsData) {
          loadedData = internalsData;
          if (internalsData._lastFilePath && electron?.fs?.existsSync(internalsData._lastFilePath)) {
            loadedFilePath = internalsData._lastFilePath;
          }
        }
      } catch (e) {
        console.error("Auto-load from internals failed", e);
      }

      if (!loadedData) {
        const lastFile = localStorage.getItem('lastOpenFilePath');

        if (lastFile && electron) {
          if (electron.fs.existsSync(lastFile)) {
            try {
              const data = jsonStorage.loadFromFile(lastFile);
              if (data) {
                loadedData = data;
                loadedFilePath = lastFile;
              }
            } catch (e) {
              console.error("Auto-load from last file failed", e);
              localStorage.removeItem('lastOpenFilePath');
            }
          } else {
            localStorage.removeItem('lastOpenFilePath');
          }
        }
      }

      if (loadedData) {
        // Migration: Ensure products array exists
        let migratedProducts = loadedData.products || [];
        let migratedItems = loadedData.items || [];

        // Migration: For items without productId, create products from their names
        if (migratedItems.length > 0) {
          const existingProductNames = new Map<string, string>();
          migratedProducts.forEach(p => {
            existingProductNames.set(p.name.toLowerCase(), p.id);
          });

          const newProducts: Product[] = [];
          const itemsToUpdate: { index: number, productId: string }[] = [];

          migratedItems.forEach((item, index) => {
            if (!item.productId) {
              // Legacy items may have a 'name' field - use it for migration
              const legacyItem = item as any;
              const itemName = legacyItem.name || 'Unknown';
              const itemLowerName = itemName.toLowerCase();
              let productId = existingProductNames.get(itemLowerName);

              if (!productId) {
                // Create new product
                const newProduct: Product = {
                  id: crypto.randomUUID(),
                  name: itemName,
                  createdAt: item.dateAdded || new Date().toISOString()
                };
                newProducts.push(newProduct);
                existingProductNames.set(itemLowerName, newProduct.id);
                productId = newProduct.id;
              }

              itemsToUpdate.push({ index, productId });
            }
          });

          // Add new products
          if (newProducts.length > 0) {
            migratedProducts = [...migratedProducts, ...newProducts];
          }

          // Update items with productId
          if (itemsToUpdate.length > 0) {
            migratedItems = migratedItems.map((item, index) => {
              const update = itemsToUpdate.find(u => u.index === index);
              if (update) {
                // Remove name field if present (now using productId reference)
                const { name, ...rest } = item as any;
                return { ...rest, productId: update.productId };
              }
              return item;
            });
          }
        }

        setStoreData({
          ...INITIAL_DATA,
          ...loadedData,
          products: migratedProducts,
          items: migratedItems,
          selfTakes: loadedData.selfTakes || [],
          rates: loadedData.rates || INITIAL_DATA.rates,
          adjustments: loadedData.adjustments || [],
          language: (loadedData.language === 'es' || loadedData.language === 'en') ? loadedData.language : 'en'
        });
        if (loadedFilePath) {
          setCurrentFilePath(loadedFilePath);
          localStorage.setItem('lastOpenFilePath', loadedFilePath);
        }
      }

      setIsLoaded(true);
    };

    initApp();
  }, []);

  // --- Helper for Alerts ---
  const getAlertMsg = (key: string) => {
    const lang = storeData.language || 'es';
    // @ts-ignore
    return translations[lang]?.[key] || key;
  };

  // --- File Operations ---

  const handleLoadFromFile = (filePath: string) => {
    try {
      const data = jsonStorage.loadFromFile(filePath);
      if (data) {
        setStoreData({
          ...INITIAL_DATA,
          ...data,
          selfTakes: data.selfTakes || [],
          rates: data.rates || INITIAL_DATA.rates,
          adjustments: data.adjustments || [],
          language: (data.language === 'es' || data.language === 'en') ? data.language : 'en'
        });
        setCurrentFilePath(filePath);
        localStorage.setItem('lastOpenFilePath', filePath);
      }
    } catch (error) {
      alert(getAlertMsg('alert_load_error'));
    }
  };

  const openFile = async () => {
    if (!electron) return;
    const filePath = await electron.ipcRenderer.invoke('dialog:openFile');
    if (filePath) handleLoadFromFile(filePath);
  };

  const saveFileAs = async () => {
    if (!electron) return;
    const filePath = await electron.ipcRenderer.invoke('dialog:saveFile');
    if (filePath) {
      try {
        setCurrentFilePath(filePath);
        jsonStorage.saveToFile(filePath, storeData);
        localStorage.setItem('lastOpenFilePath', filePath);
        alert(getAlertMsg('alert_save_success'));
      } catch (e) {
        alert(getAlertMsg('alert_save_error'));
      }
    }
  };

  const saveFile = async () => {
    if (currentFilePath) {
      try {
        jsonStorage.saveToFile(currentFilePath, storeData);
      } catch (e) {
        alert(getAlertMsg('alert_save_error'));
      }
    } else {
      saveFileAs();
    }
  };

  const wipeAllData = () => {
    const lang = storeData.language || 'en';
    // @ts-ignore
    const tDict = translations[lang];
    if (confirm(`${tDict.confirm_reset_title}\n\n${tDict.confirm_reset_body}`)) {
      setStoreData(INITIAL_DATA);
      setCurrentFilePath(null);
      localStorage.removeItem('lastOpenFilePath');
    }
  };

  // --- Language Toggle ---

  const toggleLanguage = () => {
    const current = storeData.language || 'en';
    const newLang = current === 'en' ? 'es' : 'en';
    setStoreData(prev => ({ ...prev, language: newLang }));
  };

  const setLanguage = (lang: Language) => {
    setStoreData(prev => ({ ...prev, language: lang }));
  };

  // --- Data Mutators ---

  const addParticipant = (name: string) => {
    setStoreData(prev => ({ ...prev, participants: [...prev.participants, { id: crypto.randomUUID(), name, joinedAt: new Date().toISOString() }] }));
  };

  const removeParticipant = (id: string) => {
    if (storeData.items.some(i => i.buyerId === id)) {
      alert(getAlertMsg('alert_delete_error'));
      return;
    }
    if (storeData.selfTakes.some(st => st.participantId === id)) {
      alert(getAlertMsg('alert_delete_error_self_take'));
      return;
    }
    setStoreData(prev => ({ ...prev, participants: prev.participants.filter(p => p.id !== id) }));
  };

  // --- Product Management ---

  const addProduct = (name: string): string => {
    const id = crypto.randomUUID();
    setStoreData(prev => ({
      ...prev,
      products: [...prev.products, {
        id,
        name,
        createdAt: new Date().toISOString()
      }]
    }));
    return id;
  };

  const editProduct = (id: string, name: string) => {
    setStoreData(prev => ({
      ...prev,
      products: prev.products.map(p => p.id === id ? { ...p, name } : p)
    }));
  };

  const deleteProduct = (id: string) => {
    // Check if product is used in inventory
    if (storeData.items.some(i => i.productId === id)) {
      alert(getAlertMsg('alert_delete_product_error'));
      return;
    }
    setStoreData(prev => ({ ...prev, products: prev.products.filter(p => p.id !== id) }));
  };

  // --- Item Management ---

  const addItem = (item: Omit<Item, 'id'>) => {
    setStoreData(prev => ({ ...prev, items: [...prev.items, { ...item, id: crypto.randomUUID() }] }));
  };

  const editItem = (id: string, updatedItem: Omit<Item, 'id'>) => {
    setStoreData(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === id ? { ...updatedItem, id } : item
      )
    }));
  };

  const deleteItem = (id: string) => {
    setStoreData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const addSale = (saleData: Omit<Sale, 'id'>) => {
    const newSale = { ...saleData, id: crypto.randomUUID() };
    const updatedItems = storeData.items.map(item => {
      const saleItem = saleData.items.find(si => si.itemId === item.id);
      return saleItem ? { ...item, quantity: item.quantity - saleItem.quantity } : item;
    });
    setStoreData(prev => ({ ...prev, items: updatedItems, sales: [...prev.sales, newSale] }));
  };

  const editSale = (id: string, updatedSale: Omit<Sale, 'id'>) => {
    const originalSale = storeData.sales.find(s => s.id === id);
    if (!originalSale) return;

    const restoredItems = storeData.items.map(item => {
      const originalSaleItem = originalSale.items.find(si => si.itemId === item.id);
      if (originalSaleItem) {
        return { ...item, quantity: item.quantity + originalSaleItem.quantity };
      }
      return item;
    });

    const finalItems = restoredItems.map(item => {
      const saleItem = updatedSale.items.find(si => si.itemId === item.id);
      return saleItem ? { ...item, quantity: item.quantity - saleItem.quantity } : item;
    });

    setStoreData(prev => ({
      ...prev,
      items: finalItems,
      sales: prev.sales.map(sale =>
        sale.id === id ? { ...updatedSale, id } : sale
      )
    }));
  };

  const deleteSale = (id: string) => {
    const sale = storeData.sales.find(s => s.id === id);
    if (!sale) return;

    const restoredItems = storeData.items.map(item => {
      const saleItem = sale.items.find(si => si.itemId === item.id);
      if (saleItem) {
        return { ...item, quantity: item.quantity + saleItem.quantity };
      }
      return item;
    });

    setStoreData(prev => ({
      ...prev,
      items: restoredItems,
      sales: prev.sales.filter(s => s.id !== id)
    }));
  };

  const addSelfTake = (input: AddSelfTakeInput): boolean => {
    const qty = Number(input.quantity);
    if (!input.productId || !input.participantId || !Number.isFinite(qty) || qty <= 0) {
      return false;
    }
    const { lines, shortfall } = allocateSelfTakeFromProduct(storeData.items, input.productId, qty);
    if (shortfall > 0 || lines.length === 0) {
      return false;
    }

    setStoreData(prev => {
      const alloc = allocateSelfTakeFromProduct(prev.items, input.productId, qty);
      if (alloc.shortfall > 0 || alloc.lines.length === 0) {
        return prev;
      }
      const newItems = prev.items.map(item => {
        const line = alloc.lines.find(l => l.itemId === item.id);
        return line ? { ...item, quantity: item.quantity - line.quantity } : item;
      });
      const record: SelfTake = {
        id: crypto.randomUUID(),
        date: input.date,
        participantId: input.participantId,
        lines: alloc.lines,
        note: input.note?.trim() || undefined
      };
      return { ...prev, items: newItems, selfTakes: [...prev.selfTakes, record] };
    });
    return true;
  };

  const deleteSelfTake = (id: string) => {
    if (!storeData.selfTakes.some(s => s.id === id)) return;

    setStoreData(prev => {
      const st = prev.selfTakes.find(s => s.id === id);
      if (!st) return prev;
      const restoredItems = prev.items.map(item => {
        const line = st.lines.find(l => l.itemId === item.id);
        return line ? { ...item, quantity: item.quantity + line.quantity } : item;
      });
      return {
        ...prev,
        items: restoredItems,
        selfTakes: prev.selfTakes.filter(s => s.id !== id)
      };
    });
  };

  const addAdjustment = (adjustment: Omit<Adjustment, 'id'>) => {
    setStoreData(prev => ({
      ...prev,
      adjustments: [...prev.adjustments, { ...adjustment, id: crypto.randomUUID() }]
    }));
  };

  const updateRates = (newRates: ConversionRates) => {
    setStoreData(prev => ({ ...prev, rates: newRates }));
  };

  // --- Render ---

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={48} className="animate-spin text-blue-600 dark:text-blue-400" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">Loading Workspace...</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case TABS.DASHBOARD: return <Dashboard data={storeData} />;
      case TABS.STATISTICS: return <Statistics data={storeData} />;
      case TABS.BALANCE: return <Balance data={storeData} addAdjustment={addAdjustment} />;
      case TABS.PARTICIPANTS: return <Participants participants={storeData.participants} addParticipant={addParticipant} removeParticipant={removeParticipant} />;
      case TABS.PRODUCTS: return <Products products={storeData.products || []} addProduct={addProduct} editProduct={editProduct} deleteProduct={deleteProduct} />;
      case TABS.INVENTORY: return (
        <Inventory
          items={storeData.items}
          participants={storeData.participants}
          products={storeData.products || []}
          selfTakes={storeData.selfTakes || []}
          addProduct={addProduct}
          addItem={addItem}
          editItem={editItem}
          deleteItem={deleteItem}
          addSelfTake={addSelfTake}
          deleteSelfTake={deleteSelfTake}
        />
      );
      case TABS.SALES: return (
        <Sales
          items={storeData.items}
          products={storeData.products || []}
          participants={storeData.participants}
          addSale={addSale}
        />
      );
      case TABS.SALES_HISTORY: return (
        <SalesHistory
          sales={storeData.sales || []}
          products={storeData.products || []}
          items={storeData.items}
          participants={storeData.participants}
          editSale={editSale}
          deleteSale={deleteSale}
        />
      );
      case TABS.EXCHANGE: return <ExchangeRates rates={storeData.rates} onUpdate={updateRates} />;
      case TABS.REPORTS: return <Reports data={storeData} />;
      case TABS.AI_INSIGHTS: return <AIAnalyst data={storeData} />;
      default: return <Dashboard data={storeData} />;
    }
  };

  return (
    <LanguageProvider language={storeData.language} onLanguageChange={setLanguage} translations={translations}>
      <div className="flex h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 overflow-hidden relative">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onWipeData={wipeAllData}
          onLoadData={openFile}
          onSaveData={saveFile}
          onSaveAs={saveFileAs}
          currentFileName={currentFilePath && electron ? electron.path.basename(currentFilePath) : getAlertMsg('unsaved_workspace')}
        />

        <MainWorkspace
          setActiveTab={setActiveTab}
          toggleLanguage={toggleLanguage}
          langLabel={storeData.language === 'en' ? 'EN' : 'ES'}
        >
          {renderContent()}
        </MainWorkspace>
      </div>
    </LanguageProvider>
  );
};

const App: React.FC = () => (
  <ThemeProvider>
    <AppContent />
  </ThemeProvider>
);
export default App;