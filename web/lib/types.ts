/**
 * Centralized TypeScript type definitions for the AI Information Hub.
 *
 * These types mirror the JSON data contracts in CLAUDE.md and are used
 * across all feed components for type safety.
 */

// =============================================================================
// Common Types
// =============================================================================

/** Author information displayed on feed posts */
export interface Author {
  name: string;
  handle: string;
  avatar: string; // 2-letter abbreviation
  verified: boolean;
}

/** Engagement metrics for social-style display */
export interface Metrics {
  comments: number;
  retweets: number;
  likes: number;
  views: string;
}

// =============================================================================
// Tech Feed Types (tech.json)
// =============================================================================

/** Icon types for tech posts, mapped to lucide-react icons */
export type TechIconType = "Brain" | "Server" | "Zap" | "Cpu";

/** Impact level for tech news importance */
export type ImpactLevel = "critical" | "high" | "medium" | "low";

/** A single tech news post */
export interface TechPost {
  id: number;
  author: Author;
  content: string;
  tags: string[];
  category: string;
  iconType: TechIconType;
  impact: ImpactLevel;
  timestamp: string; // ISO date string
  metrics: Metrics;
  source: string;
  sourceUrl?: string;
  // Video fields (optional - only present for video posts)
  isVideo?: boolean;
  videoId?: string;
  videoDuration?: string;
  videoViewCount?: string;
  videoThumbnailUrl?: string;
}

// =============================================================================
// Investment Feed Types (investment.json)
// =============================================================================

/** Funding round category for filtering */
export type RoundCategory = "Early" | "Series A" | "Series B" | "Series C+" | "Late/PE" | "Unknown";

/** Primary market funding round post */
export interface PrimaryMarketPost {
  id: number;
  author: Author;
  content: string;
  company: string;
  amount: string; // e.g., "$2.75B" or "$2,75 Mrd."
  round: string; // e.g., "Series D"
  /** Round category for filtering: Early (Pre-Seed/Seed/Angel), Series A, B, C+, Late/PE (Growth/Pre-IPO) */
  roundCategory?: RoundCategory;
  investors: string[];
  /** TYPE-H1: Valuation is optional as not all funding announcements include valuation */
  valuation?: string;
  timestamp: string;
  metrics: Metrics;
  sourceUrl?: string;
}

/** Secondary market stock movement post */
export interface SecondaryMarketPost {
  id: number;
  author: Author;
  content: string;
  ticker: string; // e.g., "NVDA"
  price: string;
  change: string; // e.g., "+5.2%"
  direction: "up" | "down";
  /** TYPE-H2: Market cap is optional as not all stock news includes this data */
  marketCap?: string;
  timestamp: string;
  metrics: Metrics;
  sourceUrl?: string;
}

/** AI application domain for M&A classification */
export type IndustryCategory =
  | "AI Healthcare"
  | "AI Finance"
  | "AI Enterprise"
  | "AI Consumer"
  | "AI Infrastructure"
  | "AI Robotics"
  | "AI Security"
  | "AI Creative"
  | "AI Education"
  | "Other AI";

/** M&A deal post */
export interface MAPost {
  id: number;
  author: Author;
  content: string;
  acquirer: string;
  target: string;
  dealValue: string;
  dealType: string; // e.g., "Acquisition" or "Akquisition"
  /** AI application domain: AI Healthcare, AI Finance, AI Enterprise, etc. Null if not AI-related. */
  industry?: IndustryCategory;
  timestamp: string;
  metrics: Metrics;
  sourceUrl?: string;
}

/** Full investment.json structure */
export interface InvestmentData {
  primaryMarket: MultilingualData<PrimaryMarketPost>;
  secondaryMarket: MultilingualData<SecondaryMarketPost>;
  ma: MultilingualData<MAPost>;
}

// =============================================================================
// Tips Feed Types (tips.json)
// =============================================================================

/** Difficulty level for tips (language-specific strings) */
export type DifficultyDE = "Anfänger" | "Mittel" | "Fortgeschritten";
export type DifficultyEN = "Beginner" | "Intermediate" | "Advanced";

/** Publisher the tip came from, as collected. */
export type TipPlatform = string;

/** A single practical tip post */
export interface TipPost {
  id: number;
  author: Author;
  platform: TipPlatform;
  content: string; // Description of the tip
  tip: string; // The actual tip/prompt/command (can contain newlines)
  category: string;
  /** Optional: nothing in the pipeline judges difficulty, so most tips carry none.
   *  It was previously the constant "Intermediate" on every tip, which the feed
   *  rendered as an assessment the data never made. */
  difficulty?: DifficultyDE | DifficultyEN;
  timestamp: string;
  metrics: Metrics;
  sourceUrl?: string;
}

// =============================================================================
// Trends Types (trends.json)
// =============================================================================

/** A trending topic */
export interface TrendItem {
  category: string; // e.g., "AI · Trending" or "KI · Trend"
  title: string;
  posts?: number;
  /** Proprietary momentum signal from our own topic history (backend-computed) */
  momentum?: "new" | "rising" | "returning";
  /** Consecutive periods (incl. current) this topic has trended */
  streak?: number;
}

/** A team member for display in sidebar */
export interface TeamMember {
  name: string;
  role: string;
  handle: string;
  avatar: string;
}

/** Full trends.json structure */
export interface TrendsData {
  trends: MultilingualData<TrendItem>;
  teamMembers: { de: TeamMember[]; en: TeamMember[] };
}

// =============================================================================
// Week Navigation Types (weeks.json)
// =============================================================================

/** A day entry within a week for hierarchical navigation */
export interface DayEntry {
  id: string;       // "2026-02-07"
  label: string;    // "07.02."
  weekday: string;  // "Fr" or "Fri"
  current: boolean;
}

/** A week entry for navigation */
export interface Week {
  id: string; // e.g., "2025-kw04"
  label: string; // e.g., "KW 04"
  year: number;
  weekNum?: number;        // optional (null for daily entries)
  dateRange: string; // e.g., "20.01 - 26.01"
  current: boolean;
  periodType?: string;     // "week" | "day"
  days?: DayEntry[];       // child days within this week
  /** Items the day's archive holds. Written by core/periods.py so the archive
   *  heatmap can shade a year without fetching a year of archive files.
   *  Optional: an index published before that field existed simply has none. */
  itemCount?: number;
}

/** Full weeks.json structure */
export interface WeeksData {
  weeks: Week[];
}

// =============================================================================
// Multilingual Data Wrapper
// =============================================================================

/** Generic multilingual data structure used by tech, tips, trends feeds */
export interface MultilingualData<T> {
  de?: T[];
  en?: T[];
  zh?: T[];
  fr?: T[];
  es?: T[];
  pt?: T[];
  ja?: T[];
  ko?: T[];
  [key: string]: T[] | undefined;
}
