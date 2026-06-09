---
name: gushwork-ui-design
description: >-
  Use when building or restyling any Gushwork (gushwork.ai) web UI — dashboards,
  internal tools, customer/demo apps, analytics views, login/auth screens — so it
  matches the Gushwork design language. Covers the exact design tokens (primary
  #0070FF, custom neutral scale, gw-* color families, shadow-s3/s4, --radius
  0.625rem), typography (Inter body + VertGroteskDisplay for headings & numbers),
  Tailwind v4 setup, the CDN assets (logo, gush-bg), and copy-paste component
  recipes (metric/chart cards, clean tables, badges, filter chips, buttons,
  inputs, dropdowns, tabs, recharts charts, nav bar, auth page, desktop gate).
  Trigger on "Gushwork", "gw design", "make it match the design language",
  "build a dashboard like stormbreaker/nebula", or when handed the design.md /
  design tokens from the gw-uimr repo.
---

# Gushwork UI Design

The Gushwork product design language — distilled from `gw-uimr-stormbreaker`
(`packages/ui` tokens + primitives, the stormbreaker leads-dashboard, nav, and
auth pages) and from building the thepublive analytics dashboard. Use it to make
any new surface look like it belongs in the Gushwork product family.

**Announce at start:** "I'm using the gushwork-ui-design skill to match the Gushwork design language."

## The look in one paragraph

Clean, light, and data-dense. White cards with **hairline `neutral-100` borders**
and a **soft, low, wide shadow** (`shadow-s3`) on a near-white page (or the
branded `gush-bg` wash). **Blue is the only accent** (`primary` = `#0070FF`).
Numbers and headings are set in the **VertGrotesk** display font (`font-grotesk`);
everything else is **Inter**. Generous padding, `rounded-xl` cards, `rounded-full`
pills, subtle `neutral-25` hover/zebra tints. Status uses the `gw-*` color
families at the **`-100` (bg) / `-700` (text)** steps. Charts are **straight
(`linear`) lines, 3px**, on a dashed vertical-only grid. Restrained, professional,
never loud.

## Reference files (read the one you need)

- **`references/design-tokens.md`** — every token with hex values, the font setup,
  the CDN asset URLs, and a **copy-paste `globals.css`** (Tailwind v4 `@theme`).
  Read this first when scaffolding a new app.
- **`references/components.md`** — the full component catalog with **exact class
  strings**: buttons, inputs, badges, cards, tables, tabs, dropdowns, charts, nav,
  auth, layout shell. Read this when building a specific component.

## Non‑negotiables (the 12 rules)

1. **Tailwind v4** with `@theme inline` tokens. Light mode only (the design forces
   light even under a `.dark` class). Never hand-pick hex in components — use the
   token utilities (`bg-primary`, `text-neutral-500`, `border-neutral-100`, …).
2. **Two fonts.** `font-grotesk` (VertGroteskDisplayVF) for headings **and large
   numbers**; Inter (`font-sans`, the default) for body. Mono only for code.
3. **Borders are `neutral-100`** (`#e1e3e8`), hairline. Dividers too. Never use
   heavy gray borders or default `gray-300` grids.
4. **Card = `rounded-xl border border-neutral-100 bg-white shadow-s3`.** That's the
   canonical surface. Group related metrics in ONE divided card
   (`divide-x/divide-y divide-neutral-100`), not separate boxes.
5. **`shadow-s3` for cards, `shadow-s4` for things that float** (dropdown menus,
   modals, popovers, the auth card). Nothing heavier.
