"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, X, Send, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useSettings } from "@/lib/settings-context";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatWidgetProps {
  weekId: string;
}

export function ChatWidget({ weekId }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fabExpanded, setFabExpanded] = useState(false);
  const [fabHovered, setFabHovered] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const { language, t } = useSettings();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Reset conversation when the selected period or language changes.
  useEffect(() => {
    setMessages([]);
  }, [weekId, language]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // FAB expand/collapse on first visit
  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReducedMotion(prefersReduced);

    if (prefersReduced) return;

    const seen = localStorage.getItem("fab-seen");
    if (seen) return;

    setFabExpanded(true);
    const timer = setTimeout(() => {
      setFabExpanded(false);
      // Report generator also sets this, but set it here too for safety
      localStorage.setItem("fab-seen", "true");
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  // Lock body scroll when chat panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = useCallback(async (userMessage: string) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userMessage,
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    // Abort any previous in-flight request
    abortControllerRef.current?.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // 30-second timeout
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages
            .slice(-10)
            .map((m) => ({ role: m.role, content: m.content })),
          weekId,
          language,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let assistantContent = "";

      // Add empty assistant message
      const assistantId = (Date.now() + 1).toString();
      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantContent += chunk;

        // Update assistant message
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: assistantContent } : m))
        );
      }

      // Handle empty stream — model returned nothing
      if (!assistantContent.trim()) {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: t("chatError") } : m))
        );
      }
    } catch (error) {
      const isAbort = error instanceof DOMException && error.name === "AbortError";
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: isAbort ? t("chatTimeout") : t("chatError"),
        },
      ]);
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [messages, weekId, language, t]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    sendMessage(input.trim());
    setInput("");
  };

  const clearMessages = () => {
    abortControllerRef.current?.abort();
    setMessages([]);
    setIsLoading(false);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => !isOpen && setFabHovered(true)}
        onMouseLeave={() => setFabHovered(false)}
        className={cn(
          "fixed z-50 flex h-14 items-center rounded-full bg-primary text-primary-foreground shadow-lg overflow-hidden whitespace-nowrap",
          "bottom-20 right-4 md:bottom-6 md:right-6",
          "hover:shadow-xl hover:scale-105",
          "focus-visible:ring-2 focus-visible:ring-ring",
          isOpen
            ? "w-14 justify-center rotate-90"
            : reducedMotion
              ? "w-14 justify-center"
              : [
                  "transition-[max-width,box-shadow,transform] duration-500 ease-in-out",
                  fabExpanded || fabHovered
                    ? "max-w-[140px] md:max-w-[180px] px-5 gap-3 flex-row-reverse"
                    : "max-w-[56px] w-14 justify-center",
                ]
        )}
        aria-label={isOpen ? t("reportClose") : t("fabChat")}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <X className="h-6 w-6 shrink-0" aria-hidden="true" />
        ) : (
          <>
            <MessageCircle className="h-6 w-6 shrink-0" aria-hidden="true" />
            {!reducedMotion && (
              <span
                className={cn(
                  "text-sm font-medium transition-opacity duration-300",
                  fabExpanded || fabHovered ? "opacity-100" : "opacity-0 w-0"
                )}
              >
                {t("fabChat")}
              </span>
            )}
          </>
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div
          className={cn(
            "fixed z-[55] flex flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl",
            "bottom-36 right-4 w-[380px] max-w-[calc(100vw-2rem)]",
            "h-[calc(100vh-160px)] max-h-[500px] md:h-[500px]",
            "md:bottom-24 md:right-6"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-lg font-semibold">{t("chatTitle")}</h3>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <Button variant="ghost" size="icon" className="h-11 w-11" onClick={clearMessages} title={t("chatClear")} aria-label={t("chatClear")}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => setIsOpen(false)} aria-label={t("reportClose")}>
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 min-w-0 overflow-hidden p-4">
            <div ref={scrollRef} className="space-y-4">
              {messages.length === 0 ? (
                <div className="py-6 space-y-4">
                  <p className="text-center text-sm text-muted-foreground">{t("chatWelcome")}</p>
                  <div className="flex flex-col gap-2">
                    {(["chatSuggest1", "chatSuggest2", "chatSuggest3"] as const).map((key) => (
                      <button
                        key={key}
                        onClick={() => sendMessage(t(key))}
                        className="rounded-xl border border-border px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-secondary"
                      >
                        {t(key)}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-2 text-sm",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground"
                      )}
                    >
                      {message.role === "assistant" ? (
                        <div className="prose-chat break-words">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
              {isLoading && !messages[messages.length - 1]?.content && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-secondary px-4 py-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <form onSubmit={handleSubmit} className="border-t border-border p-4">
            <div className="flex gap-2">
              <label htmlFor="chat-message-input" className="sr-only">
                {t("chatPlaceholder")}
              </label>
              <input
                id="chat-message-input"
                ref={inputRef}
                name="message"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t("chatPlaceholder")}
                aria-label={t("chatPlaceholder")}
                className="flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                autoComplete="off"
                disabled={isLoading}
              />
              <Button
                type="submit"
                size="icon"
                className="h-11 w-11 rounded-full"
                disabled={isLoading || !input.trim()}
                aria-label={language === "de" ? "Nachricht senden" : "Send message"}
              >
                <Send className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
