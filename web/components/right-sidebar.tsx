"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Search, Check, Languages, Moon, Sun } from "lucide-react";
import { Input } from "@/components/ui/input";
import { TrendIndex } from "@/components/trend-index";
import { usePeriodTrends } from "@/hooks/use-period-trends";
import { useSettings } from "@/lib/settings-context";
import { cn } from "@/lib/utils";


interface RightSidebarProps {
  weekId: string;
  onSearchChange: (query: string) => void;
}

export function RightSidebar({ weekId, onSearchChange }: RightSidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [sidebarStyle, setSidebarStyle] = useState<CSSProperties>({});
  const lastScrollY = useRef(0);
  const currentTop = useRef(0);
  const { language, setLanguage, theme, setTheme, t } = useSettings();
  const [languageOpen, setLanguageOpen] = useState(false);

  const [searchValue, setSearchValue] = useState("");
  const { trends, loading: trendsLoading } = usePeriodTrends(weekId, language);

  const handleTrendFilter = (query: string) => {
    setSearchValue(query);
    onSearchChange(query);
  };

  useEffect(() => {
    const handleScroll = () => {
      if (!sidebarRef.current || !contentRef.current) return;

      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const contentHeight = contentRef.current.offsetHeight;
      const scrollDelta = scrollY - lastScrollY.current;

      if (contentHeight <= windowHeight) {
        setSidebarStyle({ position: "sticky", top: 0 });
        lastScrollY.current = scrollY;
        return;
      }

      const maxNegativeTop = -(contentHeight - windowHeight);

      if (scrollDelta > 0) {
        currentTop.current = Math.max(currentTop.current - scrollDelta, maxNegativeTop);
      } else {
        currentTop.current = Math.min(currentTop.current - scrollDelta, 0);
      }

      setSidebarStyle({
        position: "sticky",
        top: `${currentTop.current}px`,
      });

      lastScrollY.current = scrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <aside ref={sidebarRef} style={sidebarStyle} className="bg-sidebar py-4 pl-6 pr-4">
      <div ref={contentRef}>
        <div className="mb-4 flex items-center justify-end gap-2 border-b border-sidebar-border pb-3">
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="inline-flex h-9 w-9 items-center justify-center border border-border bg-card text-muted-foreground transition-colors hover:border-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={theme === "dark" ? t("switchToLight") : t("switchToDark")}
            title={theme === "dark" ? t("lightMode") : t("darkMode")}
          >
            {theme === "dark" ? <Sun className="h-4 w-4 text-foreground" aria-hidden="true" /> : <Moon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setLanguageOpen((open) => !open)}
              className="inline-flex h-9 items-center gap-2 border border-border bg-card px-3 text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:border-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              aria-expanded={languageOpen}
              aria-haspopup="menu"
              aria-label={t("language")}
              title={t("language")}
            >
              <Languages className="h-4 w-4 text-accent" aria-hidden="true" />
              <span>{language === "zh" ? "中文" : "EN"}</span>
            </button>
            {languageOpen && (
              <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-32 border border-foreground bg-popover py-1 shadow-lg">
                <a
                  role="menuitem"
                  href="/en"
                  onClick={() => { setLanguage("en"); setLanguageOpen(false); }}
                  className={cn("flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-secondary", language === "en" && "font-semibold text-primary")}
                >
                  <span>English</span>{language === "en" && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                </a>
                <a
                  role="menuitem"
                  href="/zh"
                  onClick={() => { setLanguage("zh"); setLanguageOpen(false); }}
                  className={cn("flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-secondary", language === "zh" && "font-semibold text-primary")}
                >
                  <span>中文</span>{language === "zh" && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                </a>
              </div>
            )}
          </div>
        </div>
        {/* Search */}
        <div className="relative">
          <label htmlFor="desktop-search-input" className="sr-only">
            {t("search")}
          </label>
          <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="desktop-search-input"
            name="search"
            placeholder={t("search")}
            className="rounded-none border-foreground bg-card pl-10 focus-visible:ring-1 focus-visible:ring-primary"
            value={searchValue}
            autoComplete="off"
            aria-label={t("search")}
            onChange={(e) => {
              setSearchValue(e.target.value);
              onSearchChange(e.target.value);
            }}
          />
        </div>

        <TrendIndex
          trends={trends}
          heading={t("whatsNew")}
          language={language}
          periodId={weekId}
          loading={trendsLoading}
          onFilter={handleTrendFilter}
        />

        {/* Footer */}
        <div className="mt-4 px-2 text-xs text-muted-foreground">
          <nav aria-label="Trust and legal links" className="mb-2 flex flex-wrap gap-x-3 gap-y-1">
            <a href="/about" className="hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring rounded">
              About
            </a>
            <a href="/contact" className="hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring rounded">
              Contact
            </a>
            <a href="/datenschutz" className="hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring rounded">
              Privacy Policy
            </a>
            <a href="/editorial-policy" className="hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring rounded">
              Editorial Policy
            </a>
          </nav>
          <p>&copy; 2026 Forager</p>
        </div>
      </div>
    </aside>
  );
}
