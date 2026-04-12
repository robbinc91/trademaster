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
  /** When set, sale delivery transport is counted as that partner's spending (Statistics / Balance). */
  transportPaidByParticipantId?: string;
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

/** One line in a partner self-take (stock removed from a purchase batch). */
export interface SelfTakeLine {
  itemId: string;
  quantity: number;
}

/** Partners remove stock from inventory without a customer sale (FIFO across batches). */
export interface SelfTake {
  id: string;
  date: string;
  participantId: string;
  lines: SelfTakeLine[];
  note?: string;
}

export type AddSelfTakeInput = {
  productId: string;
  quantity: number;
  participantId: string;
  date: string;
  note?: string;
};

export interface StoreData {
  participants: Participant[];
  products: Product[];  // New: Product catalog
  items: Item[];
  sales: Sale[];
  selfTakes: SelfTake[];
  rates: ConversionRates;
  adjustments: Adjustment[];
  language: 'en' | 'es';
}
