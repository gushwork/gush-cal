# Gushwork Design Tokens

Verbatim from `gw-uimr-stormbreaker/packages/ui/src/styles/globals.css` (Tailwind
v4, `@theme inline`). Light mode only — the tokens are defined on **both** `:root`
and `.dark` so an OS/extension-injected `.dark` can't flip the UI.

## Colors

### Primary (the only accent) — `--primary` = `#0070FF`
| token | hex | | token | hex |
|---|---|---|---|---|
| `primary-25` | `#f2f8ff` | | `primary-400` | `#338CFF` |
| `primary-100` | `#CCE2FF` | | `primary-500` | `#0070FF` |
| `primary-200` | `#99C6FF` | | `primary-600` | `#0061e0` |
| `primary-300` | `#66A9FF` | | (`--primary` alias) | `#0070FF` |

### Neutral (custom scale — these are NOT Tailwind's grays)
| token | hex | use |
|---|---|---|
| `neutral-25` | `#F7F8F9` | page tint, table header, hover, zebra |
| `neutral-50` | `#F1F2F3` | segmented-control track |
| `neutral-100` | `#e1e3e8` | **all borders & dividers** |
| `neutral-200` | `#CFD1D4` | stronger divider / input border |
| `neutral-500` | `#878B94` | secondary text, axis labels |
| `neutral-600` | `#6a7077` | table header text, captions |
| `neutral-800` | `#4D545C` | strong body text |
| `neutral-900` | `#262A2E` | headings, values, primary text |
| `neutral-white` | `#fff` · `neutral-black` | `#0D0D0D` |

### Semantic / status families (each 50→900; use `-100` bg + `-700` text for pills)
- **gw-green** (good / verified): `500 #10B981`, `100 #D1FAE5`, `700 #047857`
- **gw-red** (error / bad): `500 #EF4444`, `100 #FEE2E2`, `700 #B91C1C`
- **gw-orange** (warning / unverified): `500 #F97316`, `100 #FFEDD5`, `700 #C2410C`
- **gw-yellow** (caution / pending): `500 #F59E0B`, `100 #FEF3C7`, `700 #B45309`
- **gw-blue** (neutral info / "named"): `500 #3B82F6`, `100 #DBEAFE`, `700 #1D4ED8`
- **gw-gray** (a full neutral ramp if you need Tailwind-style grays): `50 #F9FAFB` … `900 #111827`

(The full 50–900 for each family is in `globals.css`; the steps above are the ones
you actually reach for.)

### Chart series (blue ramp) — `--chart-1..5`
`#91c5ff`, `#3a81f6`, `#2563ef`, `#1a4eda`, `#1f3fad`. For a single-series chart
use `primary-500` (line) + `primary-200 #99C6FF` (secondary axis). For per-operator
multi-series, pick distinct stable hues and reuse them for the logo/legend/line.

## Shadows
| utility | value | use |
|---|---|---|
| `shadow-sm` | `0 1px 2px 0 hsl(0 0% 0% / .05), 0 1px 2px -1px hsl(0 0% 0% / .1)` | active pill in a segmented control |
| `shadow-s3` | `0 16px 32px -12px rgba(88,92,95,0.1)` | **cards / surfaces** |
| `shadow-s4` | `0 16px 40px -8px rgba(88,92,95,0.16)` | **floating: dropdown menus, modals, popovers, auth card** |

`shadow-s3` / `shadow-s4` are custom `@utility`s — define them (see globals.css below).

## Radius — `--radius: 0.625rem` (10px)
`rounded-md` (≈6px, inputs/buttons) · `rounded-lg` (10px, dialogs, menu) ·
`rounded-xl` (≈14px, **cards**) · `rounded-full` (pills, chips, avatars).

## Typography
- **`--font-sans` = Inter** (default body). Next: `Inter({ variable: '--font-inter', subsets: ['latin'] })`.
- **`--font-grotesk` = VertGroteskDisplayVF** — headings **and large numbers**.
  Next: `localFont({ src: '…/VertGroteskDisplayVF.ttf', variable: '--font-grotesk', weight: '100 900' })`.
  Exposed as the `font-grotesk` utility (`@utility font-grotesk { font-family: var(--font-grotesk); }`).
- `--font-mono` for code only.
- Type scale in practice: section title `text-[28px] font-semibold font-grotesk`;
  metric value `text-[32px] font-semibold font-grotesk leading-[140%]`; card title
  `text-lg font-medium/semibold font-grotesk`; subtitle `text-[13px] text-neutral-500`;
  body `text-sm`; captions/labels `text-xs` (often `uppercase tracking-wide`).

## CDN assets (use directly; for `next/image` add the host to `images.remotePatterns`, or use a plain `<img>`)
- Nav logo: `https://cdn.gushwork.ai/v2/gush_new_logo.svg` (30×30)
- Auth/wordmark logo: `https://cdn.gushwork.ai/v2/gushwork.png` (~126×100)
- Background wash: `https://cdn.gushwork.ai/v2/gush-bg.webp` (`bg-cover bg-center`)
- Favicon (gushwork.ai): `https://cdn.prod.website-files.com/65c292289fb0ea1ff3a84bd3/6807f0d918342111b78873bd_gushwork-fav-con-32X32px.svg`
  · apple-touch `…/6807f0e14293572697e60cb9_gushwork-256X256px.png`

