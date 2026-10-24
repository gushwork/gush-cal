---
name: page-loading-performance
description: Conventions and verification steps for fast, responsive pages in this app — route loading/error boundaries, server-preloaded panel data, hydration-safe time/locale UI, mobile layout, and mutation pending states. Use when adding or changing a page, admin panel, data fetch, loading state, skeleton, or anything that renders dates/times, or when the user reports the app feels slow, unresponsive, or flickers.
---

# Page Loading & Performance

How pages in this app stay fast. Read `docs/CODEMAP.md` (UI, Brand, Layout → Loading and data) for file locations.

## Rules

1. **Every route segment that awaits data has a `loading.tsx`.** Without one, Next.js cannot prefetch dynamic routes, so a click shows nothing until the server responds. Reuse `components/layout/route-skeletons.tsx`; don't invent per-page spinners.
   - `app/(admin)/calendars/loading.tsx`: full page (list, new, first entry into a Calendar).
   - `app/(admin)/calendars/[id]/loading.tsx`: content pane only; the Calendar header and sidebar stay mounted.
   - `app/book/[slug]/loading.tsx`, `app/manage/[token]/loading.tsx`: public pages.
2. **Pair it with an `error.tsx`** using `components/layout/route-error.tsx`. In this Next.js version the prop is `retry` (not `reset`). Check `node_modules/next/dist/docs/` before relying on remembered APIs.
3. **Load a panel's initial data on the server, never in a mount `useEffect`.** The page already verifies ownership (`loadCalendarBundle(id, schedulerId)`); fetch the panel data in the same `Promise.all` and pass it as a required `initial*` prop. Keep the client `load*()` only for reloads after mutations, and don't swap content for a skeleton during those reloads. The submit button's `loading` state is the feedback.
   - Share the query with the API route through a `lib/` helper (e.g. `loadClientCalendarSettings`, `loadPublicBookingMetadata`) so both return identical shapes.
   - Calling `notFound()` after `Promise.all` is safe: data for a Calendar the Scheduler doesn't own is never rendered.
4. **Parallelize independent awaits.** Sequential awaits cost one database round trip each in production (Fly → Supabase).
5. **Nothing that depends on the viewer's clock, locale, or timezone may render on the server.** Server HTML is rendered in UTC; a mismatch makes React discard the server HTML and re-render on the client (slow, and it flickers).
   - Single timestamps: `<LocalDateTime value={iso} />` (`components/ui/local-date-time.tsx`).
   - Whole widgets (booking wizard, availability grid, meetings list, manage page): `<ClientOnly fallback={<Skeleton…/>}>` (`components/ui/client-only.tsx`) or `useIsClient()` (`lib/ui/use-is-client.ts`).
   - Defaults like "browser timezone": derive them after hydration (`isClient ? browserTz : "UTC"`) instead of putting them in `useState` initializers.
   - Never read `window`/`document` during render, and never read server-only env (`APP_URL`, `PORT`) in a client component. Pass `getAppUrl()` from the server as a prop.
6. **Phones:** the Calendar sidebar is a horizontal scrolling strip below `lg`. Content must start above the fold, and nothing may bleed outside an `overflow-hidden` ancestor (no negative margins inside the Calendar content pane).
7. **Prefer the "adjust state when props change" pattern** over `useEffect(() => setState(prop))`; see `scheduling-panel.tsx` and `public-link-editor.tsx`. The `react-hooks/set-state-in-effect` lint rule enforces this.

## Verify

Run against a production build (`npm run build`, then `npm start`) with `USE_STUBS=1` and a seeded DB (`seed-e2e-data` skill). Authenticated runs need a Playwright storage state.

```bash
# Navigation latency: expect first-feedback ≲ 100ms, one round trip to content, api-calls=0 on load
DELAY=800 START=/calendars/<id> STORAGE_STATE=auth.json \
  node .agents/skills/page-loading-performance/scripts/nav-latency.mjs Members Teams Links Policies Meetings

# Hydration: must print only ✓ across timezones
STORAGE_STATE=auth.json node .agents/skills/page-loading-performance/scripts/hydration-check.mjs \
  /calendars /calendars/<id> /calendars/<id>/meetings /calendars/<id>/availability /book/<slug>
```

Then run `npm test`, `npx tsc --noEmit`, and the e2e suite (`run-e2e` skill).
