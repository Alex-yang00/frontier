"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Cpu,
  TrendingUp,
  Lightbulb,
  Youtube,
  ArrowRight,
  Zap,
} from "lucide-react";
import { ForagerMark } from "@/components/forager-mark";

const LANG_OPTIONS = [
  { code: "de", nativeName: "DE" },
  { code: "en", nativeName: "EN" },
  { code: "zh", nativeName: "\u4e2d\u6587" },
  { code: "fr", nativeName: "FR" },
  { code: "es", nativeName: "ES" },
  { code: "pt", nativeName: "PT" },
  { code: "ja", nativeName: "\u65e5\u672c\u8a9e" },
  { code: "ko", nativeName: "\ud55c\uad6d\uc5b4" },
] as const;

type LoginLanguage = (typeof LANG_OPTIONS)[number]["code"];

const translations: Record<LoginLanguage, {
  badge: string;
  title1: string;
  title2: string;
  tagline: string;
  features: string[];
  aiPipeline: string;
  aiProcess: string;
  sourceCategories: string[];
  welcome: string;
  enterCredentials: string;
  enter: string;
  newsletterPitch: string;
  emailPlaceholder: string;
}> = {
  de: {
    badge: "KI-gest\u00fctzte Intelligenz",
    title1: "Forager",
    title2: "AI Hub",
    tagline:
      "Ihr intelligentes Gateway zu kuratierten KI-Nachrichten, Investment-Insights und praktischen Tipps \u2013 t\u00e4glich von KI analysiert und kuratiert.",
    features: [
      "Tech-Durchbr\u00fcche",
      "Investment-News",
      "Praktische Tipps",
      "KI-Videos",
    ],
    aiPipeline: "35+ Quellen t\u00e4glich",
    aiProcess: "KI-kuratiert zu den wichtigsten Insights",
    sourceCategories: [
      "MIT Tech Review",
      "Crunchbase",
      "Financial Times",
      "YouTube",
      "Reddit",
      "& 30+ mehr",
    ],
    welcome: "Willkommen",
    enterCredentials: "Entdecken Sie die neuesten KI-Trends und Insights",
    enter: "Eintreten",
    newsletterPitch: "Erhalte t\u00e4glich KI-News in 3 Minuten \u2014 kostenlos",
    emailPlaceholder: "E-Mail-Adresse",
  },
  en: {
    badge: "AI-Powered Intelligence",
    title1: "Forager",
    title2: "AI Hub",
    tagline:
      "Your intelligent gateway to curated AI news, investment insights, and practical tips \u2013 analyzed daily by AI.",
    features: [
      "Tech Breakthroughs",
      "Investment News",
      "Practical Tips",
      "AI Videos",
    ],
    aiPipeline: "35+ sources daily",
    aiProcess: "AI-curated to key insights",
    sourceCategories: [
      "MIT Tech Review",
      "Crunchbase",
      "Financial Times",
      "YouTube",
      "Reddit",
      "& 30+ more",
    ],
    welcome: "Welcome",
    enterCredentials: "Discover the latest AI trends and insights",
    enter: "Enter",
    newsletterPitch: "Get daily AI news in 3 minutes \u2014 free",
    emailPlaceholder: "Email address",
  },
  zh: {
    badge: "AI \u667a\u80fd\u9a71\u52a8",
    title1: "Forager",
    title2: "AI Hub",
    tagline:
      "\u60a8\u7684\u667a\u80fd\u5165\u53e3\uff0c\u83b7\u53d6\u7cbe\u9009 AI \u65b0\u95fb\u3001\u6295\u8d44\u6d1e\u5bdf\u548c\u5b9e\u7528\u6280\u5de7 \u2013 \u6bcf\u65e5\u7531 AI \u5206\u6790\u548c\u7b5b\u9009\u3002",
    features: ["\u6280\u672f\u7a81\u7834", "\u6295\u8d44\u65b0\u95fb", "\u5b9e\u7528\u6280\u5de7", "AI \u89c6\u9891"],
    aiPipeline: "\u6bcf\u65e5 35+ \u6765\u6e90",
    aiProcess: "AI \u7cbe\u9009\u5173\u952e\u6d1e\u5bdf",
    sourceCategories: [
      "MIT Tech Review",
      "Crunchbase",
      "Financial Times",
      "YouTube",
      "Reddit",
      "& 30+ \u66f4\u591a",
    ],
    welcome: "\u6b22\u8fce",
    enterCredentials: "\u53d1\u73b0\u6700\u65b0\u7684 AI \u8d8b\u52bf\u548c\u6d1e\u5bdf",
    enter: "\u8fdb\u5165",
    newsletterPitch: "\u6bcf\u65e5 3 \u5206\u949f\u638c\u63e1 AI \u65b0\u95fb \u2014 \u514d\u8d39",
    emailPlaceholder: "\u7535\u5b50\u90ae\u7bb1\u5730\u5740",
  },
  fr: {
    badge: "Intelligence aliment\u00e9e par l\u2019IA",
    title1: "Forager",
    title2: "AI Hub",
    tagline:
      "Votre passerelle intelligente vers l\u2019actu IA, les investissements et les astuces pratiques \u2013 analys\u00e9e quotidiennement par l\u2019IA.",
    features: [
      "Perc\u00e9es tech",
      "Investissements",
      "Astuces pratiques",
      "Vid\u00e9os IA",
    ],
    aiPipeline: "35+ sources par jour",
    aiProcess: "S\u00e9lection IA des insights cl\u00e9s",
    sourceCategories: [
      "MIT Tech Review",
      "Crunchbase",
      "Financial Times",
      "YouTube",
      "Reddit",
      "& 30+ autres",
    ],
    welcome: "Bienvenue",
    enterCredentials: "D\u00e9couvrez les derni\u00e8res tendances et insights IA",
    enter: "Entrer",
    newsletterPitch: "Recevez l\u2019actu IA en 3 minutes \u2014 gratuit",
    emailPlaceholder: "Adresse e-mail",
  },
  es: {
    badge: "Inteligencia impulsada por IA",
    title1: "Forager",
    title2: "AI Hub",
    tagline:
      "Tu puerta inteligente a noticias de IA curadas, insights de inversi\u00f3n y consejos pr\u00e1cticos \u2013 analizado diariamente por IA.",
    features: [
      "Avances tech",
      "Inversiones",
      "Consejos pr\u00e1cticos",
      "V\u00eddeos IA",
    ],
    aiPipeline: "35+ fuentes diarias",
    aiProcess: "IA selecciona insights clave",
    sourceCategories: [
      "MIT Tech Review",
      "Crunchbase",
      "Financial Times",
      "YouTube",
      "Reddit",
      "& 30+ m\u00e1s",
    ],
    welcome: "Bienvenido",
    enterCredentials: "Descubre las \u00faltimas tendencias e insights de IA",
    enter: "Entrar",
    newsletterPitch: "Recibe noticias de IA en 3 minutos \u2014 gratis",
    emailPlaceholder: "Correo electr\u00f3nico",
  },
  pt: {
    badge: "Intelig\u00eancia impulsionada por IA",
    title1: "Forager",
    title2: "AI Hub",
    tagline:
      "Seu portal inteligente para not\u00edcias de IA curadas, insights de investimento e dicas pr\u00e1ticas \u2013 analisado diariamente por IA.",
    features: [
      "Avan\u00e7os tech",
      "Investimentos",
      "Dicas pr\u00e1ticas",
      "V\u00eddeos IA",
    ],
    aiPipeline: "35+ fontes di\u00e1rias",
    aiProcess: "IA seleciona insights principais",
    sourceCategories: [
      "MIT Tech Review",
      "Crunchbase",
      "Financial Times",
      "YouTube",
      "Reddit",
      "& 30+ mais",
    ],
    welcome: "Bem-vindo",
    enterCredentials: "Descubra as \u00faltimas tend\u00eancias e insights de IA",
    enter: "Entrar",
    newsletterPitch: "Receba not\u00edcias de IA em 3 minutos \u2014 gr\u00e1tis",
    emailPlaceholder: "Endere\u00e7o de e-mail",
  },
  ja: {
    badge: "AI\u99c6\u52d5\u306e\u30a4\u30f3\u30c6\u30ea\u30b8\u30a7\u30f3\u30b9",
    title1: "Forager",
    title2: "AI Hub",
    tagline:
      "\u53b3\u9078\u3055\u308c\u305fAI\u30cb\u30e5\u30fc\u30b9\u3001\u6295\u8cc7\u30a4\u30f3\u30b5\u30a4\u30c8\u3001\u5b9f\u8df5\u7684\u306a\u30c6\u30a3\u30c3\u30d7\u30b9\u3078\u306e\u30b9\u30de\u30fc\u30c8\u306a\u30b2\u30fc\u30c8\u30a6\u30a7\u30a4 \u2013 AI\u304c\u6bce\u65e5\u5206\u6790\u30fb\u53b3\u9078\u3002",
    features: ["\u6280\u8853\u7a81\u7834", "\u6295\u8cc7\u30cb\u30e5\u30fc\u30b9", "\u5b9f\u8df5\u30c6\u30a3\u30c3\u30d7\u30b9", "AI\u52d5\u753b"],
    aiPipeline: "\u6bce\u65e540\u4ee5\u4e0a\u306e\u30bd\u30fc\u30b9",
    aiProcess: "AI\u304c\u91cd\u8981\u306a\u30a4\u30f3\u30b5\u30a4\u30c8\u3092\u53b3\u9078",
    sourceCategories: [
      "MIT Tech Review",
      "Crunchbase",
      "Financial Times",
      "YouTube",
      "Reddit",
      "& 30+ \u4ee5\u4e0a",
    ],
    welcome: "\u3088\u3046\u3053\u305d",
    enterCredentials: "\u6700\u65b0\u306eAI\u30c8\u30ec\u30f3\u30c9\u3068\u30a4\u30f3\u30b5\u30a4\u30c8\u3092\u767a\u898b",
    enter: "\u5165\u308b",
    newsletterPitch: "AI\u30cb\u30e5\u30fc\u30b9\u30923\u5206\u3067 \u2014 \u7121\u6599",
    emailPlaceholder: "\u30e1\u30fc\u30eb\u30a2\u30c9\u30ec\u30b9",
  },
  ko: {
    badge: "AI \uae30\ubc18 \uc778\ud154\ub9ac\uc804\uc2a4",
    title1: "Forager",
    title2: "AI Hub",
    tagline:
      "\uc5c4\uc120\ub41c AI \ub274\uc2a4, \ud22c\uc790 \uc778\uc0ac\uc774\ud2b8, \uc2e4\uc6a9\uc801\uc778 \ud301\uc73c\ub85c \uac00\ub294 \uc2a4\ub9c8\ud2b8 \uac8c\uc774\ud2b8\uc6e8\uc774 \u2013 \ub9e4\uc77c AI\uac00 \ubd84\uc11d\u00b7\uc5c4\uc120.",
    features: ["\uae30\uc220 \ub3cc\ud30c\uad6c", "\ud22c\uc790 \ub274\uc2a4", "\uc2e4\uc6a9 \ud301", "AI \ub3d9\uc601\uc0c1"],
    aiPipeline: "\ub9e4\uc77c 35+ \uc18c\uc2a4",
    aiProcess: "AI\uac00 \ud575\uc2ec \uc778\uc0ac\uc774\ud2b8 \uc5c4\uc120",
    sourceCategories: [
      "MIT Tech Review",
      "Crunchbase",
      "Financial Times",
      "YouTube",
      "Reddit",
      "& 30+ \ub354",
    ],
    welcome: "\ud658\uc601\ud569\ub2c8\ub2e4",
    enterCredentials: "\ucd5c\uc2e0 AI \ud2b8\ub80c\ub4dc\uc640 \uc778\uc0ac\uc774\ud2b8\ub97c \ubc1c\uacac\ud558\uc138\uc694",
    enter: "\uc785\uc7a5",
    newsletterPitch: "3\ubd84 AI \ub274\uc2a4 \u2014 \ubb34\ub8cc",
    emailPlaceholder: "\uc774\uba54\uc77c \uc8fc\uc18c",
  },
};

