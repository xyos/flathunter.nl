# Geocode Backfill & Hardened API — Design

**Date:** 2026-04-17
**Status:** Approved

## Problem

The frontend map view calls `/api/geocode` for every address it shows. That endpoint hits Nominatim and unconditionally parses the response as JSON. When Nominatim returns an XML error page (rate-limit/block), `JSON.parse` throws:

```
SyntaxError: Unexpected token '<', "<?xml vers"... is not valid JSON
```

Two issues compound:

1. The route swallows `response.ok` — any XML/HTML error page crashes the parser and logs a confusing error instead of the real status.
2. There is no pre-warming of `geocache`. Every map load re-requests every missing address, which makes rate-limit errors likely and user-visible.

Current state: 91 rows in `exposes`, 49 in `geocache`, 42 missing.

## Goals

- Stop the `SyntaxError` crashes; surface the actual failure reason.
- Backfill the 42 missing listings.
- Ensure new listings end up geocoded automatically as part of the crawler's cron cycle — without adding Python dependencies or duplicating logic.

## Non-Goals

- Switching away from Nominatim.
- Changing the DB schema.
- Adding Python-side geocoding.
- Changing the frontend's lazy map-load UX.

## Approach

Keep geocoding in the frontend (where `geocache` lives). Share one helper between the API route and a new CLI backfill script. Hook the script into the existing crawler cron.

### 1. Shared helper: `frontend/src/lib/geocode.ts`

Exports:

- `geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null>`
  - Calls Nominatim with `User-Agent: flathunter-nl-dashboard/1.0`.
  - Checks `response.ok` and that `content-type` starts with `application/json`.
  - On failure: reads `.text()`, logs `status`, `statusText`, and the first 200 chars of body; returns `null`.
  - On empty result array: returns `null` (not an error).
  - Does NOT handle rate-limiting itself — that's the caller's job.

- `geocodeAndCache(db, address): Promise<GeoCache | null>`
  - Calls `geocodeAddress`, inserts into `geocache` on success via `INSERT OR IGNORE`, returns the row or `null`.

### 2. Harden `/api/geocode`

Replace the inline fetch/`response.json()` block with `geocodeAndCache`. Keep the existing 1.1s sleep between calls. Keep the existing cache-first short-circuit.

Result: XML error pages are logged clearly instead of throwing. The "toGeocode" loop never aborts early.

### 3. Backfill script: `frontend/scripts/geocode-all.ts`

- Opens SQLite via `better-sqlite3` using the same path logic as `lib/db.ts`.
- Queries `SELECT details FROM exposes`, parses each `details` BLOB as JSON, extracts `address`.
- Filters: non-empty, not `"N/A"`, not already present in `geocache`.
- Deduplicates addresses (multiple listings can share one).
- Iterates the remaining addresses at ≥1.1s/request, calling `geocodeAndCache`.
- Prints progress per address: `[n/total] <address> → <lat>, <lng>` or `[n/total] <address> → FAILED`.
- Exit code 0 on completion (even with some failures — failures are logged, not fatal).

Runnable via `npm run geocode` (added to `frontend/package.json`), executed with `tsx` so it shares the TypeScript config without a build step.

### 4. Cron wiring

Document in `frontend/README.md` that after each crawler run, `cd frontend && npm run geocode` should run. The user's cron (confirmed to be cron-driven) chains the commands. No change to `cloud_job.py` or `flathunt.py`.

## Data Flow

```
cron tick
  └── crawler (Python)     → writes new rows to `exposes`
  └── npm run geocode      → reads `exposes`, finds gaps vs `geocache`, fills them
frontend map load
  └── POST /api/geocode    → cache hit for ~all addresses, no Nominatim call
```

## Error Handling

- Network failure / non-2xx response / non-JSON body: logged at the shared helper, returns `null`. Caller skips that address and proceeds.
- Empty Nominatim result: returns `null`, logged as "no match", address is skipped. (A future pass can retry — not in scope here.)
- DB insert failure: let it throw — indicates a real bug (schema drift, disk full).

## Testing

- Manual: run `npm run geocode` against the current DB, verify `geocache` grows from 49 → ~91 (minus any addresses Nominatim can't resolve).
- Manual: load `/map` in the frontend, confirm no `SyntaxError` in terminal even when Nominatim is rate-limiting.
- Manual: simulate an error by temporarily pointing the helper at `https://httpbin.org/xml`, confirm the route logs the status/body snippet and does not throw.

## Rollout

Single PR. No migrations. Backward-compatible.
