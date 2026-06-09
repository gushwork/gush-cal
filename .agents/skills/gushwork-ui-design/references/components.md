# Gushwork Component Recipes

Exact class strings. Two sources: the shared `@repo/ui` primitives (Radix + `cva`,
in `gw-uimr-stormbreaker/packages/ui`) and the composed dashboard patterns (the
stormbreaker leads-dashboard + the thepublive analytics dashboard). Use `cn()`
(clsx + tailwind-merge) for conditional classes; use `cva()` for variant-driven
primitives.

---

## 1. Primitives (`@repo/ui`, Radix + cva)

### Button — base + variants + sizes
Base: `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md
text-sm font-medium transition-all outline-none disabled:pointer-events-none
disabled:opacity-50 focus-visible:border-ring focus-visible:ring-ring/50
focus-visible:ring-[3px] [&_svg:not([class*='size-'])]:size-4 shrink-0`
| variant | classes |
|---|---|
| `default` | `bg-primary text-primary-foreground hover:bg-primary/90` |
| `destructive` | `bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20` |
| `danger` | `bg-red-50 border border-red-300 text-red-600 hover:bg-red-100 hover:border-red-400` |
| `outline` | `border bg-background shadow-xs hover:bg-neutral-25 hover:text-accent-foreground` |
| `secondary` | `bg-secondary text-secondary-foreground hover:bg-secondary/80` |
| `ghost` | `hover:bg-accent hover:text-accent-foreground` |
| `link` | `text-primary underline-offset-4 hover:underline` |
| sizes | `default h-9 px-4 py-2` · `sm h-8 px-3 gap-1.5` · `lg h-10 px-6` · `icon size-9` · `icon-sm size-8` · `icon-lg size-10` |

Plain (no design-system pkg) primary button: `inline-flex items-center justify-center
gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white
transition-colors hover:bg-primary-600 disabled:opacity-50`.

### Input
`border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1
text-base md:text-sm shadow-xs transition-[color,box-shadow] outline-none
placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground
focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]
disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive`
Label above it: `text-sm font-medium text-neutral-700` (auth uses `text-xs
font-medium leading-4 tracking-[-0.072px] text-neutral-800`). Error text:
`text-sm text-red-500` with `role="alert"`.

### Badge (cva) vs status pill
- Library Badge base: `inline-flex items-center justify-center rounded-md border
  px-2 py-0.5 text-xs font-medium w-fit gap-1 [&>svg]:size-3`; variants
  `default bg-primary text-primary-foreground` · `secondary` · `destructive` ·
  `outline text-foreground hover:bg-neutral-25`.
- **Preferred status pill (rounded-full, semantic family):**
  `inline-flex items-center rounded-full bg-gw-green-100 px-2.5 py-0.5 text-xs
  font-medium text-gw-green-700` — swap the family: green=good/verified,
  red=bad, orange=warning/unverified, blue=neutral-info. A "dot + label" status
  uses a leading `h-1.5 w-1.5 rounded-full bg-gw-green-500`.

### Avatar (Radix)
Root `relative flex size-8 shrink-0 overflow-hidden rounded-full` · Image
`aspect-square size-full` · Fallback `bg-muted flex size-full items-center
justify-center rounded-full`. Trigger focus: `focus:outline-hidden focus:ring-2
focus:ring-offset-2 focus:ring-primary rounded-full cursor-pointer`.

### Dialog (Radix)
Overlay `fixed inset-0 z-50 bg-black/50` (+ fade anim). Content `bg-background
fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2
-translate-y-1/2 gap-4 rounded-lg border p-6 shadow-lg sm:max-w-lg`. Title
`text-lg leading-none font-semibold`; Description `text-muted-foreground text-sm`;
Footer `flex flex-col-reverse gap-2 sm:flex-row sm:justify-end`.

### Tabs (Radix) — library default
List `bg-muted inline-flex h-9 w-fit items-center justify-center rounded-lg
p-[3px]`; Trigger `inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center
gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium
data-[state=active]:bg-background data-[state=active]:shadow-sm`.

