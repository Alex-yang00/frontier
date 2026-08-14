"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { track } from "@vercel/analytics";
import { ExternalLink, Download, Search } from "lucide-react";

const API_BASE = "";

interface DealRow {
  id: number;
  dealType: "funding" | "ma";
  company: string;
  acquirer: string | null;
  round: string | null;
  roundCategory: string | null;
  maType: string | null;
  industry: string | null;
  amountRaw: string | null;
  amountValue: number | null;
  currency: string | null;
  investors: string[];
  announcedDate: string | null;
  content: string;
  hasEvidence: boolean;
  evidence: string | null;
  sourceUrl: string | null;
  sourceName: string | null;
  status: string;
}

interface Facets {
  dealTypes: Record<string, number>;
  statuses: Record<string, number>;
  roundCategories: { value: string; count: number }[];
  industries: { value: string; count: number }[];
  dateRange: [string | null, string | null];
}

const PAGE_SIZE = 50;

const UNDISCLOSED_RAWS = new Set(["undisclosed", "n/a", "na", "unknown", "not disclosed"]);

function formatAmount(row: DealRow): string {
  // Only figures that passed validation carry amountValue — raw strings
  // whose numeric value was rejected are withheld, not showcased.
  if (row.amountValue !== null && row.amountRaw) return row.amountRaw;
  if (row.amountRaw && UNDISCLOSED_RAWS.has(row.amountRaw.trim().toLowerCase())) return "Undisclosed";
  return "—";
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ai_extracted: "border-primary/40 text-primary",
    legacy_unverified: "border-border border-dashed text-muted-foreground",
    verified: "border-tips-accent/60 text-tips-accent",
    corrected: "border-invest-accent/60 text-invest-accent",
  };
  const labels: Record<string, string> = {
    ai_extracted: "AI-extracted · evidence-gated",
    legacy_unverified: "Legacy · unverified",
    verified: "Verified",
    corrected: "Corrected",
  };
  return (
    <span
      className={`inline-block shrink-0 border px-1.5 py-0.5 font-sans text-[9px] font-bold uppercase tracking-[0.08em] ${styles[status] || styles.ai_extracted}`}
    >
      {labels[status] || status}
    </span>
  );
}

