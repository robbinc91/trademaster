import React from 'react';
import { 
  LayoutDashboard, Users, Package, ShoppingCart, 
  BrainCircuit, History, RefreshCw, Trash2, 
  FolderOpen, Save, FilePlus, ChartBar, ChartBarStacked 
} from 'lucide-react';
import { TabType, TABS } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onWipeData: () => void;
  onLoadData: () => void;
  onSaveData: () => void;
  onSaveAs: () => void;
  currentFileName: string | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, setActiveTab, onWipeData, 
  onLoadData, onSaveData, onSaveAs, currentFileName 
}) => {
  const { t } = useLanguage();

  const navItems = [
    { id: TABS.DASHBOARD, label: t('dashboard'), icon: LayoutDashboard },
    { id: TABS.STATISTICS, label: t('statistics'), icon: ChartBar },
    { id: TABS.BALANCE, label: t('tab_balance'), icon: ChartBarStacked },
    { id: TABS.PARTICIPANTS, label: t('participants'), icon: Users },
    { id: TABS.INVENTORY, label: t('inventory'), icon: Package },
    { id: TABS.SALES, label: t('sales'), icon: ShoppingCart },
    { id: TABS.SALES_HISTORY, label: t('sales_history'), icon: History },
    { id: TABS.EXCHANGE, label: t('exchange_rates'), icon: RefreshCw },
    { id: TABS.AI_INSIGHTS, label: t('ai_analyst'), icon: BrainCircuit },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen shadow-xl">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-2xl font-bold text-white tracking-tight">TradeMaster <span className="text-blue-500">Pro</span></h1>
        <div className="mt-2 text-xs text-blue-400 font-mono truncate" title={currentFileName || ''}>
           {currentFileName}
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as TabType)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 space-y-2">
         <div className="grid grid-cols-3 gap-2 mb-2">
            <button onClick={onLoadData} className="flex flex-col items-center justify-center p-2 bg-slate-800 rounded hover:bg-slate-700 text-xs text-blue-400" title={t('open_file')}>
                <FolderOpen size={16} className="mb-1"/> {t('open_file')}
            </button>
            <button onClick={onSaveData} className="flex flex-col items-center justify-center p-2 bg-slate-800 rounded hover:bg-slate-700 text-xs text-emerald-400" title={t('save_file')}>
                <Save size={16} className="mb-1"/> {t('save_file')}
            </button>
             <button onClick={onSaveAs} className="flex flex-col items-center justify-center p-2 bg-slate-800 rounded hover:bg-slate-700 text-xs text-purple-400" title={t('new_file')}>
                <FilePlus size={16} className="mb-1"/> {t('new_file')}
            </button>
         </div>
        
        <button 
            onClick={onWipeData}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg border border-red-900/50 text-red-500 hover:bg-red-900/30 hover:text-red-400 transition-colors text-sm font-medium"
        >
            <Trash2 size={16} />
            <span>{t('wipe_workspace')}</span>
        </button>
      </div>
    </aside>
  );
};