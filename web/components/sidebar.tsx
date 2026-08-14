"use client";

import { useState, useRef, useEffect } from "react";
import { Cpu, TrendingUp, Lightbulb, Sun, Moon, Languages, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/lib/settings-context";
import { ForagerMark } from "@/components/forager-mark";
import { IssueTimeline } from "@/components/issue-timeline";
import { LANGUAGE_OPTIONS, type TranslationKey, type Language } from "@/lib/translations";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  selectedWeekId: string;
  onWeekChange: (weekId: string) => void;
}

const getTabsData = (t: (key: TranslationKey) => string) => [
  {
    id: "tech",
    label: t("aiTechnology"),
    icon: Cpu,
    description: t("techProgress"),
  },
  {
    id: "investment",
    label: t("investments"),
    icon: TrendingUp,
    description: t("marketFunding"),
  },
  {
    id: "tips",
    label: t("practicalTips"),
    icon: Lightbulb,
    description: t("handsOnAI"),
  },
];

// Reusable nav button with tooltip for tablet view
function NavButton({
  icon: Icon,
  label,
  description,
  onClick,
  isActive,
  className,
  iconClassName,
}: {
  icon: React.ElementType;
  label: string;
  description?: string;
  onClick?: () => void;
  isActive?: boolean;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "flex w-full items-center gap-4 border-l-[3px] px-4 py-3 transition-[color,background-color,border-color] duration-200 focus-visible:ring-2 focus-visible:ring-ring",
            isActive
              ? "border-l-primary bg-card text-primary"
              : "border-l-transparent text-foreground hover:border-l-foreground hover:bg-card",
            className
          )}
        >
          <Icon
            aria-hidden="true"
            className={cn(
              "h-6 w-6 shrink-0 transition-colors",
              isActive ? "text-primary" : "",
              iconClassName
            )}
          />
          <div className="text-left hidden xl:block">
            <span className="font-sans text-[13px] font-extrabold uppercase tracking-[0.12em]">{label}</span>
            {description && <p className="mt-1 text-xs leading-snug text-muted-foreground">{description}</p>}
          </div>
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="xl:hidden">
        <p>{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </TooltipContent>
    </Tooltip>
  );
}

function LanguageDropdown({ language, setLanguage }: { language: Language; setLanguage: (lang: Language) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const current = LANGUAGE_OPTIONS.find((l) => l.code === language) || LANGUAGE_OPTIONS[0];

  return (
    <div className="relative" ref={ref}>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex w-full items-center gap-4 border-l-[3px] border-l-transparent px-4 py-3 text-foreground transition-[color,background-color,border-color] duration-200 hover:border-l-foreground hover:bg-card focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Languages aria-hidden="true" className="h-6 w-6 shrink-0 text-accent" />
            <span className="hidden font-sans text-[13px] font-extrabold uppercase tracking-[0.12em] xl:block">{current.nativeName}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="xl:hidden">
          <p>{current.nativeName}</p>
        </TooltipContent>
      </Tooltip>

      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-1 w-48 border border-foreground bg-popover py-1 shadow-lg">
          {LANGUAGE_OPTIONS.map((opt) => (
            <button
              key={opt.code}
              onClick={() => { setLanguage(opt.code); setOpen(false); }}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring",
                opt.code === language && "font-semibold text-primary"
              )}
            >
              <span className="flex-1 text-left">{opt.nativeName}</span>
              {opt.code === language && <Check aria-hidden="true" className="h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ activeTab, onTabChange, selectedWeekId, onWeekChange }: SidebarProps) {
  const { theme, setTheme, language, setLanguage, t } = useSettings();
  const tabs = getTabsData(t);

  return (
    <TooltipProvider delayDuration={300}>
      <aside className="sticky top-0 flex h-screen w-full flex-col border-r border-sidebar-border bg-sidebar px-3 py-4">
        {/* Logo */}
        <div className="mb-6 px-3">
          <div className="flex items-center gap-3 border-b-2 border-foreground pb-4">
            <ForagerMark size={40} className="shrink-0" />
            <span className="hidden font-display text-2xl font-normal leading-none text-foreground xl:block">Forager</span>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 space-y-6 overflow-y-auto pb-4">
          {/* Category Tabs */}
          <div>
            <p className="mb-2 px-4 font-sans text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground hidden xl:block">
              {t("categories")}
            </p>
            {tabs.map((tab) => (
              <NavButton
                key={tab.id}
                icon={tab.icon}
                label={tab.label}
                description={tab.description}
                onClick={() => onTabChange(tab.id)}
                isActive={activeTab === tab.id}
              />
            ))}
          </div>

          {selectedWeekId && (
            <IssueTimeline
              selectedWeekId={selectedWeekId}
              onWeekChange={onWeekChange}
              variant="sidebar"
            />
          )}
        </nav>

        {/* Settings Controls */}
        <div className="space-y-2 border-t border-sidebar-border pt-4">
          {/* Theme Toggle */}
          <NavButton
            icon={theme === "dark" ? Sun : Moon}
            label={theme === "dark" ? t("lightMode") : t("darkMode")}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            iconClassName={theme === "dark" ? "text-yellow-500" : "text-blue-400"}
          />

          {/* Language Selector */}
          <LanguageDropdown language={language} setLanguage={setLanguage} />
        </div>

        {/* Legal Links */}
        <div className="mt-2 hidden flex-wrap gap-x-3 gap-y-1 border-t border-sidebar-border px-4 pt-3 xl:flex">
          <a href="/about" className="text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring rounded">
            {language === "de" ? "Über uns" : "About"}
          </a>
          <a href="/contact" className="text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring rounded">
            {language === "de" ? "Kontakt" : "Contact"}
          </a>
          <a href="/editorial-policy" className="text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring rounded">
            {language === "de" ? "Redaktion" : "Editorial"}
          </a>
          <a href="/impressum" className="text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring rounded">
            {language === "de" ? "Impressum" : "Legal Notice"}
          </a>
          <a href="/datenschutz" className="text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring rounded">
            {language === "de" ? "Datenschutz" : "Privacy Policy"}
          </a>
        </div>
      </aside>
    </TooltipProvider>
  );
}
