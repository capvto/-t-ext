import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import en from "./en.json";
import it from "./it.json";

export type Lang = "it" | "en";

type Dict = Record<string, any>;

const DICTS: Record<Lang, Dict> = { it, en };
const STORAGE_KEY = "text:lang";

function getDefaultLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "it" || saved === "en") return saved;
  } catch {
    // ignore
  }

  return "en";
}

function getPath(obj: Dict, key: string): unknown {
  const parts = key.split(".").filter(Boolean);
  let cur: any = obj;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in cur) cur = cur[p];
    else return undefined;
  }
  return cur;
}

function interpolate(str: string, vars?: Record<string, string | number>): string {
  if (!vars) return str;
  return str.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k: string) => {
    const v = vars[k];
    return v == null ? "" : String(v);
  });
}

export type I18nValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => getDefaultLang());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore
    }
    // Update the document language (useful for screen readers)
    try {
      document.documentElement.lang = lang;
    } catch {
      // ignore
    }
  }, [lang]);

  const dict = DICTS[lang];

  const value = useMemo<I18nValue>(() => {
    const t = (key: string, vars?: Record<string, string | number>) => {
      const raw = getPath(dict, key);
      const fallback = getPath(DICTS.en, key);
      const s = (typeof raw === "string" ? raw : typeof fallback === "string" ? fallback : key);
      return interpolate(s, vars);
    };

    return { lang, setLang, t };
  }, [dict, lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

// Convenience: display a localized title without changing what is stored.
export function displayDocTitle(title: string | null | undefined, t: I18nValue["t"]) {
  const v = (title || "").trim();
  if (!v) return t("doc.untitled");
  // Keep storage-compatible defaults, but render localized.
  if (v === "Untitled") return t("doc.untitled");
  return v;
}
