import { GoogleGenAI } from "@google/genai";
import { StoreData } from '../types';

function getApiKey(): string {
  return (
    (typeof process !== 'undefined' && process.env?.API_KEY) ||
    (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
    ''
  ).trim();
}

function getModelId(): string {
  const m =
    (typeof process !== 'undefined' && process.env?.GEMINI_MODEL) || '';
  return m.trim() || 'gemini-2.0-flash';
}

const getClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('MISSING_API_KEY');
  }
  return new GoogleGenAI({ apiKey });
};

function nameMap<T extends { id: string; name: string }>(rows: T[]): Record<string, string> {
  const m: Record<string, string> = {};
  for (const r of rows) m[r.id] = r.name;
  return m;
}

function summarizeItem(
  i: Item,
  productNames: Record<string, string>,
  participantNames: Record<string, string>
) {
  return {
    id: i.id,
    productId: i.productId,
    productName: productNames[i.productId] || 'Unknown product',
    unit: i.unit,
    quantity: i.quantity,
    initialQuantity: i.initialQuantity,
    buyPrice: i.buyPrice,
    buyCurrency: i.buyCurrency,
    sellPrice: i.sellPrice,
    sellCurrency: i.sellCurrency,
    transportCost: i.transportCost,
    transportCurrency: i.transportCurrency,
    buyerName: participantNames[i.buyerId] || 'Unknown',
    buyerId: i.buyerId,
    dateAdded: i.dateAdded,
    purchaseDate: i.purchaseDate,
  };
}

function summarizeSale(s: Sale, productNames: Record<string, string>) {
  const lineDetails = s.items.map((li) => ({
    itemId: li.itemId,
    quantity: li.quantity,
    pricePerUnit: li.pricePerUnit,
    subtotal: li.subtotal,
  }));
  return {
    id: s.id,
    dateSold: s.dateSold,
    currency: s.currency,
    totalAmount: s.totalAmount,
    transportCost: s.transportCost,
    transportCurrency: s.transportCurrency,
    address: s.address,
    customerPhone: s.customerPhone,
    lineItems: lineDetails,
    productNamesInSale: (s.products || []).map((p) => ({ id: p.id, name: p.name })),
  };
}

function summarizeSelfTake(
  st: SelfTake,
  participantNames: Record<string, string>,
  items: Item[],
  productNames: Record<string, string>
) {
  const lines = st.lines.map((l) => {
    const item = items.find((x) => x.id === l.itemId);
    return {
      itemId: l.itemId,
      quantity: l.quantity,
      productId: item?.productId,
      productName: item ? productNames[item.productId] : undefined,
    };
  });
  return {
    id: st.id,
    date: st.date,
    participantId: st.participantId,
    participantName: participantNames[st.participantId] || 'Unknown',
    note: st.note,
    lines,
  };
}

function summarizeAdjustment(a: Adjustment, participantNames: Record<string, string>) {
  return {
    id: a.id,
    date: a.date,
    amount: a.amount,
    currency: a.currency,
    note: a.note,
    fromParticipant: participantNames[a.fromParticipantId] || a.fromParticipantId,
    toParticipant: participantNames[a.toParticipantId] || a.toParticipantId,
  };
}

/** Build a structured snapshot for the model (correct field names, partner-facing labels). */
export function buildStoreContextPayload(data: StoreData) {
  const productNames = nameMap(data.products || []);
  const participantNames = nameMap(data.participants || []);

  const items = (data.items || []).map((i) => summarizeItem(i, productNames, participantNames));

  const sales = (data.sales || []).map((s) => summarizeSale(s, productNames));

  const selfTakes = (data.selfTakes || []).map((st) =>
    summarizeSelfTake(st, participantNames, data.items || [], productNames)
  );

  const adjustments = (data.adjustments || []).map((a) => summarizeAdjustment(a, participantNames));

  const revenueByCurrency: Record<string, number> = {};
  for (const s of data.sales || []) {
    const c = s.currency || 'UNK';
    revenueByCurrency[c] = (revenueByCurrency[c] || 0) + (s.totalAmount || 0);
  }

  const purchaseTransportByCurrency: Record<string, number> = {};
  for (const i of data.items || []) {
    const c = i.transportCurrency || 'UNK';
    purchaseTransportByCurrency[c] =
      (purchaseTransportByCurrency[c] || 0) + (i.transportCost || 0);
  }

  const saleTransportByCurrency: Record<string, number> = {};
  for (const s of data.sales || []) {
    const c = s.transportCurrency || 'UNK';
    saleTransportByCurrency[c] = (saleTransportByCurrency[c] || 0) + (s.transportCost || 0);
  }

  const stockUnitsByProduct: Record<string, number> = {};
  for (const i of data.items || []) {
    const pid = i.productId;
    stockUnitsByProduct[pid] = (stockUnitsByProduct[pid] || 0) + (i.quantity || 0);
  }

  return {
    exchangeRates: data.rates,
    participants: (data.participants || []).map((p) => ({
      id: p.id,
      name: p.name,
      joinedAt: p.joinedAt,
    })),
    products: (data.products || []).map((p) => ({ id: p.id, name: p.name, createdAt: p.createdAt })),
    inventoryItems: items,
    sales,
    selfTakes,
    adjustments,
    aggregates: {
      revenueByCurrency,
      purchaseTransportByCurrency,
      saleTransportByCurrency,
      stockUnitsByProduct,
      totalSalesCount: (data.sales || []).length,
      totalInventoryBatches: (data.items || []).length,
    },
    hints: {
      fifo:
        'Self-takes remove stock from oldest purchase batches first (same as Point of Sale allocation).',
      currencies: 'Amounts are stored in their native currencies; compare across currencies using exchangeRates when needed.',
    },
  };
}

export const analyzeStoreData = async (
  data: StoreData,
  userQuery: string,
  language: string = 'en'
): Promise<string> => {
  const payload = buildStoreContextPayload(data);
  const context = JSON.stringify(payload);

  const prompt = `
You are an expert Business Intelligence analyst for a multi-partner retail / import business.

Data conventions:
- **participants** are partners who invest and buy inventory; **buyerId** on an inventory batch is which partner paid for that purchase.
- **inventoryItems** are purchase batches (FIFO). **productName** groups items; **quantity** is remaining stock in that batch.
- **sales** are customer sales; **lineItems** reference **itemId** (batch). **totalAmount** and **currency** are the sale totals.
- **selfTakes** are partners taking stock for personal use (not a sale), allocated FIFO across batches.
- **adjustments** are internal transfers between partners to balance capital.
- **aggregates** are precomputed sums to speed up answers; verify with raw rows when something looks inconsistent.

Store snapshot (JSON):
${context}

User question:
"${userQuery}"

Instructions:
- Answer using ONLY the provided data. If something is missing, say what is missing instead of guessing.
- When comparing money across currencies, mention rates from **exchangeRates** or say that conversion is needed.
- Be concise and professional. Use Markdown (headings, bullet lists, **bold** for key numbers).
- Reply in ${language === 'es' ? 'Spanish' : 'English'}.
`;

  try {
    const ai = getClient();
    const model = getModelId();
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text || 'No insights generated.';
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'MISSING_API_KEY') {
      return 'MISSING_API_KEY';
    }
    console.error('Gemini API Error:', error);
    const msg =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message)
        : String(error);
    return `API_ERROR:${msg}`;
  }
};
