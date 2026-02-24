export interface Participant {
  id: string;
  name: string;
  joinedAt: string;
}

export interface Product {
  id: string;
  name: string;
  createdAt: string;
}

export interface Item {
  id: string,
  productId: string;  // Reference to Product.id
  unit: string;
  buyPrice: number;
  buyCurrency: string;
  sellPrice: number;
  sellCurrency: string;
  quantity: number;
  initialQuantity: number;
  buyerId: string;
  transportCost: number;
  transportCurrency: string;
  dateAdded: string;
  purchaseDate: string;
}

export interface SaleItem {
  itemId: string;
  quantity: number;
  pricePerUnit: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  items: SaleItem[];
  products: Product[];
  transportCost: number;
  transportCurrency: string;
  address: string;
  customerPhone: string;
  totalAmount: number;
  currency: string;
  dateSold: string;
}

export interface ConversionRates {
  USD: number;
  EUR: number;
}

export type CurrencyTotal = Record<string, number>;

// Adjustment types for partner balance
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
  products: Product[];  // New: Product catalog
  items: Item[];
  sales: Sale[];
  rates: ConversionRates;
  adjustments: Adjustment[];
  language: 'en' | 'es';
}
