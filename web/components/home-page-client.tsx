"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { Feed } from "@/components/feed";
import { RightSidebar } from "@/components/right-sidebar";
import { TrendIndex } from "@/components/trend-index";
import { Cpu, TrendingUp, Lightbulb, Search, X, Settings, Sun, Moon, Languages, Check, Loader2, ArrowLeft } from "lucide-react";
import { usePeriodTrends } from "@/hooks/use-period-trends";
import { LANGUAGE_OPTIONS } from "@/lib/translations";
import { cn } from "@/lib/utils";
import { useSettings } from "@/lib/settings-context";
import { API_BASE, USE_API } from "@/lib/api-base";
import type { ForagerItem } from "@/lib/forager-adapter";

interface HomePageClientProps {
  initialWeekId?: string;
  initialItems?: ForagerItem[];
}

export default function HomePageClient({ initialWeekId = "", initialItems = [] }: HomePageClientProps) {
  const [activeTab, setActiveTab] = useState("tech");
  const [selectedWeekId, setSelectedWeekId] = useState(initialWeekId);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showMobileSettings, setShowMobileSettings] = useState(false);

  useEffect(() => {
    const processData = (data: {
      weeks?: {
        id: string;
        current?: boolean;
        days?: { id: string; current?: boolean }[];
      }[];
    }) => {
      const weeks = data.weeks || [];

      if (weeks.length > 0) {
        const currentWeek = weeks.find((w) => w.current) || weeks[0];

        if (currentWeek.days && currentWeek.days.length > 0) {
          const today = currentWeek.days.find((d) => d.current);
          const latest = currentWeek.days[currentWeek.days.length - 1];
          setSelectedWeekId((today || latest).id);
        } else {
          setSelectedWeekId(currentWeek.id);
        }
      }
    };

    // Try API first if configured, fall back to static JSON
    const fetchUrl = USE_API ? `${API_BASE}/weeks` : "/data/weeks.json";

    fetch(fetchUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(processData)
      .catch(() => {
        // If API fails, try static JSON as fallback
        if (USE_API) {
          fetch("/data/weeks.json")
            .then((res) => {
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              return res.json();
            })
            .then(processData)
            .catch(() => {});
        }
      });
  }, []);

  return (
    <div className="min-h-dvh w-full overflow-x-hidden bg-background pb-16 text-foreground md:pb-0">
      <TopControls />
      {/* Paper wash for visual continuity */}
      <div
        className="pointer-events-none fixed top-0 left-0 right-0 z-0 h-32 bg-gradient-to-b from-card/80 to-transparent"
        aria-hidden="true"
      />
      <div className="relative z-[1] mx-auto flex w-full max-w-[1360px]">
        {/* Left Sidebar - Fixed width */}
        <div className="hidden md:flex md:w-20 xl:w-[275px] shrink-0 justify-end">
          <div className="w-full xl:w-[275px]">
            <Sidebar
              activeTab={activeTab}
              onTabChange={setActiveTab}
              selectedWeekId={selectedWeekId}
              onWeekChange={setSelectedWeekId}
            />
          </div>
        </div>

        {/* Main Feed - Flexible center column */}
        <div className="w-full min-w-0 max-w-[680px] flex-1 border-x-2 border-foreground bg-card dark:bg-content-surface">
          <Feed activeTab={activeTab} selectedWeekId={selectedWeekId} onWeekChange={setSelectedWeekId} searchQuery={searchQuery} initialItems={initialItems} />
        </div>

        {/* Right Sidebar - Fixed width, hidden on smaller screens */}
        <div className="hidden w-[350px] shrink-0 lg:block">
          <RightSidebar weekId={selectedWeekId} onSearchChange={setSearchQuery} />
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSearchClick={() => setShowMobileSearch(true)}
        onSettingsClick={() => setShowMobileSettings(true)}
      />

      {/* Mobile Search Drawer */}
      <MobileSearchDrawer
        isOpen={showMobileSearch}
        onClose={() => setShowMobileSearch(false)}
        weekId={selectedWeekId}
        onSearchChange={setSearchQuery}
      />

      {/* Mobile Settings Drawer */}
      <MobileSettingsDrawer
        isOpen={showMobileSettings}
        onClose={() => setShowMobileSettings(false)}
      />

    </div>
  );
}

