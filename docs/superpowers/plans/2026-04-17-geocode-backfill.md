# Geocode Backfill & Hardened API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop `/api/geocode` from crashing on non-JSON Nominatim responses, backfill the 42 un-geocoded listings, and give the user a single command to run after each crawler cron to keep `geocache` fresh.

**Architecture:** Extract Nominatim-call + cache-insert into one shared helper (`frontend/src/lib/geocode.ts`). Both the existing `/api/geocode` route and a new CLI backfill script (`frontend/scripts/geocode-all.ts`) call it. Script runs via `tsx` as `npm run geocode` and is chained into the user's existing crawler cron.

**Tech Stack:** TypeScript, Next.js 16, `better-sqlite3`, Nominatim (OpenStreetMap), `tsx` (new devDep).

**Note on testing:** The frontend has no existing test harness. Setting one up for three functions is out of scope; each task uses runtime verification (curl, node -e, running the CLI) as the "test" step, following the spec's testing section.

---

## File Structure

- **Create** `frontend/src/lib/geocode.ts` — shared Nominatim helper (one network call + DB insert logic, with hardened error handling).
- **Modify** `frontend/src/app/api/geocode/route.ts` — replace inline fetch/`response.json()` with shared helper.
- **Create** `frontend/scripts/geocode-all.ts` — CLI backfill script, reads `exposes`, fills `geocache`.
- **Modify** `frontend/package.json` — add `tsx` devDep and `geocode` script.
- **Modify** `frontend/README.md` — document the cron-wiring step.

---

### Task 1: Shared geocoding helper

**Files:**
- Create: `frontend/src/lib/geocode.ts`

- [ ] **Step 1: Create the helper file**

Create `frontend/src/lib/geocode.ts` with:

```typescript
import type Database from "better-sqlite3";
import type { GeoCache } from "./types";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "flathunter-nl-dashboard/1.0";

export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=nl`;

  let response: Response;
  try {
    response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  } catch (e) {
    console.error(`Geocode network error for ${address}:`, e);
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok || !contentType.includes("application/json")) {
    const body = await response.text().catch(() => "");
    console.error(
      `Geocode failed for ${address}: ${response.status} ${response.statusText} (content-type: ${contentType}). Body: ${body.slice(0, 200)}`
    );
    return null;
  }

  const data = (await response.json()) as Array<{ lat: string; lon: string }>;
  if (data.length === 0) {
    console.warn(`Geocode no match for ${address}`);
    return null;
  }

  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

export async function geocodeAndCache(
  db: Database.Database,
  address: string
): Promise<GeoCache | null> {
  const coords = await geocodeAddress(address);
  if (!coords) return null;

  const insert = db.prepare(
    "INSERT OR IGNORE INTO geocache (address, lat, lng) VALUES (?, ?, ?)"
  );
  insert.run(address, coords.lat, coords.lng);

  return { address, lat: coords.lat, lng: coords.lng };
}
```

- [ ] **Step 2: Type-check it compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors (or only pre-existing unrelated errors).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/geocode.ts
git commit -m "feat(frontend): add shared geocoding helper with hardened error handling"
```

---

### Task 2: Use helper in the API route

**Files:**
- Modify: `frontend/src/app/api/geocode/route.ts`

- [ ] **Step 1: Replace inline geocode block with shared helper**

Rewrite `frontend/src/app/api/geocode/route.ts` to:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { geocodeAndCache } from "@/lib/geocode";
import type { GeoCache } from "@/lib/types";

export async function POST(request: NextRequest) {
  const { addresses } = await request.json();
  if (!Array.isArray(addresses)) {
    return NextResponse.json(
      { error: "addresses array required" },
      { status: 400 }
    );
  }

  const db = getDb();
  const results: GeoCache[] = [];
  const toGeocode: string[] = [];

  const stmt = db.prepare(
    "SELECT address, lat, lng FROM geocache WHERE address = ?"
  );
  for (const addr of addresses) {
    const cached = stmt.get(addr) as GeoCache | undefined;
    if (cached) {
      results.push(cached);
    } else {
      toGeocode.push(addr);
    }
  }

  for (const addr of toGeocode) {
    // Nominatim policy: 1 request per second max.
    await new Promise((r) => setTimeout(r, 1100));
    const geo = await geocodeAndCache(db, addr);
    if (geo) results.push(geo);
  }

  return NextResponse.json(results);
}
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Runtime verify the route no longer crashes**

Start the dev server in one terminal: `cd frontend && npm run dev`.
In another terminal, hit the endpoint with an address known to not be cached (use one already in `geocache` to confirm cache hit path too):

```bash
curl -s -X POST http://localhost:3000/api/geocode \
  -H "Content-Type: application/json" \
  -d '{"addresses":["Annie Romeinsingel 48, 2331 SV Leiden"]}'
```

