import React, { createContext, useContext, useState, useEffect } from 'react';
import en from '../translations/en.json';
import fr from '../translations/fr.json';
import tn from '../translations/tn.json';

export type Language = 'en' | 'fr' | 'tn';

const translations = {
  en,
  fr,
  tn,
};

// Helper to get nested value by dot notation string
const getNestedValue = (obj: any, path: string): string => {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj) || path;
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  dir: 'ltr' | 'rtl';
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date | string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language') as Language | null;
    return saved || 'en';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
    document.documentElement.dir = 'ltr'; 
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    const value = getNestedValue(translations[language], key);
    if (!value || value === key) {
        if (language !== 'en') {
             // Fallback to English
             return getNestedValue(translations['en'], key) || key;
        }
    }
    return value;
  };

  const dir: 'ltr' | 'rtl' = 'ltr'; 

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat(language === 'fr' ? 'fr-TN' : 'en-TN', {
      style: 'decimal',
      minimumFractionDigits: 3, 
      maximumFractionDigits: 3,
    }).format(amount) + ' TND';
  };

  const formatDate = (date: Date | string): string => {
    return new Date(date).toLocaleDateString(language === 'tn' ? 'fr-TN' : language, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir, formatCurrency, formatDate }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
