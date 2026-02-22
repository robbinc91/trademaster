export interface Participant {
  id: string;
  name: string;
  joinedAt: string;
}

export interface Item {
  id: string,
  name: string;
  unit: string;
  buyPrice: number;
  buyCurrency: string; // This is the Buy Currency
  sellPrice: number;
  sellCurrency: string; // New: Explicit Sell Currency
  quantity: number; 
  initialQuantity: number;
  buyerId: string;
  transportCost: number;
  transportCurrency: string;
  dateAdded: string; // System timestamp
  purchaseDate: string;
}

export interface SaleItem {
  itemId: string;
  name: string;
  quantity: number;
  pricePerUnit: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  items: SaleItem[];
  transportCost: number;
  transportCurrency: string;
  address: string;
  customerPhone: string; // NEW: Customer phone number
  totalAmount: number;
  currency: string;
  dateSold: string;
}

export interface ConversionRates {
  USD: number; // Rate relative to CUP (e.g. 1 USD = x CUP)
  EUR: number; // Rate relative to CUP (e.g. 1 EUR = y CUP)
}

export type CurrencyTotal = Record<string, number>;


export interface Adjustment {
  id: string;
  date: string;
  fromParticipantId: string;
  toParticipantId: string;
  amount: number;
  currency: string;
  note?: string;
}

export interface StoreData {
  participants: Participant[];
  items: Item[];
  sales: Sale[];
  rates: ConversionRates;
  adjustments: Adjustment[];
  language: 'en' | 'es';
}
