import { BarChart3, Users, Package, ShoppingCart, History, Globe, Bot, PieChart, Scale, Tags, FileText } from 'lucide-react';

export const TABS = {
  DASHBOARD: 'dashboard',
  STATISTICS: 'statistics',
  BALANCE: 'balance',
  PARTICIPANTS: 'participants',
  PRODUCTS: 'products',
  INVENTORY: 'inventory',
  SALES: 'sales',
  SALES_HISTORY: 'sales_history',
  EXCHANGE: 'exchange',
  REPORTS: 'reports',
  AI_INSIGHTS: 'ai_insights'
} as const;

export type TabType = typeof TABS[keyof typeof TABS];

export const TAB_CONFIG: { id: TabType; icon: any; labelKey: string }[] = [
  { id: TABS.DASHBOARD, icon: BarChart3, labelKey: 'tab_dashboard' },
  { id: TABS.STATISTICS, icon: PieChart, labelKey: 'tab_statistics' },
  { id: TABS.BALANCE, icon: Scale, labelKey: 'tab_balance' },
  { id: TABS.PARTICIPANTS, icon: Users, labelKey: 'tab_participants' },
  { id: TABS.PRODUCTS, icon: Tags, labelKey: 'tab_products' },
  { id: TABS.INVENTORY, icon: Package, labelKey: 'tab_inventory' },
  { id: TABS.SALES, icon: ShoppingCart, labelKey: 'tab_sales' },
  { id: TABS.SALES_HISTORY, icon: History, labelKey: 'tab_sales_history' },
  { id: TABS.EXCHANGE, icon: Globe, labelKey: 'tab_exchange' },
  { id: TABS.REPORTS, icon: FileText, labelKey: 'tab_reports' },
  { id: TABS.AI_INSIGHTS, icon: Bot, labelKey: 'tab_ai_insights' }
];

export const CURRENCIES = ['USD', 'EUR', 'CUP', 'MLC'] as const;