function TopControls() {
  const { theme, setTheme, language, setLanguage, t } = useSettings();
  const [languageOpen, setLanguageOpen] = useState(false);

  return (
    <div className="fixed right-3 top-3 z-[70] flex items-center gap-2 lg:hidden">
      <button
        type="button"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="inline-flex h-9 w-9 items-center justify-center border border-foreground bg-card text-foreground shadow-sm transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={theme === "dark" ? t("switchToLight") : t("switchToDark")}
        title={theme === "dark" ? t("lightMode") : t("darkMode")}
      >
        {theme === "dark" ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
      </button>
      <div className="relative">
        <button
          type="button"
          onClick={() => setLanguageOpen((open) => !open)}
          className="inline-flex h-9 items-center gap-2 border border-foreground bg-card px-3 text-[10px] font-extrabold uppercase tracking-[0.12em] text-foreground shadow-sm hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
          aria-expanded={languageOpen}
          aria-haspopup="menu"
          aria-label={t("language")}
        >
          <Languages className="h-4 w-4 text-primary" aria-hidden="true" />
          <span>{language === "zh" ? "中文" : "EN"}</span>
        </button>
        {languageOpen && (
          <div role="menu" className="absolute right-0 top-full z-[80] mt-2 w-32 border border-foreground bg-popover py-1 shadow-lg">
            {LANGUAGE_OPTIONS.map((option) => (
              <a
                key={option.code}
                href={`/${option.code}`}
                role="menuitem"
                onClick={() => { setLanguage(option.code); setLanguageOpen(false); }}
                className={cn("flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-secondary", language === option.code && "font-semibold text-primary")}
              >
                <span>{option.nativeName}</span>
                {language === option.code && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MobileNav({
  activeTab,
  onTabChange,
  onSearchClick,
  onSettingsClick,
}: {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSearchClick: () => void;
  onSettingsClick: () => void;
}) {
  const { t } = useSettings();
  const tabs = [
    { id: "tech", label: t("technology"), icon: Cpu },
    { id: "investment", label: t("investments"), icon: TrendingUp },
    { id: "tips", label: t("tips"), icon: Lightbulb },
  ];

  return (
    <nav aria-label="Main navigation" className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t-2 border-foreground bg-card/95 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-sm md:hidden">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "flex flex-col items-center gap-1 px-3 py-2 active:scale-95 transition-transform duration-200",
            activeTab === tab.id ? "scale-105 text-primary" : "text-muted-foreground"
          )}
        >
          <tab.icon className="h-5 w-5" aria-hidden="true" />
          {activeTab === tab.id && (
            <span className="h-0.5 w-6 bg-primary" aria-hidden="true" />
          )}
          <span className="text-[10px] font-medium">{tab.label}</span>
        </button>
      ))}
      <button
        onClick={onSearchClick}
        className="flex flex-col items-center gap-1 px-3 py-2 active:scale-95 transition-transform duration-200 text-muted-foreground"
      >
        <Search className="h-5 w-5" aria-hidden="true" />
        <span className="text-[10px] font-medium">{t("search")}</span>
      </button>
      <button
        onClick={onSettingsClick}
        className="flex flex-col items-center gap-1 px-3 py-2 active:scale-95 transition-transform duration-200 text-muted-foreground"
      >
        <Settings className="h-5 w-5" aria-hidden="true" />
        <span className="text-[10px] font-medium">{t("settings")}</span>
      </button>
    </nav>
  );
}

function MobileSearchDrawer({
  isOpen,
  onClose,
  weekId,
  onSearchChange,
}: {
  isOpen: boolean;
  onClose: () => void;
  weekId: string;
  onSearchChange: (query: string) => void;
}) {
  const { language, t } = useSettings();
  const [searchValue, setSearchValue] = useState("");
  const { trends, loading: trendsLoading } = usePeriodTrends(weekId, language, isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  const handleSearch = (value: string) => {
    setSearchValue(value);
    onSearchChange(value);
  };

  const handleTrendFilter = (title: string) => {
    handleSearch(title);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true" aria-labelledby="mobile-search-title">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      {/* Drawer */}
      <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] border-t-2 border-foreground bg-card animate-in slide-in-from-bottom duration-300">
        {/* Handle with subtle gradient */}
        <div className="relative flex justify-center py-3" aria-hidden="true">
          <div className="relative h-0.5 w-12 bg-muted-foreground/40" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3">
          <h2 id="mobile-search-title" className="text-lg font-bold">{t("search")}</h2>
          <button
            onClick={onClose}
            className="p-2.5 transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={language === "de" ? "Schließen" : "Close"}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Search Input */}
        <div className="px-4 pb-4">
          <div className="relative">
            <label htmlFor="mobile-search-input" className="sr-only">
              {t("search")}
            </label>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              id="mobile-search-input"
              name="search"
              type="text"
              placeholder={t("search")}
              value={searchValue}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full border border-foreground bg-card py-3 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
              autoComplete="off"
              aria-label={t("search")}
            />
            {searchValue && (
              <button
                onClick={() => handleSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-colors hover:bg-muted-foreground/20"
                aria-label="Clear search"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Trends / Search Feedback */}
        <div className="px-4 pb-6 overflow-y-auto max-h-[50vh]">
          {searchValue ? (
            <div className="text-center py-8">
              <Search className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                {language === "de" ? `Filtere nach "${searchValue}"...` : `Filtering for "${searchValue}"...`}
              </p>
              <button
                onClick={onClose}
                className="mt-4 inline-flex items-center gap-2 bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
              >
                {language === "de" ? "Ergebnisse anzeigen" : "Show results"}
              </button>
            </div>
          ) : (
            <>
              <TrendIndex
                trends={trends}
                heading={t("whatsNew")}
                language={language}
                periodId={weekId}
                limit={8}
                loading={trendsLoading}
                compact
                onFilter={handleTrendFilter}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MobileSettingsDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { theme, setTheme, language, setLanguage, t } = useSettings();
  const [email, setEmail] = useState("");
  const [subscribeState, setSubscribeState] = useState<"idle" | "selectLang" | "loading" | "success" | "error">("idle");
  const [newsletterLang, setNewsletterLang] = useState(language);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true" aria-labelledby="mobile-settings-title">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      {/* Drawer */}
      <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto border-t-2 border-foreground bg-card animate-in slide-in-from-bottom duration-300">
        {/* Handle */}
        <div className="flex justify-center py-3" aria-hidden="true">
          <div className="h-0.5 w-12 bg-muted-foreground/40" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3">
          <h2 id="mobile-settings-title" className="text-lg font-bold">{t("settings")}</h2>
          <button
            onClick={onClose}
            className="p-2.5 transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={language === "de" ? "Schließen" : "Close"}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Settings Options */}
        <div className="px-4 pb-8 space-y-2">
          {/* Theme Toggle */}
          <button
            onClick={() => {
              setTheme(theme === "dark" ? "light" : "dark");
            }}
            className="flex w-full items-center gap-4 border-b border-border p-4 transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
          >
            {theme === "dark" ? (
              <Sun className="h-6 w-6 text-primary" aria-hidden="true" />
            ) : (
              <Moon className="h-6 w-6 text-primary" aria-hidden="true" />
            )}
            <div className="flex-1 text-left">
              <p className="font-semibold">{theme === "dark" ? t("lightMode") : t("darkMode")}</p>
              <p className="text-sm text-muted-foreground">
                {theme === "dark" ? t("switchToLight") : t("switchToDark")}
              </p>
            </div>
          </button>

          {/* Language Selector */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Languages className="h-5 w-5 text-primary" aria-hidden="true" />
              <p className="font-semibold">{t("language")}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {LANGUAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.code}
                  onClick={() => setLanguage(opt.code)}
                  className={cn(
                    "flex items-center justify-between border px-3 py-2.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    opt.code === language
                      ? "bg-primary/10 text-primary font-semibold border border-primary/30"
                      : "hover:bg-secondary border border-transparent"
                  )}
                >
                  <span>{opt.nativeName}</span>
                  {opt.code === language && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                </button>
              ))}
            </div>
          </div>

          {/* Newsletter */}
          <div className="border border-[#1c1a17] bg-[#ffef7a] p-4 text-center dark:border-border dark:bg-card">
            <div>
              <div className="mb-3 font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1c1a17] dark:text-foreground">
                Forager
              </div>
              <h2 className="mx-auto max-w-[16rem] break-words font-display text-2xl font-normal leading-[1.05] text-[#1c1a17] dark:text-foreground">
                {t("newsletterHeading")}
              </h2>
              <p className="mx-auto mb-4 mt-3 max-w-[16rem] text-xs leading-relaxed text-[#1c1a17] dark:text-muted-foreground">
                {t("newsletterDescription")}
              </p>
              {subscribeState === "success" ? (
                <div className="flex items-center justify-center gap-2 text-sm font-semibold text-[#1c1a17] dark:text-tips-accent">
                  <Check className="h-4 w-4" aria-hidden="true" />
                  <span>{t("subscribed")}</span>
                </div>
              ) : subscribeState === "selectLang" ? (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-foreground">{t("chooseNewsletterLang")}</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {LANGUAGE_OPTIONS.map((opt) => (
                      <button
                        key={opt.code}
                        type="button"
                        onClick={() => setNewsletterLang(opt.code)}
                        className={cn(
                          "rounded-md border px-2 py-1.5 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                          opt.code === newsletterLang
                            ? "border-[#1c1a17] bg-[#1c1a17] font-semibold text-[#fffdf9] dark:border-video-accent dark:bg-video-accent dark:text-primary-foreground"
                            : "border-[#1c1a17]/20 bg-[#fffdf9]/70 text-[#1c1a17] hover:border-[#1c1a17] dark:border-border dark:bg-background dark:text-muted-foreground"
                        )}
                      >
                        {opt.nativeName}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <button
                      type="button"
                      onClick={() => setSubscribeState("idle")}
                      className="flex items-center gap-1 text-xs font-medium text-[#1c1a17]/75 transition-colors hover:text-[#1c1a17] dark:text-muted-foreground dark:hover:text-foreground"
                    >
                      <ArrowLeft className="h-3 w-3" aria-hidden="true" />
                      {t("back")}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setSubscribeState("loading");
                        try {
                          const res = await fetch("/api/subscribe", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ email: email.trim(), language: newsletterLang }),
                          });
                          if (!res.ok) throw new Error();
                          setEmail("");
                          setSubscribeState("success");
                          setTimeout(() => setSubscribeState("idle"), 4000);
                        } catch {
                          setSubscribeState("error");
                          setTimeout(() => setSubscribeState("idle"), 3000);
                        }
                      }}
                      className="rounded bg-[#1c1a17] px-4 py-1.5 text-xs font-semibold text-[#fffdf9] transition-colors hover:bg-[#2c2924] focus-visible:ring-2 focus-visible:ring-ring dark:bg-video-accent dark:text-primary-foreground"
                    >
                      {t("confirm")}
                    </button>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!email.trim() || subscribeState === "loading") return;
                    setNewsletterLang(language);
                    setSubscribeState("selectLang");
                  }}
                  className="flex flex-col gap-2"
                >
                  <label htmlFor="mobile-newsletter-email" className="sr-only">
                    {t("emailPlaceholder")}
                  </label>
                  <input
                    id="mobile-newsletter-email"
                    name="email"
                    type="email"
                    required
                    placeholder={t("emailPlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-none border-0 border-b border-[#1c1a17] bg-transparent px-0 py-2 text-center text-sm placeholder:text-[#1c1a17]/55 focus:border-[#1c1a17] focus:outline-none focus:ring-0 dark:border-border dark:placeholder:text-muted-foreground"
                    autoComplete="email"
                    inputMode="email"
                    spellCheck={false}
                  />
                  {subscribeState === "error" && (
                    <p className="text-xs text-red-500">{t("subscribeError")}</p>
                  )}
                  <button
                  type="submit"
                  disabled={subscribeState === "loading"}
                  className="w-full rounded bg-[#1c1a17] px-4 py-2 text-sm font-semibold text-[#fffdf9] transition-colors hover:bg-[#2c2924] focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 dark:bg-video-accent dark:text-primary-foreground"
                >
                    {subscribeState === "loading" ? (
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" aria-hidden="true" />
                    ) : (
                      t("subscribe")
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
