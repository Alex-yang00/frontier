"use client";

import { Cpu, TrendingUp, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/lib/settings-context";
import { ForagerMark } from "@/components/forager-mark";
import { IssueTimeline } from "@/components/issue-timeline";
import { type TranslationKey } from "@/lib/translations";
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

export function Sidebar({ activeTab, onTabChange, selectedWeekId, onWeekChange }: SidebarProps) {
  const { language, t } = useSettings();
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

        {/* Legal Links */}
        <div className="mt-2 hidden flex-wrap gap-x-3 gap-y-1 border-t border-sidebar-border px-4 pt-3 xl:flex">
          <a href="/about" className="text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring rounded">
            {language === "zh" ? "关于我们" : "About"}
          </a>
          <a href="/contact" className="text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring rounded">
            {language === "zh" ? "联系" : "Contact"}
          </a>
          <a href="/editorial-policy" className="text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring rounded">
            {language === "zh" ? "编辑方针" : "Editorial"}
          </a>
          <a href="/impressum" className="text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring rounded">
            {language === "zh" ? "法律声明" : "Legal Notice"}
          </a>
          <a href="/datenschutz" className="text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring rounded">
            {language === "zh" ? "隐私政策" : "Privacy Policy"}
          </a>
        </div>
      </aside>
    </TooltipProvider>
  );
}