## Drop-in `globals.css` (core — Tailwind v4)
```css
@import 'tailwindcss';

@custom-variant dark (&:is(.dark *));

/* Light tokens on :root AND .dark so injected .dark can't flip the UI */
:root, .dark {
  color-scheme: light;
  --background: #ffffff; --foreground: #0a0a0a;
  --primary: #0070ff; --primary-foreground: #ffffff;
  --border: #e1e3e8; --ring: #66a9ff;
  --destructive: #dc2626; --success: #10b981;
  --muted: #f1f2f3; --muted-foreground: #6a7077;
  --radius: 0.625rem;
  --shadow-sm: 0 1px 2px 0px hsl(0 0% 0% / 0.05), 0 1px 2px -1px hsl(0 0% 0% / 0.1);
  --shadow-s3: 0 16px 32px -12px rgba(88, 92, 95, 0.1);
  --shadow-s4: 0 16px 40px -8px rgba(88, 92, 95, 0.16);
  --font-sans: var(--font-inter, ui-sans-serif), system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;

  /* neutral (custom) */
  --colors-neutral-900:#262A2E; --colors-neutral-800:#4D545C; --colors-neutral-600:#6a7077;
  --colors-neutral-500:#878B94; --colors-neutral-200:#CFD1D4; --colors-neutral-100:#e1e3e8;
  --colors-neutral-50:#F1F2F3; --colors-neutral-25:#F7F8F9;
  /* primary */
  --colors-primary-25:#f2f8ff; --colors-primary-100:#CCE2FF; --colors-primary-200:#99C6FF;
  --colors-primary-300:#66A9FF; --colors-primary-400:#338CFF; --colors-primary-500:#0070FF; --colors-primary-600:#0061e0;
  /* status families: paste the 50–900 ramps for gw-green/red/orange/yellow/blue/gray from the uimr globals.css */
  --colors-gw-green-100:#D1FAE5; --colors-gw-green-700:#047857;
  --colors-gw-red-100:#FEE2E2;   --colors-gw-red-700:#B91C1C;
  --colors-gw-orange-100:#FFEDD5;--colors-gw-orange-700:#C2410C;
  --colors-gw-blue-100:#DBEAFE;  --colors-gw-blue-700:#1D4ED8;
}

@theme inline {
  --color-background: var(--background); --color-foreground: var(--foreground);
  --color-primary: var(--primary); --color-primary-foreground: var(--primary-foreground);
  --color-primary-25: var(--colors-primary-25); --color-primary-100: var(--colors-primary-100);
  --color-primary-200: var(--colors-primary-200); --color-primary-300: var(--colors-primary-300);
  --color-primary-400: var(--colors-primary-400); --color-primary-500: var(--colors-primary-500);
  --color-primary-600: var(--colors-primary-600);
  --color-neutral-25: var(--colors-neutral-25); --color-neutral-50: var(--colors-neutral-50);
  --color-neutral-100: var(--colors-neutral-100); --color-neutral-200: var(--colors-neutral-200);
  --color-neutral-500: var(--colors-neutral-500); --color-neutral-600: var(--colors-neutral-600);
  --color-neutral-800: var(--colors-neutral-800); --color-neutral-900: var(--colors-neutral-900);
  --color-gw-green-100: var(--colors-gw-green-100); --color-gw-green-700: var(--colors-gw-green-700);
  --color-gw-red-100: var(--colors-gw-red-100);     --color-gw-red-700: var(--colors-gw-red-700);
  --color-gw-orange-100: var(--colors-gw-orange-100);--color-gw-orange-700: var(--colors-gw-orange-700);
  --color-gw-blue-100: var(--colors-gw-blue-100);   --color-gw-blue-700: var(--colors-gw-blue-700);
  --color-border: var(--border); --color-ring: var(--ring); --color-muted-foreground: var(--muted-foreground);
  --font-sans: var(--font-sans);
  --font-grotesk: var(--font-grotesk, var(--font-sans));
  --radius-sm: calc(var(--radius) - 4px); --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius); --radius-xl: calc(var(--radius) + 4px);
  --shadow-sm: var(--shadow-sm); --shadow-s3: var(--shadow-s3); --shadow-s4: var(--shadow-s4);
}

@layer base { * { @apply border-border; } body { @apply bg-background text-foreground; } }

@utility font-grotesk { font-family: var(--font-grotesk); }
@utility shadow-s3 { box-shadow: var(--shadow-s3); }
@utility shadow-s4 { box-shadow: var(--shadow-s4); }

/* recharts: kill the focus outline on chart elements */
.recharts-wrapper *:focus { outline: none !important; box-shadow: none !important; }
```

### `layout.tsx` font wiring (Next.js)
```tsx
import { Inter } from 'next/font/google';
import localFont from 'next/font/local';
const inter = Inter({ variable: '--font-inter', subsets: ['latin'] });
const grotesk = localFont({ src: '../../public/fonts/VertGroteskDisplayVF.ttf',
  variable: '--font-grotesk', weight: '100 900', display: 'swap' });
// <html className={`${inter.variable} ${grotesk.variable}`}><body className="font-sans antialiased">
```

## Optional decorative flourishes (present in the uimr `globals.css`)
- `.shimmer-text` — animated gradient text mask (loading headlines).
- `.gw-loader` + `.gw-blob--pink` / `.gw-blob--blue` — large blurred drifting
  gradient blobs for hero/empty backgrounds (respect `prefers-reduced-motion`).
- `.gradient-pendulum-x` — sliding gradient background for skeletons.
Copy these from the source verbatim if a surface calls for them; they're not
needed for standard dashboards.
