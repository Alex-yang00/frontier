"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { FileText, Loader2, X, RefreshCw, ChevronDown, FileDown, FileCode, FileType, Braces } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useSettings } from "@/lib/settings-context";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ReportGeneratorProps {
  weekId: string;
}

/** Convert markdown to styled HTML document */
function markdownToHtml(md: string, title: string, lang: string = "en"): string {
  const lines = md.split('\n');
  const output: string[] = [];
  let inList = false;
  let inTable = false;
  let isHeaderRow = true;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip separator rows in tables (|---|---|)
    if (/^\|[\s\-:|]+\|$/.test(line)) {
      continue;
    }

    // Table row
    if (line.startsWith('|') && line.endsWith('|')) {
      if (inList) { output.push('</ul>'); inList = false; }
      if (!inTable) {
        output.push('<table>');
        inTable = true;
        isHeaderRow = true;
      }
      const cells = line.slice(1, -1).split('|').map(c => c.trim());
      const tag = isHeaderRow ? 'th' : 'td';
      const rowClass = isHeaderRow ? ' class="header"' : '';
      output.push(`<tr${rowClass}>${cells.map(c => `<${tag}>${c.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</${tag}>`).join('')}</tr>`);
      // Check if next line is separator → current line was header
      const next = lines[i + 1]?.trim() || '';
      if (/^\|[\s\-:|]+\|$/.test(next)) {
        isHeaderRow = false;
      } else {
        isHeaderRow = false;
      }
      continue;
    }

    // Close table if we left table rows
    if (inTable) { output.push('</table>'); inTable = false; }

    if (!line) { if (inList) { output.push('</ul>'); inList = false; } output.push(''); continue; }
    if (line.startsWith('### ')) { if (inList) { output.push('</ul>'); inList = false; } output.push(`<h3>${line.slice(4)}</h3>`); continue; }
    if (line.startsWith('## ')) { if (inList) { output.push('</ul>'); inList = false; } output.push(`<h2>${line.slice(3)}</h2>`); continue; }
    if (line.startsWith('# ')) { if (inList) { output.push('</ul>'); inList = false; } output.push(`<h1>${line.slice(2)}</h1>`); continue; }
    if (line === '---') { if (inList) { output.push('</ul>'); inList = false; } output.push('<hr>'); continue; }
    if (line.startsWith('- ')) {
      if (!inList) { output.push('<ul>'); inList = true; }
      output.push(`<li>${line.slice(2).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>')}</li>`);
      continue;
    }
    if (inList) { output.push('</ul>'); inList = false; }
    output.push(`<p>${line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>')}</p>`);
  }

  if (inList) output.push('</ul>');
  if (inTable) output.push('</table>');

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.7; color: #1a1a2e; }
  h1 { font-size: 2em; border-bottom: 3px solid #4361ee; padding-bottom: 12px; margin-top: 40px; color: #1a1a2e; }
  h2 { font-size: 1.5em; border-bottom: 2px solid #e8e8f0; padding-bottom: 8px; margin-top: 32px; color: #2d2d44; }
  h3 { font-size: 1.2em; margin-top: 24px; color: #4361ee; }
  p { margin: 12px 0; color: #333; }
  ul { padding-left: 24px; }
  li { margin: 6px 0; }
  strong { color: #1a1a2e; }
  hr { border: none; border-top: 1px solid #e8e8f0; margin: 32px 0; }
  code { background: #f0f0f8; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
  table { width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 0.9em; }
  th { background: #f0f0f8; padding: 10px 14px; text-align: left; font-weight: 600; border-bottom: 2px solid #ddd; }
  td { padding: 10px 14px; border-bottom: 1px solid #eee; }
  tr:hover td { background: #fafafa; }
</style>
</head>
<body>
${output.join('\n')}
</body>
</html>`;
}

/** Convert markdown to plain text */
function markdownToPlainText(md: string): string {
  return md
    .replace(/^#{1,3} /gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^- /gm, '  • ')
    .replace(/^---$/gm, '────────────────────────────────')
    .replace(/\n{3,}/g, '\n\n');
}

/** Convert markdown to structured JSON */
function markdownToJson(md: string, weekId: string, language: string): string {
  const sections: { heading: string; level: number; content: string[] }[] = [];
  let current: { heading: string; level: number; content: string[] } | null = null;

  for (const line of md.split('\n')) {
    const h1 = line.match(/^# (.+)$/);
    const h2 = line.match(/^## (.+)$/);
    const h3 = line.match(/^### (.+)$/);

    if (h1 || h2 || h3) {
      const match = h1 || h2 || h3;
      const level = h1 ? 1 : h2 ? 2 : 3;
      current = { heading: match![1], level, content: [] };
      sections.push(current);
    } else if (current && line.trim()) {
      current.content.push(line.replace(/^- /, '').replace(/\*\*/g, ''));
    }
  }

  return JSON.stringify({
    report: {
      periodId: weekId,
      language,
      generatedAt: new Date().toISOString(),
      sections: sections.map(s => ({
        title: s.heading,
        level: s.level,
        paragraphs: s.content,
      })),
    },
  }, null, 2);
}

/** Trigger file download */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportGenerator({ weekId }: ReportGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reportContent, setReportContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [fabExpanded, setFabExpanded] = useState(false);
  const [fabHovered, setFabHovered] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const { language, t } = useSettings();

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
      localStorage.setItem("fab-seen", "true");
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  // Lock body scroll when report overlay is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  // Close export menu on click outside
  useEffect(() => {
    if (!showExportMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showExportMenu]);

  const generateReport = useCallback(async () => {
    setIsGenerating(true);
    setIsDone(false);
    setReportContent("");
    setError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      const response = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekId, language }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error("Failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let content = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
        setReportContent(content);
      }

      setIsDone(true);
    } catch (err) {
      const isAbort = err instanceof DOMException && err.name === "AbortError";
      if (!isAbort) setError(t("reportError"));
    } finally {
      clearTimeout(timeoutId);
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  }, [weekId, language, t]);

  const handleOpen = () => {
    setIsOpen(true);
    generateReport();
  };

  const handleClose = () => {
    abortControllerRef.current?.abort();
    setIsOpen(false);
    setIsGenerating(false);
    setShowExportMenu(false);
  };

  const reportTitle = `${t("reportTitle")} — ${weekId}`;

  const exportMarkdown = () => {
    downloadFile(reportContent, `ai-report-${weekId}-${language}.md`, "text/markdown");
    setShowExportMenu(false);
  };

  const exportHtml = () => {
    const html = markdownToHtml(reportContent, reportTitle, language);
    downloadFile(html, `ai-report-${weekId}-${language}.html`, "text/html");
    setShowExportMenu(false);
  };

  const exportTxt = () => {
    const txt = markdownToPlainText(reportContent);
    downloadFile(txt, `ai-report-${weekId}-${language}.txt`, "text/plain");
    setShowExportMenu(false);
  };

  const exportJson = () => {
    const json = markdownToJson(reportContent, weekId, language);
    downloadFile(json, `ai-report-${weekId}-${language}.json`, "application/json");
    setShowExportMenu(false);
  };

  const exportDocx = async () => {
    setShowExportMenu(false);
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx");

    const paragraphs: InstanceType<typeof Paragraph>[] = [];
    const lines = reportContent.split("\n");

    for (const line of lines) {
      if (line.startsWith("# ")) {
        paragraphs.push(new Paragraph({
          text: line.replace("# ", ""),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }));
      } else if (line.startsWith("## ")) {
        paragraphs.push(new Paragraph({
          text: line.replace("## ", ""),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 },
        }));
      } else if (line.startsWith("### ")) {
        paragraphs.push(new Paragraph({
          text: line.replace("### ", ""),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        }));
      } else if (line.startsWith("- ")) {
        paragraphs.push(new Paragraph({
          children: [new TextRun(line.replace("- ", ""))],
          bullet: { level: 0 },
        }));
      } else if (line.startsWith("**") && line.endsWith("**")) {
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: line.replace(/\*\*/g, ""), bold: true })],
          spacing: { before: 100, after: 50 },
        }));
      } else if (line.trim()) {
        // Handle inline bold within paragraph text
        const children: InstanceType<typeof TextRun>[] = [];
        const parts = line.split(/(\*\*.+?\*\*)/);
        for (const part of parts) {
          if (part.startsWith("**") && part.endsWith("**")) {
            children.push(new TextRun({ text: part.replace(/\*\*/g, ""), bold: true }));
          } else if (part) {
            children.push(new TextRun(part));
          }
        }
        paragraphs.push(new Paragraph({ children, spacing: { after: 100 } }));
      }
    }

    const doc = new Document({
      sections: [{ children: paragraphs }],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-report-${weekId}-${language}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportOptions = [
    { label: t("reportExportDocx"), icon: FileDown, onClick: exportDocx, ext: ".docx" },
    { label: t("reportExportHtml"), icon: FileCode, onClick: exportHtml, ext: ".html" },
    { label: t("reportExportMd"), icon: FileType, onClick: exportMarkdown, ext: ".md" },
    { label: t("reportExportTxt"), icon: FileText, onClick: exportTxt, ext: ".txt" },
    { label: t("reportExportJson"), icon: Braces, onClick: exportJson, ext: ".json" },
  ];

  return (
    <>
      {/* Floating Button — bottom-left, opposite the chat widget */}
      <button
        onClick={handleOpen}
        onMouseEnter={() => setFabHovered(true)}
        onMouseLeave={() => setFabHovered(false)}
        className={cn(
          "fixed z-50 flex h-14 items-center rounded-full bg-primary text-primary-foreground shadow-lg overflow-hidden whitespace-nowrap",
          "bottom-20 left-4 md:bottom-6 md:left-6",
          "hover:shadow-xl hover:scale-105",
          "focus-visible:ring-2 focus-visible:ring-ring",
          reducedMotion
            ? "w-14 justify-center"
            : [
                "transition-[max-width,box-shadow,transform] duration-500 ease-in-out",
                fabExpanded || fabHovered
                  ? "max-w-[140px] md:max-w-[180px] px-5 gap-3"
                  : "max-w-[56px] w-14 justify-center",
              ]
        )}
        aria-label={t("reportGenerate")}
      >
        <FileText className="h-6 w-6 shrink-0" aria-hidden="true" />
        {!reducedMotion && (
          <span
            className={cn(
              "text-sm font-medium transition-opacity duration-300",
              fabExpanded || fabHovered ? "opacity-100" : "opacity-0 w-0"
            )}
          >
            {t("fabReport")}
          </span>
        )}
      </button>

      {/* Report Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50">
          <div className="relative flex flex-col w-full max-w-3xl h-[90vh] mx-4 rounded-2xl border border-border bg-background shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-primary/5 to-transparent px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{t("reportTitle")}</h2>
                  <p className="text-xs text-muted-foreground">{weekId}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {isDone && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={generateReport}
                    aria-label={t("reportRegenerate")}
                    title={t("reportRegenerate")}
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={handleClose}
                  aria-label={t("reportClose")}
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1 min-h-0 px-6 py-6">
              {error ? (
                <div className="flex flex-col items-center gap-4 py-12">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                    <X className="h-6 w-6 text-destructive" aria-hidden="true" />
                  </div>
                  <p className="text-sm text-destructive text-center">{error}</p>
                  <Button variant="outline" size="sm" onClick={generateReport} className="gap-2">
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    {t("reportRegenerate")}
                  </Button>
                </div>
              ) : reportContent ? (
                <article className="report-content">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-2xl font-bold mt-8 mb-4 pb-3 border-b-2 border-primary/20 text-foreground first:mt-0">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-xl font-semibold mt-8 mb-3 pb-2 border-b border-border text-foreground flex items-center gap-2">
                          <span className="inline-block w-1 h-5 rounded-full bg-primary" aria-hidden="true" />
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-lg font-semibold mt-6 mb-2 text-primary">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => (
                        <p className="text-sm leading-relaxed text-foreground/90 mb-4">
                          {children}
                        </p>
                      ),
                      ul: ({ children }) => (
                        <ul className="space-y-2 my-4 pl-1">
                          {children}
                        </ul>
                      ),
                      li: ({ children }) => (
                        <li className="flex items-start gap-2.5 text-sm leading-relaxed text-foreground/90">
                          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" aria-hidden="true" />
                          <span>{children}</span>
                        </li>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold text-foreground">{children}</strong>
                      ),
                      hr: () => (
                        <hr className="my-8 border-t border-border" />
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-3 border-primary/30 pl-4 my-4 text-sm italic text-muted-foreground">
                          {children}
                        </blockquote>
                      ),
                      code: ({ children }) => (
                        <code className="bg-secondary px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
                      ),
                      table: ({ children }) => (
                        <div className="my-6 overflow-x-auto rounded-lg border border-border">
                          <table className="w-full text-sm">
                            {children}
                          </table>
                        </div>
                      ),
                      thead: ({ children }) => (
                        <thead className="bg-secondary/50 border-b border-border">
                          {children}
                        </thead>
                      ),
                      tbody: ({ children }) => (
                        <tbody className="divide-y divide-border">
                          {children}
                        </tbody>
                      ),
                      tr: ({ children }) => (
                        <tr className="hover:bg-secondary/30 transition-colors">
                          {children}
                        </tr>
                      ),
                      th: ({ children }) => (
                        <th className="px-4 py-2.5 text-left font-semibold text-foreground whitespace-nowrap">
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td className="px-4 py-2.5 text-foreground/90">
                          {children}
                        </td>
                      ),
                    }}
                  >
                    {reportContent}
                  </ReactMarkdown>
                </article>
              ) : null}
              {isGenerating && (
                <div className="flex items-center gap-3 mt-6 px-4 py-3 rounded-lg bg-primary/5 border border-primary/10">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
                  <span className="text-sm text-muted-foreground">{t("reportGenerating")}</span>
                </div>
              )}
            </ScrollArea>

            {/* Footer with export dropdown */}
            {isDone && (
              <div className="flex items-center justify-between border-t border-border px-6 py-3 bg-secondary/30">
                <p className="text-xs text-muted-foreground">{t("reportComplete")}</p>
                <div className="relative" ref={exportMenuRef}>
                  <Button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="gap-2 focus-visible:ring-2 focus-visible:ring-ring"
                    size="sm"
                  >
                    <FileDown className="h-4 w-4" aria-hidden="true" />
                    {t("reportExport")}
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showExportMenu && "rotate-180")} aria-hidden="true" />
                  </Button>
                  {showExportMenu && (
                    <div className="absolute bottom-full right-0 mb-2 w-48 rounded-lg border border-border bg-background shadow-lg overflow-hidden">
                      {exportOptions.map((opt) => (
                        <button
                          key={opt.ext}
                          onClick={opt.onClick}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                        >
                          <opt.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          <span>{opt.label}</span>
                          <span className="ml-auto text-xs text-muted-foreground">{opt.ext}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
