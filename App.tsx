import React, { useState, useEffect, useRef } from 'react';
import { Globe, Loader2 } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Statistics } from './components/Statistics';
import { Balance } from './components/Balance';
import { Participants } from './components/Participants';
import { Inventory } from './components/Inventory';
import { Sales } from './components/Sales';
import { SalesHistory } from './components/SalesHistory';
import { ExchangeRates } from './components/ExchangeRates';
import { AIAnalyst } from './components/AIAnalyst';
import { TabType, TABS } from './constants';
import { StoreData, Participant, Item, Sale, ConversionRates, Adjustment } from './types';
import { LanguageProvider, Language } from './contexts/LanguageContext';
import { jsonStorage } from './src/utils/jsonStorage';
import { translations } from './translations';

const electron = (window as any).electron;

const INITIAL_DATA: StoreData = {
  participants: [],
  items: [],
  sales: [],
  rates: { USD: 320, EUR: 335 },
  adjustments: [],
  language: 'es'
};

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
        setStoreData({
          ...INITIAL_DATA,
          ...loadedData,
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
    setStoreData(prev => ({ ...prev, participants: prev.participants.filter(p => p.id !== id) }));
  };

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
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={48} className="animate-spin text-blue-600" />
          <p className="text-slate-500 font-medium">Loading Workspace...</p>
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
      case TABS.INVENTORY: return <Inventory items={storeData.items} participants={storeData.participants} addItem={addItem} editItem={editItem} deleteItem={deleteItem} />;
      case TABS.SALES: return <Sales items={storeData.items} addSale={addSale} />;
      case TABS.SALES_HISTORY: return <SalesHistory sales={storeData.sales || []} items={storeData.items} editSale={editSale} deleteSale={deleteSale} />;
      case TABS.EXCHANGE: return <ExchangeRates rates={storeData.rates} onUpdate={updateRates} />;
      case TABS.AI_INSIGHTS: return <AIAnalyst data={storeData} />;
      default: return <Dashboard data={storeData} />;
    }
  };

  return (
    <LanguageProvider language={storeData.language} onLanguageChange={setLanguage} translations={translations}>
      <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden relative">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onWipeData={wipeAllData}
          onLoadData={openFile}
          onSaveData={saveFile}
          onSaveAs={saveFileAs}
          currentFileName={currentFilePath && electron ? electron.path.basename(currentFilePath) : getAlertMsg('unsaved_workspace')}
        />

        <main className="flex-1 overflow-y-auto relative">
          {/* Floating Language Button */}
          <div className="fixed top-6 right-8 z-[100]">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-xl border-2 border-slate-200 hover:border-blue-500 hover:text-blue-600 hover:scale-105 transition-all text-slate-700 font-bold text-sm cursor-pointer"
            >
              <Globe size={18} className="text-blue-600" />
              <span>{storeData.language === 'en' ? 'EN' : 'ES'}</span>
            </button>
          </div>

          {renderContent()}
        </main>
      </div>
    </LanguageProvider>
  );
};

const App: React.FC = () => <AppContent />;
export default App;