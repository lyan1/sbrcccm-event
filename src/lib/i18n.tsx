"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { translations, type Language } from "./translations";

const STORAGE_KEY = "pickleball_language";

type I18nContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations.zh) => string;
  tNested: (key: string) => string;
};

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("zh");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
    if (stored === "zh" || stored === "en") {
      setLanguageState(stored);
    }
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }, []);

  const t = useCallback(
    (key: keyof typeof translations.zh): string => {
      const val = translations[language][key];
      if (typeof val === "string") return val;
      return key;
    },
    [language]
  );

  const tNested = useCallback(
    (key: string): string => {
      const parts = key.split(".");
      let val: unknown = translations[language];
      for (const part of parts) {
        if (val && typeof val === "object" && part in val) {
          val = (val as Record<string, unknown>)[part];
        } else {
          return key;
        }
      }
      return typeof val === "string" ? val : key;
    },
    [language]
  );

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, tNested }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export function LanguageSwitcher() {
  const { language, setLanguage } = useI18n();
  return (
    <div className="flex gap-1 rounded-lg border p-1">
      <button
        type="button"
        onClick={() => setLanguage("zh")}
        className={`rounded px-3 py-1 text-sm ${language === "zh" ? "bg-primary text-primary-foreground" : ""}`}
      >
        中文
      </button>
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={`rounded px-3 py-1 text-sm ${language === "en" ? "bg-primary text-primary-foreground" : ""}`}
      >
        EN
      </button>
    </div>
  );
}
