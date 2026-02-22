import { GoogleGenAI } from "@google/genai";
import { StoreData } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found. Please set process.env.API_KEY.");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeStoreData = async (data: StoreData, userQuery: string, language: string = 'en'): Promise<string> => {
  const ai = getClient();
  
  // Prepare a summarized context to avoid token limits if data is huge, 
  // but for this app size, sending full JSON is usually fine.
  const context = JSON.stringify({
    participants: data.participants,
    inventorySummary: data.items.map(i => ({ 
      name: i.name, 
      stock: i.quantity, 
      buy: `${i.buyPrice} ${i.currency}`, 
      sell: `${i.sellPrice} ${i.currency}` 
    })),
    salesSummary: data.sales.map(s => ({
      date: s.dateSold,
      total: `${s.totalAmount} ${s.currency}`,
      items: s.items.length
    }))
  });

  const prompt = `
    You are an expert Business Intelligence Analyst for a retail store.
    Here is the current store data in JSON format:
    ${context}

    User Query: "${userQuery}"

    Please provide a concise, professional, and data-driven answer. 
    If the user asks for calculations not directly visible, perform them based on the provided data.
    IMPORTANT: Reply in ${language === 'es' ? 'Spanish' : 'English'}.
    Format the response with Markdown for readability (lists, bold text, etc.).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "No insights generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I'm sorry, I encountered an error while analyzing your data. Please try again later.";
  }
};