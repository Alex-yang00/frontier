export type Language = "en" | "zh";

export const LANGUAGE_OPTIONS: { code: Language; name: string; nativeName: string }[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "zh", name: "Chinese", nativeName: "\u4e2d\u6587" },
];

export const translations = {
  en: {
    // Navigation
    home: "Home",
    discover: "Discover",
    frontier: "Frontier",
    settings: "Settings",
    categories: "Categories",

    // Tabs
    aiTechnology: "AI Technology",
    techProgress: "Technical Progress",
    investments: "Investments",
    marketFunding: "Market & Funding",
    practicalTips: "Practical Tips",
    handsOnAI: "Hands-on AI",
    technology: "Technology",
    tips: "Tips",

    // Week Navigation
    weekOverview: "Week Overview",
    week: "W",
    current: "Current",

    // Tech Feed
    aiTechProgress: "AI Technology Progress",
    importantDevThisWeek: "The most important technical developments",
    impact: "Impact",
    source: "Source",

    // Impact levels
    critical: "Critical",
    high: "High",
    medium: "Medium",
    low: "Low",

    // Investment Feed
    aiInvestments: "AI Investments",
    fundingNewsMA: "Funding rounds, stock news and M&A activities",
    primaryMarket: "Primary Market",
    secondaryMarket: "Secondary Market",
    volume: "Volume",
    valuation: "Valuation",
    marketCap: "Market Cap",
    acquisition: "Acquisition",
    acquirer: "Acquirer",
    target: "Target",
    dealValue: "Deal Value",

    // Investment Filters (Primary Market round filters)
    filterAll: "All",
    filterEarly: "Early",
    filterSeriesA: "Series A",
    filterSeriesB: "Series B",
    filterSeriesCPlus: "Series C+",
    filterLatePE: "Late/PE",
    filterByRound: "Filter by round",

    // Tips Feed
    practicalTipsTitle: "Practical Tips",
    handsOnTipsFrom: "Hands-on AI tips from X and Reddit",
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",

    // Right Sidebar
    search: "Search",
    whatsNew: "What's happening?",
    posts: "posts",
    team: "Frontier Team",
    follow: "Follow",
    showMore: "Show more",

    // Footer
    termsOfService: "Terms of Service",
    privacy: "Privacy",
    cookiePolicy: "Cookie Policy",
    imprint: "Imprint",
    accessibility: "Accessibility",

    // Settings
    darkMode: "Dark Mode",
    lightMode: "Light Mode",
    switchToDark: "Switch to dark mode",
    switchToLight: "Switch to light mode",
    language: "Language",
    german: "Deutsch",
    english: "English",
    switchToGerman: "Switch to German",
    switchToEnglish: "Switch to English",

    // Share
    share: "Share",
    copiedToClipboard: "Copied to clipboard",

    // Timestamps
    hoursAgo: "{n}h ago",
    dayAgo: "1 day ago",
    daysAgo: "{n} days ago",

    // Chat Widget
    chatTitle: "AI Assistant",
    chatWelcome: "Hi! I can help you understand this week's AI news. Ask me a question!",
    chatPlaceholder: "Ask a question...",
    chatThinking: "Thinking...",
    chatError: "Failed to load. Please try again.",
    chatTimeout: "Request timed out. Please try again.",
    chatClear: "New chat",
    chatSuggest1: "Summarize this week",
    chatSuggest2: "What are the top investments?",
    chatSuggest3: "Which trends are important?",

    // Period/Daily
    noDataForThisPeriod: "No data available for this period.",

    // Video
    video: "Video",
    playVideo: "Play video",
    views: "views",
    duration: "Duration",

    // Newsletter
    newsletter: "Newsletter",
    newsletterHeading: "The Signals That Matter",
    emailPlaceholder: "Email address",
    subscribe: "Subscribe free",
    subscribed: "Subscribed!",
    subscribeError: "Subscription failed. Please try again.",
    newsletterDescription: "A daily intelligence memo on AI news, capital moves, and practical workflows.",
    newsletterSocialProof: "Published for AI operators",
    chooseNewsletterLang: "Choose newsletter language:",
    confirm: "Confirm",
    back: "Back",

    // Share enhanced
    copyLink: "Copy link",
    shareOnX: "Share on X",
    shareOnLinkedIn: "Share on LinkedIn",

    // FAB Labels
    fabReport: "AI Report",
    fabChat: "AI Chat",

    // Report Generator
    reportGenerate: "Generate AI Report",
    reportTitle: "AI Weekly Report",
    reportGenerating: "Generating report...",
    reportComplete: "Report complete!",
    reportExportMd: "Markdown",
    reportExportDocx: "Word",
    reportExportHtml: "HTML",
    reportExportTxt: "Text",
    reportExportJson: "JSON",
    reportExport: "Export",
    reportClose: "Close",
    reportError: "Failed to generate report. Please try again.",
    reportRegenerate: "Regenerate",
  },
  zh: {
    // Navigation
    home: "\u9996\u9875",
    discover: "\u53d1\u73b0",
    frontier: "Frontier",
    settings: "\u8bbe\u7f6e",
    categories: "\u5206\u7c7b",

    // Tabs
    aiTechnology: "AI \u6280\u672f",
    techProgress: "\u6280\u672f\u8fdb\u5c55",
    investments: "\u6295\u8d44",
    marketFunding: "\u5e02\u573a\u4e0e\u878d\u8d44",
    practicalTips: "\u5b9e\u7528\u6280\u5de7",
    handsOnAI: "\u52a8\u624b\u5b9e\u8df5 AI",
    technology: "\u6280\u672f",
    tips: "\u6280\u5de7",

    // Week Navigation
    weekOverview: "\u5468\u62a5\u6982\u89c8",
    week: "\u5468",
    current: "\u5f53\u524d",

    // Tech Feed
    aiTechProgress: "AI \u6280\u672f\u8fdb\u5c55",
    importantDevThisWeek: "\u6700\u91cd\u8981\u7684\u6280\u672f\u53d1\u5c55",
    impact: "\u5f71\u54cd\u7a0b\u5ea6",
    source: "\u6765\u6e90",

    // Impact levels
    critical: "\u5173\u952e",
    high: "\u9ad8",
    medium: "\u4e2d",
    low: "\u4f4e",

    // Investment Feed
    aiInvestments: "AI \u6295\u8d44",
    fundingNewsMA: "\u878d\u8d44\u8f6e\u6b21\u3001\u80a1\u5e02\u52a8\u6001\u548c\u5e76\u8d2d\u6d3b\u52a8",
    primaryMarket: "\u4e00\u7ea7\u5e02\u573a",
    secondaryMarket: "\u4e8c\u7ea7\u5e02\u573a",
    volume: "\u89c4\u6a21",
    valuation: "\u4f30\u503c",
    marketCap: "\u5e02\u503c",
    acquisition: "\u6536\u8d2d",
    acquirer: "\u6536\u8d2d\u65b9",
    target: "\u76ee\u6807",
    dealValue: "\u4ea4\u6613\u989d",

    // Investment Filters
    filterAll: "\u5168\u90e8",
    filterEarly: "\u65e9\u671f",
    filterSeriesA: "A \u8f6e",
    filterSeriesB: "B \u8f6e",
    filterSeriesCPlus: "C+ \u8f6e",
    filterLatePE: "\u540e\u671f/PE",
    filterByRound: "\u6309\u8f6e\u6b21\u7b5b\u9009",

    // Tips Feed
    practicalTipsTitle: "\u5b9e\u7528\u6280\u5de7",
    handsOnTipsFrom: "\u6765\u81ea X \u548c Reddit \u7684\u5b9e\u7528 AI \u6280\u5de7",
    beginner: "\u521d\u7ea7",
    intermediate: "\u4e2d\u7ea7",
    advanced: "\u9ad8\u7ea7",

    // Right Sidebar
    search: "\u641c\u7d22",
    whatsNew: "\u6700\u65b0\u52a8\u6001",
    posts: "\u6761",
    team: "Frontier \u56e2\u961f",
    follow: "\u5173\u6ce8",
    showMore: "\u663e\u793a\u66f4\u591a",

    // Footer
    termsOfService: "\u670d\u52a1\u6761\u6b3e",
    privacy: "\u9690\u79c1\u653f\u7b56",
    cookiePolicy: "Cookie \u653f\u7b56",
    imprint: "\u6cd5\u5f8b\u58f0\u660e",
    accessibility: "\u65e0\u969c\u788d\u8bbf\u95ee",

    // Settings
    darkMode: "\u6df1\u8272\u6a21\u5f0f",
    lightMode: "\u6d45\u8272\u6a21\u5f0f",
    switchToDark: "\u5207\u6362\u5230\u6df1\u8272\u6a21\u5f0f",
    switchToLight: "\u5207\u6362\u5230\u6d45\u8272\u6a21\u5f0f",
    language: "\u8bed\u8a00",
    german: "Deutsch",
    english: "English",
    switchToGerman: "\u5207\u6362\u5230\u5fb7\u8bed",
    switchToEnglish: "\u5207\u6362\u5230\u82f1\u8bed",

    // Share
    share: "\u5206\u4eab",
    copiedToClipboard: "\u5df2\u590d\u5236\u5230\u526a\u8d34\u677f",

    // Timestamps
    hoursAgo: "{n}\u5c0f\u65f6\u524d",
    dayAgo: "1\u5929\u524d",
    daysAgo: "{n}\u5929\u524d",

    // Chat Widget
    chatTitle: "AI \u52a9\u624b",
    chatWelcome: "\u4f60\u597d\uff01\u6211\u53ef\u4ee5\u5e2e\u4f60\u4e86\u89e3\u672c\u5468\u7684 AI \u65b0\u95fb\u3002\u8bf7\u63d0\u95ee\uff01",
    chatPlaceholder: "\u8f93\u5165\u95ee\u9898...",
    chatThinking: "\u601d\u8003\u4e2d...",
    chatError: "\u52a0\u8f7d\u5931\u8d25\uff0c\u8bf7\u91cd\u8bd5\u3002",
    chatTimeout: "\u8bf7\u6c42\u8d85\u65f6\uff0c\u8bf7\u91cd\u8bd5\u3002",
    chatClear: "\u65b0\u5bf9\u8bdd",
    chatSuggest1: "\u603b\u7ed3\u672c\u5468\u8981\u70b9",
    chatSuggest2: "\u6700\u70ed\u95e8\u7684\u6295\u8d44\u662f\u4ec0\u4e48\uff1f",
    chatSuggest3: "\u54ea\u4e9b\u8d8b\u52bf\u503c\u5f97\u5173\u6ce8\uff1f",

    // Period/Daily
    noDataForThisPeriod: "\u8be5\u65f6\u6bb5\u6682\u65e0\u6570\u636e\u3002",

    // Video
    video: "\u89c6\u9891",
    playVideo: "\u64ad\u653e\u89c6\u9891",
    views: "\u6b21\u89c2\u770b",
    duration: "\u65f6\u957f",

    // Newsletter
    newsletter: "\u7535\u5b50\u901a\u8baf",
    newsletterHeading: "\u503c\u5f97\u5173\u6ce8\u7684 AI \u4fe1\u53f7",
    emailPlaceholder: "\u7535\u5b50\u90ae\u7bb1\u5730\u5740",
    subscribe: "\u514d\u8d39\u8ba2\u9605",
    subscribed: "\u8ba2\u9605\u6210\u529f\uff01",
    subscribeError: "\u8ba2\u9605\u5931\u8d25\uff0c\u8bf7\u91cd\u8bd5\u3002",
    newsletterDescription: "\u6bcf\u65e5 AI \u60c5\u62a5\u7b80\u62a5\uff1a\u65b0\u95fb\u3001\u8d44\u672c\u52a8\u6001\u4e0e\u5b9e\u7528\u5de5\u4f5c\u6d41\u3002",
    newsletterSocialProof: "\u4e3a AI \u4ece\u4e1a\u8005\u7b56\u5c55",
    chooseNewsletterLang: "\u9009\u62e9\u8ba2\u9605\u8bed\u8a00\uff1a",
    confirm: "\u786e\u8ba4",
    back: "\u8fd4\u56de",

    // Share enhanced
    copyLink: "\u590d\u5236\u94fe\u63a5",
    shareOnX: "\u5206\u4eab\u5230 X",
    shareOnLinkedIn: "\u5206\u4eab\u5230 LinkedIn",

    // FAB Labels
    fabReport: "AI \u62a5\u544a",
    fabChat: "AI \u5bf9\u8bdd",

    // Report Generator
    reportGenerate: "\u751f\u6210 AI \u62a5\u544a",
    reportTitle: "AI \u5468\u62a5",
    reportGenerating: "\u6b63\u5728\u751f\u6210\u62a5\u544a...",
    reportComplete: "\u62a5\u544a\u5df2\u5b8c\u6210\uff01",
    reportExportMd: "Markdown",
    reportExportDocx: "Word",
    reportExportHtml: "HTML",
    reportExportTxt: "\u7eaf\u6587\u672c",
    reportExportJson: "JSON",
    reportExport: "\u5bfc\u51fa",
    reportClose: "\u5173\u95ed",
    reportError: "\u62a5\u544a\u751f\u6210\u5931\u8d25\uff0c\u8bf7\u91cd\u8bd5\u3002",
    reportRegenerate: "\u91cd\u65b0\u751f\u6210",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;