6. **Blue accent only.** `primary` (#0070FF) for primary buttons, active states,
   icons, the main chart series. Don't introduce teal/purple/etc. as accents.
7. **Status / semantic color = `gw-{green|red|orange|yellow|blue}-100` background
   + `-700` text**, `rounded-full px-2.5 py-0.5 text-xs font-medium` pills. Green =
   good/verified, red = bad, orange/yellow = warning/unverified, blue = neutral-info.
8. **Tables are clean & light:** `border-y border-neutral-100` + `bg-neutral-25`
   uppercase `tracking-wide text-neutral-600` header; rows `border-b
   border-neutral-100 hover:bg-neutral-25`. No vertical cell borders, no zebra fills
   beyond the hover tint. First column is often a link with a hover-revealed `↗`.
9. **Charts (recharts):** `type="linear"`, `strokeWidth={3}`, `dot={false}`,
   `activeDot={{ r: 5, strokeWidth: 0 }}`; `CartesianGrid strokeDasharray="3 3"
   stroke="var(--color-neutral-100)" vertical horizontal={false}`; axes
   `tickLine/axisLine={false}` `fill var(--color-neutral-500)` `fontSize 12`; a
   **custom white tooltip** (`rounded-xl border border-neutral-100 bg-white`, soft
   shadow). **Give a standalone chart a definite pixel height** — a
   `ResponsiveContainer height="100%"` collapses to 0 unless its parent is sized.
10. **Segmented controls** for tabs / period pickers: a `bg-neutral-50` track with
    a white active pill (`data-[state=active]:bg-white …shadow-sm`). **Toggle
    filter chips** are `rounded-full border` (active `bg-neutral-100 text-neutral-900`,
    inactive muted). Use a **dropdown** (Radix Select or the custom one in
    components.md) when options are many or single-select.
11. **App shell:** sticky-ish top **nav bar** (`flex justify-between items-center p-3
    bg-white border-b z-20`) — Gushwork logo left, avatar/user right — over content.
    Branded pages get the `gush-bg.webp` background (`bg-cover bg-center`,
    `bg-fixed` for dashboards). Content is centered with a max width (`max-w-6xl`
    for a focused dashboard, `max-w-[1400px]` for a wide one) and roomy padding.
12. **Icons** come from `react-icons` — `lu` (lucide) for UI glyphs, `si`
    (Simple Icons) + `fa6` for brand logos (tint brand logos with their accent /
    chart color). Heroicons are also used in stormbreaker. Keep icon sizes 16–20px
    in-line (`h-4`/`h-5`).

## Quick recipes (the 90% — full catalog in components.md)

**Page shell (Next.js App Router):**
```tsx
<div className="flex min-h-screen flex-col">
  <Navbar /> {/* flex justify-between items-center p-3 bg-white border-b z-20 */}
  <main className="flex-1 bg-[url('https://cdn.gushwork.ai/v2/gush-bg.webp')] bg-cover bg-fixed bg-center">
    <div className="mx-auto max-w-6xl p-8">{/* page content */}</div>
  </main>
</div>
```

**Metric (hero) card — big grotesk number + change pill:**
```tsx
<div className="flex w-full flex-col gap-1.5 px-7 py-7">
  <div className="flex items-center gap-1.5">
    <Icon className="h-5 w-5 text-primary-500" />
    <h3 className="text-base font-normal text-neutral-900">Total visitors</h3>
  </div>
  <div className="flex flex-wrap items-center gap-2">
    <div className="font-grotesk text-[32px] font-semibold leading-[140%] text-neutral-900">
      {value.toLocaleString()}
    </div>
    {change != null && (
      <span className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-0.5 text-sm font-medium ${
        change > 0 ? 'bg-gw-green-100 text-gw-green-700' : 'bg-gw-red-100 text-gw-red-700'}`}>
        {change > 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
      </span>
    )}
  </div>
</div>
```
Put several of these in one card: `flex flex-col divide-y divide-neutral-100
overflow-hidden rounded-xl border border-neutral-100 bg-white shadow-s3
sm:flex-row sm:divide-x sm:divide-y-0`, each child `flex-1`.

**Chart card (header · divider · body · legend footer):**
```tsx
<div className="flex h-full w-full flex-col rounded-xl border border-neutral-100 bg-white shadow-s3">
  <div className="flex flex-col gap-0.5 px-5 py-3">
    <div className="font-grotesk text-lg font-medium text-neutral-900">Visitor traffic</div>
    <div className="text-[13px] text-neutral-500">Last 7 days</div>
  </div>
  <div className="border-t border-neutral-100" />
  <div className="min-h-0 flex-1 px-3 py-4">{/* <ResponsiveContainer …> */}</div>
  <div className="flex items-center justify-center gap-4 rounded-b-xl border-t border-neutral-100 bg-neutral-25 px-5 py-2">
    {/* legend dots: <span className="h-3 w-3 rounded-full" style={{background}}/> + label */}
  </div>
</div>
```

**Status pill:** `inline-flex items-center rounded-full bg-gw-green-100 px-2.5
py-0.5 text-xs font-medium text-gw-green-700`

**Primary button:** `inline-flex items-center justify-center gap-2 rounded-md
bg-primary px-4 py-2 text-sm font-medium text-white transition-colors
hover:bg-primary-600 disabled:opacity-50`
(outline variant: `border border-neutral-200 bg-white hover:bg-neutral-25`)

**Clean table header row:** `border-y border-neutral-100 bg-neutral-25 text-xs
font-semibold uppercase tracking-wide text-neutral-600`; body row: `border-b
border-neutral-100 transition-colors last:border-0 hover:bg-neutral-25`.

For inputs, dropdowns, tabs, the custom single-select dropdown, the chart config,
the nav bar, the auth/login page, and the desktop-only gate — see
**`references/components.md`**. For all token values and the `globals.css` to
drop into a new app — see **`references/design-tokens.md`**.

## When NOT to over-apply

Match the *system*, not every pixel of one screen. Reuse the tokens, the card +
table + chart recipes, the fonts, and the blue accent. Don't copy bespoke
one-off layouts (an export modal, a specific marketing hero) unless asked. Keep
new components small and composable, the way the rest of the codebase is.