---

## 2. Segmented control, filter chips, dropdown, tooltip (composed)

### Segmented control (tabs / period picker) — the dashboard idiom
Track: `inline-flex items-center gap-1 rounded-lg bg-neutral-50 p-1`.
Trigger: `cursor-pointer rounded-md px-4 py-1.5 text-sm font-medium text-neutral-500
transition-colors hover:text-neutral-900 data-[state=active]:bg-white
data-[state=active]:text-neutral-900 data-[state=active]:shadow-sm`.

### Toggle filter chips (multi-select)
`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs
font-medium transition-colors` — active `border-neutral-300 bg-neutral-100
text-neutral-900`, inactive `border-neutral-200 bg-white text-neutral-400
hover:border-neutral-300 hover:text-neutral-600`. (Optionally a small brand logo
before the label.)

### Custom single-select dropdown (no Radix; click-outside)
Use when you want full styling control. Trigger button: `flex w-44 items-center
justify-between gap-2 rounded-lg border px-3 py-1.5 text-sm text-neutral-700
transition-colors` (open: `border-neutral-300 bg-neutral-25`, closed:
`border-neutral-200 bg-white hover:bg-neutral-25`) + a `LuChevronDown` that does
`rotate-180` when open. Menu: `absolute right-0 z-20 mt-1 max-h-64 w-44
overflow-auto rounded-lg border border-neutral-100 bg-white py-1 shadow-s4`;
item: `flex w-full items-center px-3 py-1.5 text-left text-sm hover:bg-neutral-25`
(selected `font-medium text-neutral-900`, else `text-neutral-600`). Close on
outside `mousedown` via a `ref` + `document` listener. **Capitalize labels.**
(Stormbreaker's equivalent uses Radix `DropdownMenu` — Content `rounded-md border
p-1 shadow-s4`, RadioItem checked `data-[state=checked]:bg-primary-25
data-[state=checked]:text-primary-500`.)

### Info tooltip (hover/focus reveal, no dep)
A `<button>` (`aria-label` + `aria-describedby`) wrapping a `LuInfo`
(`h-3.5 w-3.5 text-neutral-400`), inside a `group relative inline-flex`. Bubble:
`pointer-events-none absolute right-0 top-6 z-20 w-72 rounded-lg border
border-neutral-100 bg-white px-3 py-2 text-left text-xs font-normal normal-case
leading-relaxed text-neutral-600 opacity-0 shadow-s4 transition-opacity
group-hover:opacity-100 group-focus-within:opacity-100`. Open **downward**
(`top-6`) and grow **leftward** (`right-0`) so an `overflow-hidden`/`overflow-x-auto`
ancestor (e.g. a table) can't clip it.

---

## 3. Cards

**Card surface:** `rounded-xl border border-neutral-100 bg-white shadow-s3`
(`overflow-hidden` if it holds a flush table/header).

**Metric (hero) card** — see SKILL.md quick recipe. Key bits: title `text-base
font-normal text-neutral-900` with a `h-5 w-5 text-primary-500` icon; value
`font-grotesk text-[32px] font-semibold leading-[140%] text-neutral-900`; change
pill `rounded-xl px-2.5 py-0.5 text-sm font-medium` in `gw-green-100/700` or
`gw-red-100/700`. Group metrics in ONE divided card: `flex flex-col divide-y
divide-neutral-100 overflow-hidden rounded-xl border border-neutral-100 bg-white
shadow-s3 sm:flex-row sm:divide-x sm:divide-y-0` (children `flex-1`).

**Chart card** — `flex h-full w-full flex-col rounded-xl border border-neutral-100
bg-white shadow-s3`: header `flex flex-col gap-0.5 px-5 py-3` (title `font-grotesk
text-lg font-medium text-neutral-900`, subtitle `text-[13px] text-neutral-500`) →
`border-t border-neutral-100` → body `min-h-0 flex-1 px-3 py-4` → optional legend
footer `flex items-center justify-center gap-4 rounded-b-xl border-t
border-neutral-100 bg-neutral-25 px-5 py-2` (each `LegendDot` = `h-3 w-3
rounded-full` swatch + `text-xs` label).

---

## 4. Tables (clean, light-divider)

```tsx
<div className="overflow-hidden rounded-xl border border-neutral-100 bg-white shadow-s3">
  <div className="overflow-x-auto">
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-y border-neutral-100 bg-neutral-25 text-xs font-semibold uppercase tracking-wide text-neutral-600">
          <th className="px-5 py-3 text-left">Page</th>
          <th className="px-5 py-3 text-right">Visits</th>
        </tr>
      </thead>
      <tbody>
        <tr className="border-b border-neutral-100 transition-colors last:border-0 hover:bg-neutral-25">
          <td className="max-w-md truncate px-5 py-3">
            <a href={url} target="_blank" rel="noopener noreferrer"
               className="group inline-flex items-center gap-0.5 text-neutral-700 hover:underline">
              {label}
              <LuArrowUpRight aria-hidden
                className="h-3.5 w-3.5 shrink-0 text-neutral-400 opacity-0 transition-opacity group-hover:opacity-100" />
            </a>
          </td>
          <td className="px-5 py-3 text-right font-medium text-neutral-900">{n.toLocaleString()}</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```
Empty state: `px-5 py-10 text-center text-sm text-neutral-400`. Collapsible nested
rows (operator → pages): a clickable parent `<tr>` with a `LuChevronDown` that
`rotate-180`s, then conditionally-rendered child `<tr className="… bg-neutral-25">`
with an indented (`pl-12`) first cell. Cap long lists (e.g. top 25) and show a
muted "Showing top N of M" row.

---

## 5. Charts (recharts)

```tsx
<ResponsiveContainer width="100%" height={280}>{/* DEFINITE height — see gotcha */}
  <LineChart data={data} margin={{ right: 12, left: 2, bottom: 8, top: 10 }}>
    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-neutral-100)" vertical horizontal={false} />
    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={12} minTickGap={28}
           tick={{ fill: 'var(--color-neutral-500)', fontSize: 12 }} />
    <YAxis stroke="var(--color-neutral-500)" fontSize={12} tickLine={false} axisLine={false}
           tickMargin={10} allowDecimals={false} />
    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#E5E7EB', strokeWidth: 1 }} />
    <Line type="linear" dataKey="clicks" stroke="var(--color-primary-500)" strokeWidth={3}
          dot={false} activeDot={{ r: 5, strokeWidth: 0 }} name="Clicks" />
  </LineChart>