export function FundingTracker() {
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [dealType, setDealType] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [roundCategory, setRoundCategory] = useState<string>("");
  const [industry, setIndustry] = useState<string>("");
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [sort, setSort] = useState<"date" | "amount">("date");
  const [page, setPage] = useState(0);
  // Quotation excerpts are fetched per record on demand (the collection
  // endpoint never returns them — data-rights rule).
  // undefined = not loaded / loading; null = load failed (429/404/network);
  // "" = row genuinely has no excerpt; string = the excerpt.
  const [evidenceById, setEvidenceById] = useState<Record<number, string | null>>({});
  const [openEvidenceId, setOpenEvidenceId] = useState<number | null>(null);

  const toggleEvidence = useCallback(
    (id: number) => {
      // Clicking while open closes the row — EXCEPT when the last load
      // failed (null): then the click retries in place (Codex round-5 N1:
      // "click again to retry" must not require a close + reopen).
      if (openEvidenceId === id && evidenceById[id] !== null) {
        setOpenEvidenceId(null);
        return;
      }
      setOpenEvidenceId(id);
      if (evidenceById[id] === undefined || evidenceById[id] === null) {
        setEvidenceById((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        fetch(`${API_BASE}/deals/${id}`)
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
          .then((d) => setEvidenceById((prev) => ({ ...prev, [id]: d.evidence || "" })))
          .catch(() => setEvidenceById((prev) => ({ ...prev, [id]: null })));
      }
      track("funding_evidence_view", { id });
    },
    [openEvidenceId, evidenceById],
  );

  // Debounce search so we don't fire a query per keystroke (Codex F9).
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (dealType) p.set("deal_type", dealType);
    if (roundCategory) p.set("round_category", roundCategory);
    if (industry) p.set("industry", industry);
    if (status) p.set("status", status);
    if (qDebounced) p.set("q", qDebounced);
    p.set("sort", sort);
    return p;
  }, [dealType, roundCategory, industry, status, qDebounced, sort]);

  useEffect(() => {
    fetch(`${API_BASE}/deals/facets`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setFacets(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const url = new URLSearchParams(params);
    url.set("limit", String(PAGE_SIZE));
    url.set("offset", String(page * PAGE_SIZE));
    fetch(`${API_BASE}/deals?${url.toString()}`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((d) => {
        setDeals(d.deals || []);
        setTotal(d.total || 0);
        setError(false);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(true);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [params, page]);

  const onFilter = useCallback((kind: string, value: string) => {
    setPage(0);
    track("funding_filter", { kind, value: value || "all" });
  }, []);

  const exportUrl = `${API_BASE}/deals/export.csv?${params.toString()}`;

  const selectClass =
    "border border-border bg-card px-2 py-1.5 font-sans text-xs font-bold uppercase tracking-[0.08em] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            placeholder="Company or investor…"
            aria-label="Search company or investor"
            className="border border-border bg-card py-1.5 pl-7 pr-2 font-sans text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <select
          value={dealType}
          onChange={(e) => {
            setDealType(e.target.value);
            onFilter("deal_type", e.target.value);
          }}
          aria-label="Deal type"
          className={selectClass}
        >
          <option value="">All types{facets ? ` (${(facets.dealTypes.funding || 0) + (facets.dealTypes.ma || 0)})` : ""}</option>
          <option value="funding">Funding{facets ? ` (${facets.dealTypes.funding || 0})` : ""}</option>
          <option value="ma">M&A{facets ? ` (${facets.dealTypes.ma || 0})` : ""}</option>
        </select>

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            onFilter("status", e.target.value);
          }}
          aria-label="Data status"
          className={selectClass}
        >
          <option value="">All statuses</option>
          <option value="ai_extracted">Evidence-gated{facets ? ` (${facets.statuses?.ai_extracted || 0})` : ""}</option>
          <option value="legacy_unverified">Legacy unverified{facets ? ` (${facets.statuses?.legacy_unverified || 0})` : ""}</option>
          <option value="verified">Verified{facets ? ` (${facets.statuses?.verified || 0})` : ""}</option>
          <option value="corrected">Corrected{facets ? ` (${facets.statuses?.corrected || 0})` : ""}</option>
        </select>

        <select
          value={roundCategory}
          onChange={(e) => {
            setRoundCategory(e.target.value);
            onFilter("round_category", e.target.value);
          }}
          aria-label="Round"
          className={selectClass}
        >
          <option value="">All rounds</option>
          {(facets?.roundCategories || []).map((r) => (
            <option key={r.value} value={r.value}>
              {r.value} ({r.count})
            </option>
          ))}
        </select>

        <select
          value={industry}
          onChange={(e) => {
            setIndustry(e.target.value);
            onFilter("industry", e.target.value);
          }}
          aria-label="Industry"
          className={selectClass}
        >
          <option value="">All industries</option>
          {(facets?.industries || []).map((i) => (
            <option key={i.value} value={i.value}>
              {i.value} ({i.count})
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as "date" | "amount");
            onFilter("sort", e.target.value);
          }}
          aria-label="Sort"
          className={selectClass}
        >
          <option value="date">Newest first</option>
          <option value="amount">Largest first (USD)</option>
        </select>

        <a
          href={exportUrl}
          onClick={() => track("funding_export", { filters: params.toString() || "none" })}
          className="ml-auto flex items-center gap-1.5 border border-foreground bg-foreground px-3 py-1.5 font-sans text-xs font-bold uppercase tracking-[0.08em] text-background transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Download aria-hidden="true" className="h-3.5 w-3.5" />
          CSV
        </a>
      </div>

      <p className="mb-3 font-sans text-xs text-muted-foreground" aria-live="polite">
        {loading ? "Loading…" : error ? "Could not load deals — try again shortly." : `${total} deals`}
      </p>

      {/* Table */}
      <div className="overflow-x-auto border-t-2 border-foreground">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border font-sans text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
              <th scope="col" className="py-2 pr-3">Reported</th>
              <th scope="col" className="py-2 pr-3">Company</th>
              <th scope="col" className="py-2 pr-3">Deal</th>
              <th scope="col" className="py-2 pr-3">Amount</th>
              <th scope="col" className="py-2 pr-3">Investors / Acquirer</th>
              <th scope="col" className="py-2 pr-3">Status</th>
              <th scope="col" className="py-2">Source</th>
            </tr>
          </thead>
          <tbody>
            {deals.map((d) => (
              <Fragment key={d.id}>
              <tr className="border-b border-border align-top transition-colors hover:bg-secondary/50">
                <td className="py-2.5 pr-3 font-sans text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                  {d.announcedDate || "—"}
                </td>
                <td className="py-2.5 pr-3">
                  <span className="font-sans text-sm font-bold text-foreground">{d.company}</span>
                  {d.industry ? (
                    <span className="ml-2 inline-block border border-border px-1.5 py-0.5 font-sans text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                      {d.industry}
                    </span>
                  ) : null}
                </td>
                <td className="py-2.5 pr-3 font-sans text-xs text-foreground whitespace-nowrap">
                  {d.dealType === "funding" ? d.round || "Funding" : d.maType || "M&A"}
                </td>
                <td className="py-2.5 pr-3 font-sans text-sm font-bold tabular-nums text-foreground whitespace-nowrap">
                  {formatAmount(d)}
                  {d.hasEvidence ? (
                    <button
                      type="button"
                      onClick={() => toggleEvidence(d.id)}
                      aria-expanded={openEvidenceId === d.id}
                      aria-label="Show supporting evidence"
                      title="Show supporting evidence"
                      className="ml-1 cursor-pointer text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      *
                    </button>
                  ) : null}
                </td>
                <td className="py-2.5 pr-3 font-sans text-xs text-muted-foreground">
                  {d.dealType === "ma"
                    ? d.acquirer || "—"
                    : (d.investors || []).slice(0, 3).join(", ") +
                      ((d.investors || []).length > 3 ? ` +${d.investors.length - 3}` : "") || "—"}
                </td>
                <td className="py-2.5 pr-3">
                  <StatusBadge status={d.status} />
                </td>
                <td className="py-2.5">
                  {d.sourceUrl ? (
                    <a
                      href={d.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => track("funding_source_click", { company: d.company })}
                      className="inline-flex items-center gap-1 font-sans text-xs font-bold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {d.sourceName || "Source"}
                      <ExternalLink aria-hidden="true" className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="font-sans text-xs text-muted-foreground">{d.sourceName || "—"}</span>
                  )}
                </td>
              </tr>
              {openEvidenceId === d.id ? (
                <tr className="border-b border-border bg-secondary/40">
                  <td colSpan={7} className="px-3 py-2 font-sans text-xs italic leading-relaxed text-muted-foreground">
                    {evidenceById[d.id] === undefined ? "Loading evidence…" : evidenceById[d.id] === null ? (
                      "Couldn't load the excerpt (rate limit or network issue) — click Evidence to retry."
                    ) : evidenceById[d.id] ? (
                      <>
                        <span className="not-italic font-bold text-foreground">Evidence: </span>
                        &ldquo;{evidenceById[d.id]}&rdquo;
                        <span className="not-italic"> — quoted from the linked source; not licensed for redistribution.</span>
                      </>
                    ) : "No evidence excerpt on this row."}
                  </td>
                </tr>
              ) : null}
              </Fragment>
            ))}
            {!loading && deals.length === 0 && !error ? (
              <tr>
                <td colSpan={7} className="py-8 text-center font-sans text-sm text-muted-foreground">
                  No deals match these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE ? (
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="border border-border px-3 py-1.5 font-sans text-xs font-bold uppercase tracking-[0.08em] text-foreground disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            ← Newer
          </button>
          <span className="font-sans text-xs tabular-nums text-muted-foreground">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
          </span>
          <button
            type="button"
            disabled={(page + 1) * PAGE_SIZE >= total}
            onClick={() => setPage((p) => p + 1)}
            className="border border-border px-3 py-1.5 font-sans text-xs font-bold uppercase tracking-[0.08em] text-foreground disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Older →
          </button>
        </div>
      ) : null}
    </div>
  );
}
