// src/contexts/LanguageContext.tsx
import React, { createContext, useContext } from 'react';

// Define the shape of the dictionary
type TranslationDictionary = Record<string, Record<string, string>>;
export type Language = 'en' | 'es';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: React.ReactNode;
  language: string;
  translations: TranslationDictionary; // <--- NEW PROP
  onLanguageChange: (lang: Language) => void;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ 
  children, 
  language, 
  translations, // Receive dictionary here
  onLanguageChange 
}) => {
  
  // Robustly determine the current language.
  const currentLang: Language = (language === 'es' || language === 'en') ? language : 'es';

  const t = (key: string, params?: Record<string, string | number>) => {
    // 1. Get the dictionary for current language
    const dict = translations[currentLang];
    
    // 2. Lookup key. Fallback: Current -> English -> Key Name
    // @ts-ignore
    let text = dict?.[key] || translations['en']?.[key] || key;
    
    // 3. Interpolate parameters
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language: currentLang, setLanguage: onLanguageChange, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
};