</ResponsiveContainer>
```
Custom tooltip: `min-w-[160px] rounded-xl border border-neutral-100 bg-white px-3
py-2` + inline `boxShadow:'0 4px 20px rgba(0,0,0,0.08)'`; label `text-sm
font-semibold text-neutral-900 mb-2`; each row a `h-3 w-3 rounded-sm` swatch +
`text-sm text-neutral-500` name + `text-sm font-medium text-neutral-900` value.
Dual-axis (e.g. clicks vs impressions): second `<YAxis yAxisId="right"
orientation="right">` + per-line `yAxisId`, secondary line in `primary-200`
(`#99C6FF`).

**Gotchas:**
- **Definite height.** `ResponsiveContainer height="100%"` needs a parent with a
  resolved pixel height (e.g. a sibling that stretches the row). A *standalone*
  chart card has no such parent → it collapses to 0. Give the chart a fixed
  height (`height={280}` or a wrapper `style={{ height }}`).
- recharts focus rings: add `.recharts-wrapper *:focus { outline:none }` (in tokens css).
- Format dates UTC-safe (`Date.UTC(...)` + `timeZone:'UTC'`) so server/client agree.

Brand/operator logos for legends/rows: `react-icons/si` (`SiOpenai`,
`SiAnthropic`, `SiPerplexity`, `SiDuckduckgo`) + `react-icons/fa6` (`FaAmazon`),
tinted with the operator's chart color via `style={{ color }}`; fall back to a
generic `LuBot`.

---

## 6. App shell, nav bar, auth, desktop gate

