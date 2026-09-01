# Frontier Architecture

## Runtime Boundaries

The Python pipeline and Next.js application share a JSON contract, not a
runtime. The collection host owns private candidates and model credentials.
Cloudflare R2 owns published data. The Worker has read-only access to R2 and
never reaches into collection state.

```text
source groups -> private candidate pool -> editorial work directory
              -> quality gates -> versioned R2 release -> current.json
                                                    -> Worker/API/Skill
```

## Local State

`FRONTIER_STATE_DIR` defaults to `~/.local/share/frontier`:

```text
raw/candidates.json    deduplicated seven-day candidate pool
raw/meta.json          detailed source health and collection timestamps
work/<edition>/        resumable editorial work, retained 48h on failure
outbox/<release-id>/   complete release awaiting verified upload
preview/               latest local quality-passing canonical files
state/current.json     cached R2 pointer and 60-day archive index
state/releases.json    locally-created release cleanup ledger
```

Raw collection never writes public archives. Editorial classifications and
rejections are copied back into the candidate pool before finalization so a
later refresh does not pay to process the same item again.

## Scheduling And Quality

Medium, slow, and fast collectors run separately to respect different network
latencies and Reddit's serial request spacing. They share one non-blocking file
lock and run before both daily publications, so each half-day slice has fresh
source snapshots.

Each edition is composed of two fixed UTC slices: 12:00-00:00 and 00:00-12:00.
The morning release is partial; the evening release merges both slices and becomes
the complete daily archive. Final publication requires bilingual fields, specialized editorial
review, critic approval, source diversity, and at least 20 healthy sources.

## Atomic R2 Publication

Each release contains `daily.json`, `weeks.json`, and a sanitized `meta.json`
under `releases/<release-id>/`. The publisher uploads and downloads each object,
compares SHA-256 hashes, and writes `current.json` only after every object is
verified. The pointer maps stable public filenames and archive dates to immutable
object keys.

The Worker resolves `/api/data/*` through that pointer. During migration it falls
back to legacy flat keys when no valid pointer exists. Archive entries and their
item counts are retained for 60 days. Unreferenced locally-created releases are
deleted from R2 after 48 hours; failed local work is also removed after 48 hours.

## Failure Model

- Collection failure updates private health but does not change public data.
- Stale group snapshots block publication and leave the active pointer intact.
- Editorial or translation failure leaves resumable work and the old release.
- Upload or hash verification failure never switches the pointer.
- Cleanup failure does not invalidate a successful publication and is retried on
  a later run.

## Public Contract

Only `daily.json`, `weeks.json`, `meta.json`, and
`archive/YYYY-MM-DD.json` are public. Group-specific raw files are private
implementation details. Public metadata contains freshness summaries but not
collector exception strings or credentials.
