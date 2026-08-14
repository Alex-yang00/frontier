"use client";

import { useState, useRef, useEffect } from "react";
import { Share, Check, Copy, Link } from "lucide-react";
import { useSettings } from "@/lib/settings-context";
import { cn } from "@/lib/utils";

interface ShareButtonProps {
  title: string;
  text: string;
  url?: string;
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

export function ShareButton({ title, text, url }: ShareButtonProps) {
  const { t } = useSettings();
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");

  const handleCopy = async () => {
    const copyText = url ? `${text}\n\n${url}` : text;
    await navigator.clipboard.writeText(copyText);
    setCopied(true);
    setShowMenu(false);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Use Web Share API on mobile when available
    if (navigator.share) {
      try {
        await navigator.share({ title, text, ...(url && { url }) });
      } catch {
        // User cancelled or share failed silently
      }
      return;
    }

    // Desktop fallback: show share menu
    setShowMenu((prev) => !prev);
  };

  const handleShareX = () => {
    const shareText = encodeURIComponent(`${title}\n${text}`);
    const shareUrlEnc = encodeURIComponent(shareUrl);
    window.open(
      `https://x.com/intent/tweet?text=${shareText}&url=${shareUrlEnc}`,
      "_blank",
      "noopener,noreferrer,width=550,height=420"
    );
    setShowMenu(false);
  };

  const handleShareLinkedIn = () => {
    const shareUrlEnc = encodeURIComponent(shareUrl);
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrlEnc}`,
      "_blank",
      "noopener,noreferrer,width=550,height=420"
    );
    setShowMenu(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={handleShare}
        className={cn(
          "flex items-center gap-1.5 border border-transparent px-2 py-1.5 transition-colors duration-150",
          copied
            ? "border-accent/30 bg-accent/10 text-accent"
            : "text-muted-foreground hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
        )}
        title={t("share")}
      >
        {copied ? (
          <Check className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Share className="h-4 w-4" aria-hidden="true" />
        )}
        {copied && (
          <span className="text-xs font-medium">{t("copiedToClipboard")}</span>
        )}
      </button>

      {showMenu && (
        <div className="absolute bottom-full right-0 z-50 mb-1 min-w-[180px] border border-foreground bg-popover p-1 shadow-md animate-in fade-in-0 zoom-in-95">
          <button
            onClick={handleCopy}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Link className="h-4 w-4" aria-hidden="true" />
            {t("copyLink")}
          </button>
          <button
            onClick={handleShareX}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          >
            <XIcon className="h-4 w-4" aria-hidden="true" />
            {t("shareOnX")}
          </button>
          <button
            onClick={handleShareLinkedIn}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          >
            <LinkedInIcon className="h-4 w-4" aria-hidden="true" />
            {t("shareOnLinkedIn")}
          </button>
        </div>
      )}
    </div>
  );
}
