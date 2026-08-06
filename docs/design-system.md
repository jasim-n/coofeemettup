# Coffee Meetups — Design System (v2.0)

The web app follows the **Coffee Meetups Design System v2.0**: green brand, slate
neutrals, **Poppins** everywhere. Tokens live in `apps/web/src/app/globals.css`
as CSS variables (OKLCH) — always use the tokens / utility classes, never
hardcode colours.

## Brand colour — GREEN
| Token | Hex | OKLCH (in globals.css) | Usage |
|---|---|---|---|
| Primary 500 | `#16A34A` | `oklch(0.63 0.17 149)` | `--primary`, `--ring` |
| Primary 600 | `#15803D` | — | hovers |
| Primary 700 | `#166534` | `oklch(0.45 0.11 151)` | `--secondary-foreground` |
| Emerald | `#10B981` | `oklch(0.72 0.15 163)` | gradient end, `--chart-2` |
| Primary gradient | `#16A34A → #10B981` | `--gradient-hero` | hero buttons, `text-gradient-hero` |

## Neutrals — Slate
`#0F172A` (900, text/ink) · `#334155` (700) · `#64748B` (500, muted-fg) ·
`#CBD5E1` (300) · `#F1F5F9` (100, muted) · `#F8FAFC` (50, background).
Dark panels use `bg-ink` (deep forest green).

## Semantic
Success `#22C55E` · Warning `#F59E0B` (`--accent-amber`) · Error `#EF4444`
(`--destructive`) · Info `#3B82F6` · Purple `#8B5CF6` · Pink `#EC4899`
(`--accent-pink`).

## Typography — Poppins (all)
Hero 52/700 · Page 36/700 · Section 28/600 · Card 20/600 · Sub 18/500 ·
Body-Lg 16/400 · Body 15/400 · Small 14/400 · Caption 13/400.
`--font-heading` and `--font-sans` are both Poppins (`layout.tsx`). Helpers:
`.display` (heavy hero), `.eyebrow` (upper tracked label), `.font-heading`.

## Spacing / radius / shadows
8px base unit · radius 4–24 + full (`--radius: 1rem`) · shadows XS–XL
(rgba slate `#0F172A`); app maps `--shadow-soft` (elevation) + `--shadow-glow`
(green brand glow).

## Utilities (globals.css)
`bg-gradient-hero` · `bg-gradient-ember` · `bg-gradient-sky` ·
`text-gradient-hero` · `bg-ink` · `shadow-glow` · `shadow-soft` · `glass` ·
`glass-dark`.

## Reference
Source PDFs: `coffee-meetups-design-web.pdf` (9 screens) + `design system.pdf`.
Screens: Home · Explore · Nearby (map+list) · Meetups · Messages · Profile ·
Table detail · Search results · Profile dropdown. (The current app keeps its
own routes/model — Tables/Requests — and applies these tokens.)