### Nav bar
```tsx
<nav className="z-20 flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3">
  <a href="/"><img src="https://cdn.gushwork.ai/v2/gush_new_logo.svg" alt="Gushwork" className="h-[30px] w-[30px]" /></a>
  {/* right: user avatar — size-8 rounded-full; optionally a Radix DropdownMenu (name, email, logout) */}
</nav>
```
Full-app shell (stormbreaker): `h-screen overflow-hidden flex flex-col` → `<Navbar/>`
→ `<div className="flex-1 overflow-hidden">{children}</div>`. For a single
dashboard page: `flex min-h-screen flex-col` → Navbar → `<main className="flex-1
bg-[url('https://cdn.gushwork.ai/v2/gush-bg.webp')] bg-cover bg-fixed bg-center"><div className="mx-auto
max-w-6xl p-8">…</div></main>`.

### Page header (inside content)
Icon tile `flex h-10 w-10 items-center justify-center rounded-md bg-primary`
(white icon `h-6 w-6`) → title `text-[28px] font-semibold font-grotesk text-black`
→ subtitle `text-lg font-medium font-grotesk text-neutral-500`.

### Auth / login page
```tsx
<div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-8">
  <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent via-blue-50/30 to-blue-100/20" />
  <div className="pointer-events-none absolute inset-0 opacity-30"
       style={{ backgroundImage: 'url(https://cdn.gushwork.ai/v2/gush-bg.webp)', backgroundSize:'cover', backgroundPosition:'top' }} />
  <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-5">
    <img src="https://cdn.gushwork.ai/v2/gushwork.png" alt="Gushwork" width={126} height={100} className="object-contain" />
    <div className="w-full max-w-[420px] rounded-lg border border-neutral-100 bg-white p-6 shadow-[0_16px_40px_-8px_rgba(88,92,95,0.16)]">
      {/* form: flex flex-col gap-5; labels text-xs font-medium text-neutral-800; inputs border-neutral-100; primary button w-full */}
    </div>
  </div>
</div>
```
Divider between password + OAuth: `relative my-4` with `absolute inset-0 flex
items-center` → `w-full border-t border-neutral-200`, and a centered `bg-white
px-4 text-sm text-neutral-500` "or".

### Desktop-only gate (CSS, SSR-safe — no JS detection)
Render the gate and the app side by side; toggle by breakpoint. Below `lg`
(1024px) show the gate, at `lg+` show the app:
```tsx
<>
  <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center lg:hidden">
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-neutral-100 bg-white shadow-s3">
      <LuMonitor className="h-7 w-7 text-primary" />
    </div>
    <h1 className="font-grotesk text-xl font-semibold text-neutral-900">Best viewed on desktop</h1>
    <p className="max-w-sm text-sm text-neutral-500">Please open this on a desktop or laptop.</p>
  </div>
  <div className="hidden min-h-screen flex-col lg:flex">{/* nav + app */}</div>
</>
```

---

## 7. Cross-cutting patterns

- **`cn()`** = `clsx` + `tailwind-merge`; **`cva()`** for variant primitives. Tag
  composables with `data-slot` if you mirror the shadcn convention.
- **Focus** (interactive): `focus-visible:border-ring focus-visible:ring-ring/50
  focus-visible:ring-[3px]`. **Disabled**: `disabled:pointer-events-none
  disabled:opacity-50`. **SVG auto-size** in buttons: `[&_svg:not([class*='size-'])]:size-4`.
- **Hydration-safe client time** ("Last updated"): a `'use client'` component that
  formats `new Date(iso).toLocaleString(undefined, { dateStyle:'medium',
  timeStyle:'short' })` in a `useEffect` (render a `…` placeholder first) so the
  server (UTC) and client (local tz) don't mismatch. Wrap in `suppressHydrationWarning`.
- **Graceful empty states** everywhere data can be absent (`text-neutral-400`
  centered message inside the card), so a failing data source never blanks the page.
- **Metadata**: title `'Gushwork AI'`, `icons.icon` = the gushwork.ai favicon SVG
  (see design-tokens.md).
