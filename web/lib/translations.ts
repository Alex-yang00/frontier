export type Language = "de" | "en" | "zh" | "fr" | "es" | "pt" | "ja" | "ko";

export const LANGUAGE_OPTIONS: { code: Language; name: string; nativeName: string }[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "zh", name: "Chinese", nativeName: "\u4e2d\u6587" },
];

export const translations = {
  de: {
    // Navigation
    home: "Startseite",
    discover: "Entdecken",
    forager: "Forager",
    settings: "Einstellungen",
    categories: "Kategorien",

    // Tabs
    aiTechnology: "KI-Technologie",
    techProgress: "Technische Fortschritte",
    investments: "Investitionen",
    marketFunding: "Markt & Finanzierung",
    practicalTips: "Praxis-Tipps",
    handsOnAI: "Hands-on KI",
    technology: "Technologie",
    tips: "Tipps",

    // Week Navigation
    weekOverview: "Wochenübersicht",
    week: "KW",
    current: "Aktuell",

    // Tech Feed
    aiTechProgress: "KI-Technologie Fortschritte",
    importantDevThisWeek: "Die wichtigsten technischen Entwicklungen",
    impact: "Auswirkung",
    source: "Quelle",

    // Impact levels
    critical: "Kritisch",
    high: "Hoch",
    medium: "Mittel",
    low: "Niedrig",

    // Investment Feed
    aiInvestments: "KI-Investitionen",
    fundingNewsMA: "Finanzierungsrunden, B\u00f6rsennews und M&A-Aktivit\u00e4ten",
    primaryMarket: "Prim\u00e4rmarkt",
    secondaryMarket: "Sekund\u00e4rmarkt",
    volume: "Volumen",
    valuation: "Bewertung",
    marketCap: "Marktkapitalisierung",
    acquisition: "Akquisition",
    acquirer: "K\u00e4ufer",
    target: "Ziel",
    dealValue: "Dealwert",

    // Investment Filters (Primary Market round filters)
    filterAll: "Alle",
    filterEarly: "Fr\u00fch",
    filterSeriesA: "Serie A",
    filterSeriesB: "Serie B",
    filterSeriesCPlus: "Serie C+",
    filterLatePE: "Sp\u00e4t/PE",
    filterByRound: "Nach Runde filtern",

    // Tips Feed
    practicalTipsTitle: "Praxis-Tipps",
    handsOnTipsFrom: "Hands-on KI-Tipps von X und Reddit",
    beginner: "Anf\u00e4nger",
    intermediate: "Mittel",
    advanced: "Fortgeschritten",

    // Right Sidebar
    search: "Suchen",
    whatsNew: "Was gibt's Neues?",
    posts: "Beitr\u00e4ge",
    team: "Forager Team",
    follow: "Folgen",
    showMore: "Mehr anzeigen",

    // Footer
    termsOfService: "Nutzungsbedingungen",
    privacy: "Datenschutz",
    cookiePolicy: "Cookie-Richtlinie",
    imprint: "Impressum",
    accessibility: "Barrierefreiheit",

    // Settings
    darkMode: "Dunkelmodus",
    lightMode: "Hellmodus",
    switchToDark: "Zum Dunkelmodus wechseln",
    switchToLight: "Zum Hellmodus wechseln",
    language: "Sprache",
    german: "Deutsch",
    english: "English",
    switchToGerman: "Zu Deutsch wechseln",
    switchToEnglish: "Zu Englisch wechseln",

    // Share
    share: "Teilen",
    copiedToClipboard: "In Zwischenablage kopiert",

    // Timestamps
    hoursAgo: "vor {n} Std.",
    dayAgo: "vor 1 Tag",
    daysAgo: "vor {n} Tagen",

    // Chat Widget
    chatTitle: "KI-Assistent",
    chatWelcome: "Hallo! Ich kann dir helfen, die KI-News dieser Woche zu verstehen. Stell mir eine Frage!",
    chatPlaceholder: "Frage stellen...",
    chatThinking: "Denke nach...",
    chatError: "Fehler beim Laden. Bitte versuche es erneut.",
    chatTimeout: "Zeit\u00fcberschreitung. Bitte versuche es erneut.",
    chatClear: "Neues Gespr\u00e4ch",
    chatSuggest1: "Fasse diese Woche zusammen",
    chatSuggest2: "Was sind die Top-Investitionen?",
    chatSuggest3: "Welche Trends sind wichtig?",

    // Period/Daily
    noDataForThisPeriod: "Keine Daten f\u00fcr diesen Zeitraum verf\u00fcgbar.",

    // Video
    video: "Video",
    playVideo: "Video abspielen",
    views: "Aufrufe",
    duration: "Dauer",

    // Newsletter
    newsletter: "Newsletter",
    newsletterHeading: "Die Signale, die z\u00e4hlen",
    emailPlaceholder: "E-Mail-Adresse",
    subscribe: "Kostenlos abonnieren",
    subscribed: "Abonniert!",
    subscribeError: "Fehler beim Abonnieren. Bitte erneut versuchen.",
    newsletterDescription: "Ein t\u00e4gliches Intelligence-Memo zu KI-News, Kapitalbewegungen und praktischen Workflows.",
    newsletterSocialProof: "F\u00fcr KI-Professionals kuratiert",
    chooseNewsletterLang: "Newsletter-Sprache w\u00e4hlen:",
    confirm: "Best\u00e4tigen",
    back: "Zur\u00fcck",

    // Share enhanced
    copyLink: "Link kopieren",
    shareOnX: "Auf X teilen",
    shareOnLinkedIn: "Auf LinkedIn teilen",

    // FAB Labels
    fabReport: "KI-Bericht",
    fabChat: "KI-Chat",

    // Report Generator
    reportGenerate: "KI-Bericht erstellen",
    reportTitle: "KI-Wochenbericht",
    reportGenerating: "Bericht wird erstellt...",
    reportComplete: "Bericht fertig!",
    reportExportMd: "Markdown",
    reportExportDocx: "Word",
    reportExportHtml: "HTML",
    reportExportTxt: "Text",
    reportExportJson: "JSON",
    reportExport: "Exportieren",
    reportClose: "Schlie\u00dfen",
    reportError: "Fehler beim Erstellen des Berichts. Bitte versuche es erneut.",
    reportRegenerate: "Neu generieren",
  },
  en: {
    // Navigation
    home: "Home",
    discover: "Discover",
    forager: "Forager",
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
    team: "Forager Team",
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
    forager: "Forager",
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
    team: "Forager \u56e2\u961f",
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
  fr: {
    // Navigation
    home: "Accueil",
    discover: "D\u00e9couvrir",
    forager: "Forager",
    settings: "Param\u00e8tres",
    categories: "Cat\u00e9gories",

    // Tabs
    aiTechnology: "Technologie IA",
    techProgress: "Progr\u00e8s techniques",
    investments: "Investissements",
    marketFunding: "March\u00e9 & Financement",
    practicalTips: "Astuces pratiques",
    handsOnAI: "IA en pratique",
    technology: "Technologie",
    tips: "Astuces",

    // Week Navigation
    weekOverview: "Aper\u00e7u de la semaine",
    week: "S",
    current: "En cours",

    // Tech Feed
    aiTechProgress: "Progr\u00e8s technologiques IA",
    importantDevThisWeek: "Les d\u00e9veloppements techniques les plus importants",
    impact: "Impact",
    source: "Source",

    // Impact levels
    critical: "Critique",
    high: "\u00c9lev\u00e9",
    medium: "Moyen",
    low: "Faible",

    // Investment Feed
    aiInvestments: "Investissements IA",
    fundingNewsMA: "Lev\u00e9es de fonds, actualit\u00e9s boursi\u00e8res et fusions-acquisitions",
    primaryMarket: "March\u00e9 primaire",
    secondaryMarket: "March\u00e9 secondaire",
    volume: "Volume",
    valuation: "Valorisation",
    marketCap: "Capitalisation boursi\u00e8re",
    acquisition: "Acquisition",
    acquirer: "Acqu\u00e9reur",
    target: "Cible",
    dealValue: "Valeur du deal",

    // Investment Filters
    filterAll: "Tout",
    filterEarly: "D\u00e9but",
    filterSeriesA: "S\u00e9rie A",
    filterSeriesB: "S\u00e9rie B",
    filterSeriesCPlus: "S\u00e9rie C+",
    filterLatePE: "Tard/PE",
    filterByRound: "Filtrer par tour",

    // Tips Feed
    practicalTipsTitle: "Astuces pratiques",
    handsOnTipsFrom: "Astuces IA pratiques de X et Reddit",
    beginner: "D\u00e9butant",
    intermediate: "Interm\u00e9diaire",
    advanced: "Avanc\u00e9",

    // Right Sidebar
    search: "Rechercher",
    whatsNew: "Quoi de neuf\u00a0?",
    posts: "publications",
    team: "\u00c9quipe Forager",
    follow: "Suivre",
    showMore: "Afficher plus",

    // Footer
    termsOfService: "Conditions d\u2019utilisation",
    privacy: "Confidentialit\u00e9",
    cookiePolicy: "Politique de cookies",
    imprint: "Mentions l\u00e9gales",
    accessibility: "Accessibilit\u00e9",

    // Settings
    darkMode: "Mode sombre",
    lightMode: "Mode clair",
    switchToDark: "Passer en mode sombre",
    switchToLight: "Passer en mode clair",
    language: "Langue",
    german: "Deutsch",
    english: "English",
    switchToGerman: "Passer en allemand",
    switchToEnglish: "Passer en anglais",

    // Share
    share: "Partager",
    copiedToClipboard: "Copi\u00e9 dans le presse-papiers",

    // Timestamps
    hoursAgo: "il y a {n}h",
    dayAgo: "il y a 1 jour",
    daysAgo: "il y a {n} jours",

    // Chat Widget
    chatTitle: "Assistant IA",
    chatWelcome: "Bonjour\u00a0! Je peux vous aider \u00e0 comprendre les actualit\u00e9s IA de la semaine. Posez-moi une question\u00a0!",
    chatPlaceholder: "Poser une question...",
    chatThinking: "R\u00e9flexion...",
    chatError: "\u00c9chec du chargement. Veuillez r\u00e9essayer.",
    chatTimeout: "D\u00e9lai d\u00e9pass\u00e9. Veuillez r\u00e9essayer.",
    chatClear: "Nouvelle conversation",
    chatSuggest1: "R\u00e9sumer cette semaine",
    chatSuggest2: "Quels sont les meilleurs investissements\u00a0?",
    chatSuggest3: "Quelles tendances sont importantes\u00a0?",

    // Period/Daily
    noDataForThisPeriod: "Aucune donn\u00e9e disponible pour cette p\u00e9riode.",

    // Video
    video: "Vid\u00e9o",
    playVideo: "Lire la vid\u00e9o",
    views: "vues",
    duration: "Dur\u00e9e",

    // Newsletter
    newsletter: "Newsletter",
    newsletterHeading: "Les signaux qui comptent",
    emailPlaceholder: "Adresse e-mail",
    subscribe: "S\u2019abonner gratuitement",
    subscribed: "Abonn\u00e9\u00a0!",
    subscribeError: "\u00c9chec de l\u2019abonnement. Veuillez r\u00e9essayer.",
    newsletterDescription: "Un m\u00e9mo quotidien sur l\u2019actu IA, les mouvements de capitaux et les workflows utiles.",
    newsletterSocialProof: "Publi\u00e9 pour les op\u00e9rateurs IA",
    chooseNewsletterLang: "Choisir la langue\u00a0:",
    confirm: "Confirmer",
    back: "Retour",

    // Share enhanced
    copyLink: "Copier le lien",
    shareOnX: "Partager sur X",
    shareOnLinkedIn: "Partager sur LinkedIn",

    // FAB Labels
    fabReport: "Rapport IA",
    fabChat: "Chat IA",

    // Report Generator
    reportGenerate: "G\u00e9n\u00e9rer un rapport IA",
    reportTitle: "Rapport IA hebdomadaire",
    reportGenerating: "G\u00e9n\u00e9ration du rapport...",
    reportComplete: "Rapport termin\u00e9\u00a0!",
    reportExportMd: "Markdown",
    reportExportDocx: "Word",
    reportExportHtml: "HTML",
    reportExportTxt: "Texte",
    reportExportJson: "JSON",
    reportExport: "Exporter",
    reportClose: "Fermer",
    reportError: "\u00c9chec de la g\u00e9n\u00e9ration du rapport. Veuillez r\u00e9essayer.",
    reportRegenerate: "Reg\u00e9n\u00e9rer",
  },
  es: {
    // Navigation
    home: "Inicio",
    discover: "Descubrir",
    forager: "Forager",
    settings: "Ajustes",
    categories: "Categor\u00edas",

    // Tabs
    aiTechnology: "Tecnolog\u00eda IA",
    techProgress: "Avances t\u00e9cnicos",
    investments: "Inversiones",
    marketFunding: "Mercado y financiaci\u00f3n",
    practicalTips: "Consejos pr\u00e1cticos",
    handsOnAI: "IA en la pr\u00e1ctica",
    technology: "Tecnolog\u00eda",
    tips: "Consejos",

    // Week Navigation
    weekOverview: "Resumen semanal",
    week: "S",
    current: "Actual",

    // Tech Feed
    aiTechProgress: "Avances en tecnolog\u00eda IA",
    importantDevThisWeek: "Los avances t\u00e9cnicos m\u00e1s importantes",
    impact: "Impacto",
    source: "Fuente",

    // Impact levels
    critical: "Cr\u00edtico",
    high: "Alto",
    medium: "Medio",
    low: "Bajo",

    // Investment Feed
    aiInvestments: "Inversiones en IA",
    fundingNewsMA: "Rondas de financiaci\u00f3n, noticias burs\u00e1tiles y fusiones y adquisiciones",
    primaryMarket: "Mercado primario",
    secondaryMarket: "Mercado secundario",
    volume: "Volumen",
    valuation: "Valoraci\u00f3n",
    marketCap: "Capitalizaci\u00f3n burs\u00e1til",
    acquisition: "Adquisici\u00f3n",
    acquirer: "Adquirente",
    target: "Objetivo",
    dealValue: "Valor del acuerdo",

    // Investment Filters
    filterAll: "Todos",
    filterEarly: "Temprana",
    filterSeriesA: "Serie A",
    filterSeriesB: "Serie B",
    filterSeriesCPlus: "Serie C+",
    filterLatePE: "Tard\u00eda/PE",
    filterByRound: "Filtrar por ronda",

    // Tips Feed
    practicalTipsTitle: "Consejos pr\u00e1cticos",
    handsOnTipsFrom: "Consejos pr\u00e1cticos de IA de X y Reddit",
    beginner: "Principiante",
    intermediate: "Intermedio",
    advanced: "Avanzado",

    // Right Sidebar
    search: "Buscar",
    whatsNew: "\u00bfQu\u00e9 hay de nuevo?",
    posts: "publicaciones",
    team: "Equipo Forager",
    follow: "Seguir",
    showMore: "Mostrar m\u00e1s",

    // Footer
    termsOfService: "T\u00e9rminos de servicio",
    privacy: "Privacidad",
    cookiePolicy: "Pol\u00edtica de cookies",
    imprint: "Aviso legal",
    accessibility: "Accesibilidad",

    // Settings
    darkMode: "Modo oscuro",
    lightMode: "Modo claro",
    switchToDark: "Cambiar a modo oscuro",
    switchToLight: "Cambiar a modo claro",
    language: "Idioma",
    german: "Deutsch",
    english: "English",
    switchToGerman: "Cambiar a alem\u00e1n",
    switchToEnglish: "Cambiar a ingl\u00e9s",

    // Share
    share: "Compartir",
    copiedToClipboard: "Copiado al portapapeles",

    // Timestamps
    hoursAgo: "hace {n}h",
    dayAgo: "hace 1 d\u00eda",
    daysAgo: "hace {n} d\u00edas",

    // Chat Widget
    chatTitle: "Asistente IA",
    chatWelcome: "\u00a1Hola! Puedo ayudarte a entender las noticias de IA de esta semana. \u00a1Hazme una pregunta!",
    chatPlaceholder: "Haz una pregunta...",
    chatThinking: "Pensando...",
    chatError: "Error al cargar. Int\u00e9ntalo de nuevo.",
    chatTimeout: "Tiempo de espera agotado. Int\u00e9ntalo de nuevo.",
    chatClear: "Nueva conversaci\u00f3n",
    chatSuggest1: "Resume esta semana",
    chatSuggest2: "\u00bfCu\u00e1les son las mejores inversiones?",
    chatSuggest3: "\u00bfQu\u00e9 tendencias son importantes?",

    // Period/Daily
    noDataForThisPeriod: "No hay datos disponibles para este per\u00edodo.",

    // Video
    video: "V\u00eddeo",
    playVideo: "Reproducir v\u00eddeo",
    views: "vistas",
    duration: "Duraci\u00f3n",

    // Newsletter
    newsletter: "Bolet\u00edn",
    newsletterHeading: "Las se\u00f1ales que importan",
    emailPlaceholder: "Correo electr\u00f3nico",
    subscribe: "Suscribirse gratis",
    subscribed: "\u00a1Suscrito!",
    subscribeError: "Error en la suscripci\u00f3n. Int\u00e9ntalo de nuevo.",
    newsletterDescription: "Un memo diario sobre noticias de IA, movimientos de capital y flujos de trabajo pr\u00e1cticos.",
    newsletterSocialProof: "Publicado para operadores de IA",
    chooseNewsletterLang: "Elegir idioma:",
    confirm: "Confirmar",
    back: "Volver",

    // Share enhanced
    copyLink: "Copiar enlace",
    shareOnX: "Compartir en X",
    shareOnLinkedIn: "Compartir en LinkedIn",

    // FAB Labels
    fabReport: "Informe IA",
    fabChat: "Chat IA",

    // Report Generator
    reportGenerate: "Generar informe IA",
    reportTitle: "Informe semanal de IA",
    reportGenerating: "Generando informe...",
    reportComplete: "\u00a1Informe completado!",
    reportExportMd: "Markdown",
    reportExportDocx: "Word",
    reportExportHtml: "HTML",
    reportExportTxt: "Texto",
    reportExportJson: "JSON",
    reportExport: "Exportar",
    reportClose: "Cerrar",
    reportError: "Error al generar el informe. Int\u00e9ntalo de nuevo.",
    reportRegenerate: "Regenerar",
  },
  pt: {
    // Navigation
    home: "In\u00edcio",
    discover: "Descobrir",
    forager: "Forager",
    settings: "Configura\u00e7\u00f5es",
    categories: "Categorias",

    // Tabs
    aiTechnology: "Tecnologia IA",
    techProgress: "Avan\u00e7os t\u00e9cnicos",
    investments: "Investimentos",
    marketFunding: "Mercado e financiamento",
    practicalTips: "Dicas pr\u00e1ticas",
    handsOnAI: "IA na pr\u00e1tica",
    technology: "Tecnologia",
    tips: "Dicas",

    // Week Navigation
    weekOverview: "Resumo semanal",
    week: "S",
    current: "Atual",

    // Tech Feed
    aiTechProgress: "Avan\u00e7os em tecnologia IA",
    importantDevThisWeek: "Os desenvolvimentos t\u00e9cnicos mais importantes",
    impact: "Impacto",
    source: "Fonte",

    // Impact levels
    critical: "Cr\u00edtico",
    high: "Alto",
    medium: "M\u00e9dio",
    low: "Baixo",

    // Investment Feed
    aiInvestments: "Investimentos em IA",
    fundingNewsMA: "Rodadas de financiamento, not\u00edcias do mercado e fus\u00f5es e aquisi\u00e7\u00f5es",
    primaryMarket: "Mercado prim\u00e1rio",
    secondaryMarket: "Mercado secund\u00e1rio",
    volume: "Volume",
    valuation: "Avalia\u00e7\u00e3o",
    marketCap: "Capitaliza\u00e7\u00e3o de mercado",
    acquisition: "Aquisi\u00e7\u00e3o",
    acquirer: "Adquirente",
    target: "Alvo",
    dealValue: "Valor do neg\u00f3cio",

    // Investment Filters
    filterAll: "Todos",
    filterEarly: "Inicial",
    filterSeriesA: "S\u00e9rie A",
    filterSeriesB: "S\u00e9rie B",
    filterSeriesCPlus: "S\u00e9rie C+",
    filterLatePE: "Tardio/PE",
    filterByRound: "Filtrar por rodada",

    // Tips Feed
    practicalTipsTitle: "Dicas pr\u00e1ticas",
    handsOnTipsFrom: "Dicas pr\u00e1ticas de IA do X e Reddit",
    beginner: "Iniciante",
    intermediate: "Intermedi\u00e1rio",
    advanced: "Avan\u00e7ado",

    // Right Sidebar
    search: "Pesquisar",
    whatsNew: "O que h\u00e1 de novo?",
    posts: "publica\u00e7\u00f5es",
    team: "Equipe Forager",
    follow: "Seguir",
    showMore: "Mostrar mais",

    // Footer
    termsOfService: "Termos de servi\u00e7o",
    privacy: "Privacidade",
    cookiePolicy: "Pol\u00edtica de cookies",
    imprint: "Aviso legal",
    accessibility: "Acessibilidade",

    // Settings
    darkMode: "Modo escuro",
    lightMode: "Modo claro",
    switchToDark: "Mudar para modo escuro",
    switchToLight: "Mudar para modo claro",
    language: "Idioma",
    german: "Deutsch",
    english: "English",
    switchToGerman: "Mudar para alem\u00e3o",
    switchToEnglish: "Mudar para ingl\u00eas",

    // Share
    share: "Compartilhar",
    copiedToClipboard: "Copiado para a \u00e1rea de transfer\u00eancia",

    // Timestamps
    hoursAgo: "h\u00e1 {n}h",
    dayAgo: "h\u00e1 1 dia",
    daysAgo: "h\u00e1 {n} dias",

    // Chat Widget
    chatTitle: "Assistente IA",
    chatWelcome: "Ol\u00e1! Posso ajudar voc\u00ea a entender as not\u00edcias de IA desta semana. Fa\u00e7a uma pergunta!",
    chatPlaceholder: "Fa\u00e7a uma pergunta...",
    chatThinking: "Pensando...",
    chatError: "Falha ao carregar. Tente novamente.",
    chatTimeout: "Tempo esgotado. Tente novamente.",
    chatClear: "Nova conversa",
    chatSuggest1: "Resumir esta semana",
    chatSuggest2: "Quais s\u00e3o os principais investimentos?",
    chatSuggest3: "Quais tend\u00eancias s\u00e3o importantes?",

    // Period/Daily
    noDataForThisPeriod: "Sem dados dispon\u00edveis para este per\u00edodo.",

    // Video
    video: "V\u00eddeo",
    playVideo: "Reproduzir v\u00eddeo",
    views: "visualiza\u00e7\u00f5es",
    duration: "Dura\u00e7\u00e3o",

    // Newsletter
    newsletter: "Newsletter",
    newsletterHeading: "Os sinais que importam",
    emailPlaceholder: "Endere\u00e7o de e-mail",
    subscribe: "Assinar gratuitamente",
    subscribed: "Inscrito!",
    subscribeError: "Falha na assinatura. Tente novamente.",
    newsletterDescription: "Um memo di\u00e1rio sobre not\u00edcias de IA, movimentos de capital e workflows pr\u00e1ticos.",
    newsletterSocialProof: "Publicado para operadores de IA",
    chooseNewsletterLang: "Escolher idioma:",
    confirm: "Confirmar",
    back: "Voltar",

    // Share enhanced
    copyLink: "Copiar link",
    shareOnX: "Compartilhar no X",
    shareOnLinkedIn: "Compartilhar no LinkedIn",

    // FAB Labels
    fabReport: "Relat\u00f3rio IA",
    fabChat: "Chat IA",

    // Report Generator
    reportGenerate: "Gerar relat\u00f3rio IA",
    reportTitle: "Relat\u00f3rio semanal de IA",
    reportGenerating: "Gerando relat\u00f3rio...",
    reportComplete: "Relat\u00f3rio conclu\u00eddo!",
    reportExportMd: "Markdown",
    reportExportDocx: "Word",
    reportExportHtml: "HTML",
    reportExportTxt: "Texto",
    reportExportJson: "JSON",
    reportExport: "Exportar",
    reportClose: "Fechar",
    reportError: "Falha ao gerar o relat\u00f3rio. Tente novamente.",
    reportRegenerate: "Regenerar",
  },
  ja: {
    // Navigation
    home: "\u30db\u30fc\u30e0",
    discover: "\u767a\u898b",
    forager: "Forager",
    settings: "\u8a2d\u5b9a",
    categories: "\u30ab\u30c6\u30b4\u30ea\u30fc",

    // Tabs
    aiTechnology: "AI \u30c6\u30af\u30ce\u30ed\u30b8\u30fc",
    techProgress: "\u6280\u8853\u306e\u9032\u5c55",
    investments: "\u6295\u8cc7",
    marketFunding: "\u5e02\u5834\u3068\u8cc7\u91d1\u8abf\u9054",
    practicalTips: "\u5b9f\u8df5\u30c6\u30a3\u30c3\u30d7\u30b9",
    handsOnAI: "AI \u30cf\u30f3\u30ba\u30aa\u30f3",
    technology: "\u30c6\u30af\u30ce\u30ed\u30b8\u30fc",
    tips: "\u30c6\u30a3\u30c3\u30d7\u30b9",

    // Week Navigation
    weekOverview: "\u9031\u9593\u6982\u8981",
    week: "\u9031",
    current: "\u73fe\u5728",

    // Tech Feed
    aiTechProgress: "AI \u6280\u8853\u306e\u9032\u5c55",
    importantDevThisWeek: "\u6700\u3082\u91cd\u8981\u306a\u6280\u8853\u958b\u767a",
    impact: "\u5f71\u97ff\u5ea6",
    source: "\u30bd\u30fc\u30b9",

    // Impact levels
    critical: "\u91cd\u5927",
    high: "\u9ad8",
    medium: "\u4e2d",
    low: "\u4f4e",

    // Investment Feed
    aiInvestments: "AI \u6295\u8cc7",
    fundingNewsMA: "\u8cc7\u91d1\u8abf\u9054\u30e9\u30a6\u30f3\u30c9\u3001\u682a\u5f0f\u30cb\u30e5\u30fc\u30b9\u3001M&A\u6d3b\u52d5",
    primaryMarket: "\u30d7\u30e9\u30a4\u30de\u30ea\u30fc\u30de\u30fc\u30b1\u30c3\u30c8",
    secondaryMarket: "\u30bb\u30ab\u30f3\u30c0\u30ea\u30fc\u30de\u30fc\u30b1\u30c3\u30c8",
    volume: "\u898f\u6a21",
    valuation: "\u8a55\u4fa1\u984d",
    marketCap: "\u6642\u4fa1\u7dcf\u984d",
    acquisition: "\u8cb7\u53ce",
    acquirer: "\u8cb7\u53ce\u8005",
    target: "\u30bf\u30fc\u30b2\u30c3\u30c8",
    dealValue: "\u53d6\u5f15\u984d",

    // Investment Filters
    filterAll: "\u3059\u3079\u3066",
    filterEarly: "\u30a2\u30fc\u30ea\u30fc",
    filterSeriesA: "\u30b7\u30ea\u30fc\u30baA",
    filterSeriesB: "\u30b7\u30ea\u30fc\u30baB",
    filterSeriesCPlus: "\u30b7\u30ea\u30fc\u30baC+",
    filterLatePE: "\u30ec\u30a4\u30c8/PE",
    filterByRound: "\u30e9\u30a6\u30f3\u30c9\u3067\u7d5e\u308a\u8fbc\u307f",

    // Tips Feed
    practicalTipsTitle: "\u5b9f\u8df5\u30c6\u30a3\u30c3\u30d7\u30b9",
    handsOnTipsFrom: "X \u3068 Reddit \u304b\u3089\u306e\u5b9f\u8df5\u7684\u306aAI\u30c6\u30a3\u30c3\u30d7\u30b9",
    beginner: "\u521d\u7d1a",
    intermediate: "\u4e2d\u7d1a",
    advanced: "\u4e0a\u7d1a",

    // Right Sidebar
    search: "\u691c\u7d22",
    whatsNew: "\u6700\u65b0\u60c5\u5831",
    posts: "\u4ef6",
    team: "Forager \u30c1\u30fc\u30e0",
    follow: "\u30d5\u30a9\u30ed\u30fc",
    showMore: "\u3082\u3063\u3068\u898b\u308b",

    // Footer
    termsOfService: "\u5229\u7528\u898f\u7d04",
    privacy: "\u30d7\u30e9\u30a4\u30d0\u30b7\u30fc",
    cookiePolicy: "Cookie\u30dd\u30ea\u30b7\u30fc",
    imprint: "\u6cd5\u7684\u8868\u793a",
    accessibility: "\u30a2\u30af\u30bb\u30b7\u30d3\u30ea\u30c6\u30a3",

    // Settings
    darkMode: "\u30c0\u30fc\u30af\u30e2\u30fc\u30c9",
    lightMode: "\u30e9\u30a4\u30c8\u30e2\u30fc\u30c9",
    switchToDark: "\u30c0\u30fc\u30af\u30e2\u30fc\u30c9\u306b\u5207\u308a\u66ff\u3048",
    switchToLight: "\u30e9\u30a4\u30c8\u30e2\u30fc\u30c9\u306b\u5207\u308a\u66ff\u3048",
    language: "\u8a00\u8a9e",
    german: "Deutsch",
    english: "English",
    switchToGerman: "\u30c9\u30a4\u30c4\u8a9e\u306b\u5207\u308a\u66ff\u3048",
    switchToEnglish: "\u82f1\u8a9e\u306b\u5207\u308a\u66ff\u3048",

    // Share
    share: "\u5171\u6709",
    copiedToClipboard: "\u30af\u30ea\u30c3\u30d7\u30dc\u30fc\u30c9\u306b\u30b3\u30d4\u30fc\u3057\u307e\u3057\u305f",

    // Timestamps
    hoursAgo: "{n}\u6642\u9593\u524d",
    dayAgo: "1\u65e5\u524d",
    daysAgo: "{n}\u65e5\u524d",

    // Chat Widget
    chatTitle: "AI \u30a2\u30b7\u30b9\u30bf\u30f3\u30c8",
    chatWelcome: "\u3053\u3093\u306b\u3061\u306f\uff01\u4eca\u9031\u306eAI\u30cb\u30e5\u30fc\u30b9\u3092\u7406\u89e3\u3059\u308b\u304a\u624b\u4f1d\u3044\u3092\u3057\u307e\u3059\u3002\u8cea\u554f\u3057\u3066\u304f\u3060\u3055\u3044\uff01",
    chatPlaceholder: "\u8cea\u554f\u3092\u5165\u529b...",
    chatThinking: "\u8003\u3048\u4e2d...",
    chatError: "\u8aad\u307f\u8fbc\u307f\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002\u3082\u3046\u4e00\u5ea6\u304a\u8a66\u3057\u304f\u3060\u3055\u3044\u3002",
    chatTimeout: "\u30bf\u30a4\u30e0\u30a2\u30a6\u30c8\u3057\u307e\u3057\u305f\u3002\u3082\u3046\u4e00\u5ea6\u304a\u8a66\u3057\u304f\u3060\u3055\u3044\u3002",
    chatClear: "\u65b0\u3057\u3044\u4f1a\u8a71",
    chatSuggest1: "\u4eca\u9031\u3092\u307e\u3068\u3081\u3066",
    chatSuggest2: "\u6ce8\u76ee\u306e\u6295\u8cc7\u306f\uff1f",
    chatSuggest3: "\u91cd\u8981\u306a\u30c8\u30ec\u30f3\u30c9\u306f\uff1f",

    // Period/Daily
    noDataForThisPeriod: "\u3053\u306e\u671f\u9593\u306e\u30c7\u30fc\u30bf\u306f\u3042\u308a\u307e\u305b\u3093\u3002",

    // Video
    video: "\u52d5\u753b",
    playVideo: "\u52d5\u753b\u3092\u518d\u751f",
    views: "\u56de\u8996\u8074",
    duration: "\u518d\u751f\u6642\u9593",

    // Newsletter
    newsletter: "\u30cb\u30e5\u30fc\u30b9\u30ec\u30bf\u30fc",
    newsletterHeading: "\u91cd\u8981\u306aAI\u30b7\u30b0\u30ca\u30eb",
    emailPlaceholder: "\u30e1\u30fc\u30eb\u30a2\u30c9\u30ec\u30b9",
    subscribe: "\u7121\u6599\u3067\u8cfc\u8aad",
    subscribed: "\u8cfc\u8aad\u5b8c\u4e86\uff01",
    subscribeError: "\u8cfc\u8aad\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002\u3082\u3046\u4e00\u5ea6\u304a\u8a66\u3057\u304f\u3060\u3055\u3044\u3002",
    newsletterDescription: "AI\u30cb\u30e5\u30fc\u30b9\u3001\u8cc7\u672c\u306e\u52d5\u304d\u3001\u5b9f\u7528\u30ef\u30fc\u30af\u30d5\u30ed\u30fc\u3092\u6bce\u65e5\u5c4a\u3051\u308b\u60c5\u5831\u30e1\u30e2\u3002",
    newsletterSocialProof: "AI\u5b9f\u52d9\u8005\u306e\u305f\u3081\u306b\u7de8\u96c6",
    chooseNewsletterLang: "\u8a00\u8a9e\u3092\u9078\u629e\uff1a",
    confirm: "\u78ba\u8a8d",
    back: "\u623b\u308b",

    // Share enhanced
    copyLink: "\u30ea\u30f3\u30af\u3092\u30b3\u30d4\u30fc",
    shareOnX: "X\u3067\u5171\u6709",
    shareOnLinkedIn: "LinkedIn\u3067\u5171\u6709",

    // FAB Labels
    fabReport: "AI\u30ec\u30dd\u30fc\u30c8",
    fabChat: "AI\u30c1\u30e3\u30c3\u30c8",

    // Report Generator
    reportGenerate: "AI\u30ec\u30dd\u30fc\u30c8\u3092\u751f\u6210",
    reportTitle: "AI\u9031\u9593\u30ec\u30dd\u30fc\u30c8",
    reportGenerating: "\u30ec\u30dd\u30fc\u30c8\u3092\u751f\u6210\u4e2d...",
    reportComplete: "\u30ec\u30dd\u30fc\u30c8\u5b8c\u6210\uff01",
    reportExportMd: "Markdown",
    reportExportDocx: "Word",
    reportExportHtml: "HTML",
    reportExportTxt: "\u30c6\u30ad\u30b9\u30c8",
    reportExportJson: "JSON",
    reportExport: "\u30a8\u30af\u30b9\u30dd\u30fc\u30c8",
    reportClose: "\u9589\u3058\u308b",
    reportError: "\u30ec\u30dd\u30fc\u30c8\u306e\u751f\u6210\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002\u3082\u3046\u4e00\u5ea6\u304a\u8a66\u3057\u304f\u3060\u3055\u3044\u3002",
    reportRegenerate: "\u518d\u751f\u6210",
  },
  ko: {
    // Navigation
    home: "\ud648",
    discover: "\ud0d0\uc0c9",
    forager: "Forager",
    settings: "\uc124\uc815",
    categories: "\uce74\ud14c\uace0\ub9ac",

    // Tabs
    aiTechnology: "AI \uae30\uc220",
    techProgress: "\uae30\uc220 \uc9c4\ud589",
    investments: "\ud22c\uc790",
    marketFunding: "\uc2dc\uc7a5 & \ud380\ub529",
    practicalTips: "\uc2e4\uc6a9 \ud301",
    handsOnAI: "AI \uc2e4\uc2b5",
    technology: "\uae30\uc220",
    tips: "\ud301",

    // Week Navigation
    weekOverview: "\uc8fc\uac04 \uac1c\uc694",
    week: "\uc8fc",
    current: "\ud604\uc7ac",

    // Tech Feed
    aiTechProgress: "AI \uae30\uc220 \uc9c4\ud589",
    importantDevThisWeek: "\uac00\uc7a5 \uc911\uc694\ud55c \uae30\uc220 \ubc1c\uc804",
    impact: "\uc601\ud5a5\ub3c4",
    source: "\ucd9c\ucc98",

    // Impact levels
    critical: "\uc911\ub300",
    high: "\ub192\uc74c",
    medium: "\ubcf4\ud1b5",
    low: "\ub0ae\uc74c",

    // Investment Feed
    aiInvestments: "AI \ud22c\uc790",
    fundingNewsMA: "\ud380\ub529 \ub77c\uc6b4\ub4dc, \uc8fc\uc2dd \ub274\uc2a4 \ubc0f M&A \ud65c\ub3d9",
    primaryMarket: "\ubc1c\ud589 \uc2dc\uc7a5",
    secondaryMarket: "\uc720\ud1b5 \uc2dc\uc7a5",
    volume: "\uaddc\ubaa8",
    valuation: "\uae30\uc5c5\uac00\uce58",
    marketCap: "\uc2dc\uac00\ucd1d\uc561",
    acquisition: "\uc778\uc218",
    acquirer: "\uc778\uc218\uc790",
    target: "\ub300\uc0c1",
    dealValue: "\uac70\ub798\uc561",

    // Investment Filters
    filterAll: "\uc804\uccb4",
    filterEarly: "\ucd08\uae30",
    filterSeriesA: "\uc2dc\ub9ac\uc988A",
    filterSeriesB: "\uc2dc\ub9ac\uc988B",
    filterSeriesCPlus: "\uc2dc\ub9ac\uc988C+",
    filterLatePE: "\ud6c4\uae30/PE",
    filterByRound: "\ub77c\uc6b4\ub4dc\ub85c \ud544\ud130",

    // Tips Feed
    practicalTipsTitle: "\uc2e4\uc6a9 \ud301",
    handsOnTipsFrom: "X\uc640 Reddit\uc758 \uc2e4\uc6a9\uc801\uc778 AI \ud301",
    beginner: "\ucd08\uae09",
    intermediate: "\uc911\uae09",
    advanced: "\uace0\uae09",

    // Right Sidebar
    search: "\uac80\uc0c9",
    whatsNew: "\uc5b4\ub5a4 \uc18c\uc2dd\uc774 \uc788\ub098\uc694?",
    posts: "\uac1c \uac8c\uc2dc\ubb3c",
    team: "Forager \ud300",
    follow: "\ud314\ub85c\uc6b0",
    showMore: "\ub354 \ubcf4\uae30",

    // Footer
    termsOfService: "\uc774\uc6a9 \uc57d\uad00",
    privacy: "\uac1c\uc778\uc815\ubcf4\ucc98\ub9ac\ubc29\uce68",
    cookiePolicy: "\ucfe0\ud0a4 \uc815\ucc45",
    imprint: "\ubc95\uc801 \uace0\uc9c0",
    accessibility: "\uc811\uadfc\uc131",

    // Settings
    darkMode: "\ub2e4\ud06c \ubaa8\ub4dc",
    lightMode: "\ub77c\uc774\ud2b8 \ubaa8\ub4dc",
    switchToDark: "\ub2e4\ud06c \ubaa8\ub4dc\ub85c \uc804\ud658",
    switchToLight: "\ub77c\uc774\ud2b8 \ubaa8\ub4dc\ub85c \uc804\ud658",
    language: "\uc5b8\uc5b4",
    german: "Deutsch",
    english: "English",
    switchToGerman: "\ub3c5\uc77c\uc5b4\ub85c \uc804\ud658",
    switchToEnglish: "\uc601\uc5b4\ub85c \uc804\ud658",

    // Share
    share: "\uacf5\uc720",
    copiedToClipboard: "\ud074\ub9bd\ubcf4\ub4dc\uc5d0 \ubcf5\uc0ac\ub428",

    // Timestamps
    hoursAgo: "{n}\uc2dc\uac04 \uc804",
    dayAgo: "1\uc77c \uc804",
    daysAgo: "{n}\uc77c \uc804",

    // Chat Widget
    chatTitle: "AI \uc5b4\uc2dc\uc2a4\ud134\ud2b8",
    chatWelcome: "\uc548\ub155\ud558\uc138\uc694! \uc774\ubc88 \uc8fc AI \ub274\uc2a4\ub97c \uc774\ud574\ud558\ub294 \ub370 \ub3c4\uc6c0\uc744 \ub4dc\ub9b4\uac8c\uc694. \uc9c8\ubb38\ud574 \uc8fc\uc138\uc694!",
    chatPlaceholder: "\uc9c8\ubb38\uc744 \uc785\ub825\ud558\uc138\uc694...",
    chatThinking: "\uc0dd\uac01 \uc911...",
    chatError: "\ub85c\ub4dc\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.",
    chatTimeout: "\uc694\uccad \uc2dc\uac04\uc774 \ucd08\uacfc\ub418\uc5c8\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.",
    chatClear: "\uc0c8 \ub300\ud654",
    chatSuggest1: "\uc774\ubc88 \uc8fc \uc694\uc57d",
    chatSuggest2: "\uc8fc\uc694 \ud22c\uc790\ub294?",
    chatSuggest3: "\uc911\uc694\ud55c \ud2b8\ub80c\ub4dc\ub294?",

    // Period/Daily
    noDataForThisPeriod: "\uc774 \uae30\uac04\uc5d0 \ub300\ud55c \ub370\uc774\ud130\uac00 \uc5c6\uc2b5\ub2c8\ub2e4.",

    // Video
    video: "\ub3d9\uc601\uc0c1",
    playVideo: "\ub3d9\uc601\uc0c1 \uc7ac\uc0dd",
    views: "\uc870\ud68c",
    duration: "\uc7ac\uc0dd \uc2dc\uac04",

    // Newsletter
    newsletter: "\ub274\uc2a4\ub808\ud130",
    newsletterHeading: "\uc911\uc694\ud55c AI \uc2e0\ud638",
    emailPlaceholder: "\uc774\uba54\uc77c \uc8fc\uc18c",
    subscribe: "\ubb34\ub8cc \uad6c\ub3c5",
    subscribed: "\uad6c\ub3c5 \uc644\ub8cc!",
    subscribeError: "\uad6c\ub3c5\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.",
    newsletterDescription: "AI \ub274\uc2a4, \uc790\ubcf8 \ud750\ub984, \uc2e4\uc804 \uc6cc\ud06c\ud50c\ub85c\ub97c \ub2e4\ub8e8\ub294 \ub9e4\uc77c \uc778\ud154\ub9ac\uc804\uc2a4 \uba54\ubaa8.",
    newsletterSocialProof: "AI \uc2e4\ubb34\uc790\ub97c \uc704\ud574 \ud3b8\uc9d1",
    chooseNewsletterLang: "\uc5b8\uc5b4 \uc120\ud0dd:",
    confirm: "\ud655\uc778",
    back: "\ub4a4\ub85c",

    // Share enhanced
    copyLink: "\ub9c1\ud06c \ubcf5\uc0ac",
    shareOnX: "X\uc5d0 \uacf5\uc720",
    shareOnLinkedIn: "LinkedIn\uc5d0 \uacf5\uc720",

    // FAB Labels
    fabReport: "AI \ub9ac\ud3ec\ud2b8",
    fabChat: "AI \ucc44\ud305",

    // Report Generator
    reportGenerate: "AI \ub9ac\ud3ec\ud2b8 \uc0dd\uc131",
    reportTitle: "AI \uc8fc\uac04 \ub9ac\ud3ec\ud2b8",
    reportGenerating: "\ub9ac\ud3ec\ud2b8 \uc0dd\uc131 \uc911...",
    reportComplete: "\ub9ac\ud3ec\ud2b8 \uc644\ub8cc!",
    reportExportMd: "Markdown",
    reportExportDocx: "Word",
    reportExportHtml: "HTML",
    reportExportTxt: "\ud14d\uc2a4\ud2b8",
    reportExportJson: "JSON",
    reportExport: "\ub0b4\ubcf4\ub0b4\uae30",
    reportClose: "\ub2eb\uae30",
    reportError: "\ub9ac\ud3ec\ud2b8 \uc0dd\uc131\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.",
    reportRegenerate: "\uc7ac\uc0dd\uc131",
  },
} as const;

export type TranslationKey = keyof typeof translations.de;