function NeuralNetwork() {
  const nodes = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 2,
      })),
    []
  );

  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
    >
      {nodes.slice(0, 15).map((node, i) => {
        const target = nodes[(i + 3) % nodes.length];
        return (
          <line
            key={`l-${node.id}`}
            x1={`${node.x}%`}
            y1={`${node.y}%`}
            x2={`${target.x}%`}
            y2={`${target.y}%`}
            stroke="currentColor"
            strokeWidth="0.1"
            className="text-primary/30"
            style={{
              animation: `neural-pulse 3s ease-in-out infinite`,
              animationDelay: `${node.delay}s`,
            }}
          />
        );
      })}
      {nodes.map((node) => (
        <circle
          key={`n-${node.id}`}
          cx={`${node.x}%`}
          cy={`${node.y}%`}
          r="0.4"
          className="fill-primary/50"
          style={{
            animation: `neural-pulse 3s ease-in-out infinite`,
            animationDelay: `${node.delay}s`,
          }}
        />
      ))}
    </svg>
  );
}

function FloatingParticles() {
  const particles = useMemo(
    () =>
      Array.from({ length: 15 }, (_, i) => ({
        id: i,
        left: 10 + Math.random() * 80,
        duration: 8 + Math.random() * 4,
        delay: Math.random() * 5,
      })),
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-1 h-1 rounded-full bg-accent/60"
          style={{
            left: `${particle.left}%`,
            animation: `float-up ${particle.duration}s linear infinite`,
            animationDelay: `${particle.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function LoginPage() {
  const [language, setLanguage] = useState<LoginLanguage>("en");
  const [email, setEmail] = useState("");
  const router = useRouter();

  const t = translations[language];

  const handleEnter = () => {
    // Subscribe if email provided (fire-and-forget)
    if (email.trim()) {
      fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), language }),
      }).catch(() => {});
    }
    // Set visited cookie (expires in 30 days)
    document.cookie = "visited=true; path=/; max-age=2592000";
    router.push("/");
  };

  const featureIcons = [Cpu, TrendingUp, Lightbulb, Youtube];

  return (
    <div className="login-page min-h-screen flex flex-col lg:flex-row bg-background">
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .login-page *, .login-page *::before, .login-page *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
          }
        }
      `}</style>
      {/* Left Hero Panel - Hidden on mobile, visible on lg+ */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-gradient-to-br from-background via-secondary/30 to-background">
        <NeuralNetwork />
        <FloatingParticles />

        <div className="relative z-10 flex flex-col justify-center p-12 xl:p-16">
          {/* AI Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 backdrop-blur-sm w-fit mb-8">
            <span className="relative flex h-2 w-2">
              <span className="absolute h-full w-full rounded-full bg-accent animate-ping" />
              <span className="relative h-2 w-2 rounded-full bg-accent" />
            </span>
            <span className="text-sm font-medium">{t.badge}</span>
          </div>

          {/* Title */}
          <h1 className="text-5xl xl:text-6xl font-bold mb-6">
            {t.title1}
            <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {t.title2}
            </span>
          </h1>

          {/* Tagline */}
          <p className="text-lg xl:text-xl text-muted-foreground max-w-md mb-8">
            {t.tagline}
          </p>

          {/* Feature Pills */}
          <div className="flex flex-wrap gap-3 mb-8">
            {featureIcons.map((Icon, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/50 border border-border backdrop-blur-sm"
              >
                <Icon aria-hidden="true" className="w-4 h-4 text-primary" />
                <span className="text-sm">{t.features[i]}</span>
              </div>
            ))}
          </div>

          {/* AI Pipeline Stats */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/20 border border-accent/30">
                <Zap aria-hidden="true" className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium">{t.aiPipeline}</span>
              </div>
              <ArrowRight aria-hidden="true" className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {t.aiProcess}
              </span>
            </div>

            {/* Source Categories */}
            <div className="flex flex-wrap gap-2">
              {t.sourceCategories.map((category, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-1 rounded bg-secondary/50 text-muted-foreground"
                >
                  {category}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Hero - Visible only on mobile */}
      <div className="lg:hidden relative h-[35vh] bg-gradient-to-b from-primary/10 to-background p-6 flex flex-col justify-end overflow-hidden">
        <NeuralNetwork />
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">
            {t.title1}{" "}
            <span className="text-primary">{t.title2}</span>
          </h1>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {t.tagline}
          </p>
        </div>
      </div>

      {/* Right Login Panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md relative">
          {/* Glow effect */}
          <div
            className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-3xl blur-xl opacity-50"
            style={{ animation: "glow-pulse 4s ease-in-out infinite" }}
          />

          {/* Card */}
          <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-8 shadow-2xl">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <div className="relative w-20 h-20">
                <div className="absolute inset-2 rounded-2xl blur-xl opacity-40" style={{background: 'linear-gradient(135deg, #3B82F6, #14B8A6, #F59E0B)'}} />
                <ForagerMark size={80} className="relative drop-shadow-lg" />
              </div>
            </div>

            {/* Welcome */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">{t.welcome}</h2>
              <p className="text-muted-foreground text-sm">
                {t.enterCredentials}
              </p>
            </div>

            {/* Newsletter Capture */}
            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-3 text-center">{t.newsletterPitch}</p>
              <input
                type="email"
                placeholder={t.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary mb-2"
              />
            </div>

            {/* Enter Button */}
            <button
              onClick={handleEnter}
              className="w-full h-12 bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-primary/25 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <span>{t.enter}</span>
              <ArrowRight aria-hidden="true" className="w-5 h-5" />
            </button>

            {/* Language Selector */}
            <div className="flex flex-wrap justify-center gap-2 mt-6">
              {LANG_OPTIONS.map((opt) => (
                <button
                  key={opt.code}
                  onClick={() => setLanguage(opt.code)}
                  className={`px-2 py-1 rounded-md text-xs transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none ${
                    opt.code === language
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.nativeName}
                </button>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
