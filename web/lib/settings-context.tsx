"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { translations, type Language, type TranslationKey } from "./translations";
import { getLanguageFromPathname, toBcp47, toLocalizedPath } from "./i18n";

type Theme = "dark" | "light";

function readPreference(key: string): string | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writePreference(key: string, value: string) {
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(key, value);
  } catch {
    // Private browsing can deny storage; the in-memory React state still works.
  }
}

interface SettingsContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

/**
 * Provides theme (dark/light) and language (de/en/...) settings to the app.
 *
 * Wraps the entire app in layout.tsx. Persists preferences to localStorage.
 * Default: dark theme. Initial language comes from the URL-derived `initialLanguage`
 * prop (passed by the server layout via the x-lang header), NOT from a hard-coded
 * 'de' default. Previously the strict default caused /en to SSR German content
 * until JS mounted, which search engines indexed as duplicate/wrong-language.
 *
 * @example
 * // In layout.tsx (already configured)
 * <SettingsProvider initialLanguage={rawLang}>
 *   {children}
 * </SettingsProvider>
 */
export function SettingsProvider({
  children,
  initialLanguage = "de",
}: {
  children: ReactNode;
  initialLanguage?: Language;
}) {
  const pathname = usePathname();
  const [theme, setThemeState] = useState<Theme>("dark");
  const [language, setLanguageState] = useState<Language>(initialLanguage);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = readPreference("theme") as Theme | null;
    const savedLanguage = readPreference("language") as Language | null;

    if (savedTheme) {
      setThemeState(savedTheme);
    }
    // Apply saved language ONLY when the URL does not already specify one.
    // URL-based language always wins to prevent /en flickering back to a
    // stored 'de' preference before the pathname effect corrects it.
    const urlLang = getLanguageFromPathname(window.location.pathname);
    if (savedLanguage && !urlLang) {
      setLanguageState(savedLanguage);
    }
  }, []);

  useEffect(() => {
    const pathLanguage = getLanguageFromPathname(pathname || "");
    if (pathLanguage && pathLanguage !== language) {
      setLanguageState(pathLanguage);
    }
  }, [pathname, language]);

  useEffect(() => {
    if (!mounted) return;

    // Apply theme to document
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    writePreference("theme", theme);
  }, [theme, mounted]);

  useEffect(() => {
    if (!mounted) return;
    writePreference("language", language);
    document.documentElement.lang = toBcp47(language);
  }, [language, mounted]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", newTheme === "dark");
      writePreference("theme", newTheme);
    }
  };

  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);

    const currentPath = pathname || "/";
    const isLocalizablePath =
      currentPath === "/" ||
      /^\/(de|en|zh|fr|es|pt|ja|ko)$/.test(currentPath) ||
      currentPath.startsWith("/week/") ||
      /^\/(de|en|zh|fr|es|pt|ja|ko)\/week\//.test(currentPath);

    if (!isLocalizablePath) return;

    const targetPath = toLocalizedPath(currentPath, newLanguage);
    const queryString = typeof window !== "undefined"
      ? window.location.search.replace(/^\?/, "")
      : "";
    const nextUrl = queryString ? `${targetPath}?${queryString}` : targetPath;
    const currentUrl = queryString ? `${currentPath}?${queryString}` : currentPath;

    if (nextUrl !== currentUrl && typeof window !== "undefined") {
      // Update the URL without handing the interaction to a router transition.
      // The content is client-rendered and reacts to `language` immediately;
      // replacing the URL keeps refreshes and copied links localized as well.
      window.history.replaceState(window.history.state, "", nextUrl);
      document.documentElement.lang = toBcp47(newLanguage);
    }
  };

  const t = (key: TranslationKey): string => {
    return translations[language][key] || key;
  };

  return (
    <SettingsContext.Provider value={{ theme, setTheme, language, setLanguage, t }}>
      {children}
    </SettingsContext.Provider>
  );
}

/**
 * Access theme, language, and translation function from any component.
 *
 * @returns {SettingsContextType} Settings context with theme, language, and t() function
 * @throws Error if used outside SettingsProvider
 *
 * @example
 * const { language, t } = useSettings();
 * return <h1>{t("aiTechProgress")}</h1>; // Returns German or English string
 *
 * @example
 * const { theme, setTheme } = useSettings();
 * <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
 *   Toggle theme
 * </button>
 */
export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