Expected: returns JSON array (either a single result or `[]` if Nominatim rate-limits; the dev server terminal should show a clear error log — no `SyntaxError`).

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/api/geocode/route.ts
git commit -m "fix(frontend): use hardened geocode helper in API route"
```

---

### Task 3: Add `tsx` devDep and `geocode` script

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Install `tsx` as a devDep**

Run: `cd frontend && npm install --save-dev tsx`
Expected: `tsx` appears under `devDependencies` in `package.json`; `package-lock.json` updated.

- [ ] **Step 2: Add `geocode` script**

Edit `frontend/package.json`. In the `scripts` block, add a `geocode` entry:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "geocode": "tsx scripts/geocode-all.ts"
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore(frontend): add tsx and geocode npm script"
```

---

### Task 4: Backfill script

**Files:**
- Create: `frontend/scripts/geocode-all.ts`

- [ ] **Step 1: Create the script**

Create `frontend/scripts/geocode-all.ts` with:

```typescript
import Database from "better-sqlite3";
import path from "path";
import { geocodeAndCache } from "../src/lib/geocode";

const DB_PATH = path.resolve(process.cwd(), "..", "processed_ids.db");

interface ExposeRow {
  details: string;
}

interface ExposeDetails {
  address?: string;
}

async function main() {
  const db = new Database(DB_PATH, { readonly: false });
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  const rows = db
    .prepare("SELECT details FROM exposes")
    .all() as ExposeRow[];

  const cached = new Set(
    (db.prepare("SELECT address FROM geocache").all() as { address: string }[]).map(
      (r) => r.address
    )
  );

  const addresses = new Set<string>();
  for (const row of rows) {
    let parsed: ExposeDetails;
    try {
      parsed = JSON.parse(row.details);
    } catch {
      continue;
    }
    const addr = parsed.address?.trim();
    if (!addr || addr === "N/A") continue;
    if (cached.has(addr)) continue;
    addresses.add(addr);
  }

  const todo = [...addresses];
  console.log(`Geocoding ${todo.length} addresses (${cached.size} already cached)...`);

  let ok = 0;
  let fail = 0;
  for (let i = 0; i < todo.length; i++) {
    const addr = todo[i];
    // Nominatim policy: 1 request per second max.
    await new Promise((r) => setTimeout(r, 1100));
    const geo = await geocodeAndCache(db, addr);
    if (geo) {
      console.log(`[${i + 1}/${todo.length}] ${addr} → ${geo.lat}, ${geo.lng}`);
      ok++;
    } else {
      console.log(`[${i + 1}/${todo.length}] ${addr} → FAILED`);
      fail++;
    }
  }

  console.log(`Done. Success: ${ok}, Failed: ${fail}`);
  db.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Dry-run — verify the script finds the right addresses**

Run: `cd frontend && npm run geocode`
Expected: first line prints `Geocoding N addresses (M already cached)...` where `M + N ≈ 91 - duplicates - N/A`. Depending on Nominatim's mood, some addresses succeed and some may fail — both outcomes are fine. Each line follows the `[i/total] <address> → …` format.

- [ ] **Step 4: Verify `geocache` grew**

Run: `sqlite3 processed_ids.db "SELECT COUNT(*) FROM geocache;"`
Expected: value is larger than 49 (started at 49; exact count depends on how many Nominatim resolved).

- [ ] **Step 5: Commit**

```bash
git add frontend/scripts/geocode-all.ts
git commit -m "feat(frontend): add backfill script to populate geocache from exposes"
```

---

### Task 5: Document the cron-wiring step

**Files:**
- Modify: `frontend/README.md`

- [ ] **Step 1: Append a "Geocoding" section**

Add to the end of `frontend/README.md`:

```markdown
## Geocoding

The map view reads from a `geocache` table in `processed_ids.db`. Addresses are geocoded against Nominatim (OpenStreetMap) at a max of 1 request/sec.

To keep the cache warm, run the backfill after each crawler cron:

```bash
cd frontend && npm run geocode
```

The script is idempotent: it only geocodes addresses not already in `geocache`, and prints per-address success/failure. Run it manually once after pulling these changes to backfill existing listings.
```

- [ ] **Step 2: Commit**

```bash
git add frontend/README.md
git commit -m "docs(frontend): document geocode backfill step for crawler cron"
```

---

## Self-Review

- **Spec coverage:**
  - "Harden `/api/geocode`" → Task 2.
  - "Shared helper `frontend/src/lib/geocode.ts`" → Task 1.
  - "Backfill script" → Task 4.
  - "Cron wiring documented" → Task 5.
  - "`npm run geocode` script + `tsx`" → Task 3.
  - All spec sections map to tasks.
- **Placeholder scan:** No TBD/TODO; each code step has exact code; each verification step has exact commands and expected output.
- **Type consistency:** `geocodeAddress` returns `{ lat, lng } | null`, `geocodeAndCache` returns `GeoCache | null`. Route and script both call `geocodeAndCache` with `(db, address)`. `GeoCache` is imported from `@/lib/types` in all files. Script uses `import { geocodeAndCache } from "../src/lib/geocode"` (relative path, since `tsx` doesn't apply Next.js's `@/` alias without config — explicit to avoid the engineer getting tripped by path aliases).
