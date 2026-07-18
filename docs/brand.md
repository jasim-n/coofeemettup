# Brand & Design System

Warm coffee base + vibrant coral — a warm, social, Instagram-native identity for Gen-Z/young-millennial users in Pakistan. Synthesized from two design-subagent directions. Implemented via shadcn/ui CSS variables (so the whole app inherits it).

## Personality
"Find your people over coffee." Warm, inviting, safe, shareable — not a plain admin tool.

## Wordmark
`☕ Coffee Meetups` in **Syne** (extrabold). Component: `apps/web/src/components/wordmark.tsx`.

## Fonts (free, next/font/google — `apps/web/src/app/layout.tsx`)
- **Heading/display:** Syne (600–800) → `--font-heading` → `font-heading` utility
- **Body/UI:** Plus Jakarta Sans (400–700) → `--font-sans`

## Palette (light, OKLCH — `apps/web/src/app/globals.css :root`)
- `--background` warm cream `oklch(0.98 0.012 75)` · `--foreground` espresso `oklch(0.2 0.03 50)`
- `--primary` coral `oklch(0.63 0.19 30)` (white fg) — buttons, links, map pins
- `--secondary` pale amber · `--accent` warm honey `oklch(0.9 0.07 55)` · `--muted` warm off-white
- `--destructive` `oklch(0.58 0.22 27)` · `--border`/`--input` warm `oklch(0.9 0.02 75)` · `--ring` coral
- `--radius` `0.9rem` (friendlier)
- `--gradient-hero` sunset: `linear-gradient(135deg, coral → warm pink → amber)` → utilities `.bg-gradient-hero`, `.text-gradient-hero`

## Applied
- Login: full gradient hero + white wordmark + tagline + lifted card.
- Home: cream bg, wordmark, gradient headline "Find your people **over coffee**", ISLAMABAD · LAHORE.
- Events: Syne heading + titles, hover-lift cards, color-coded gender-track badges (women=pink, men=sky, mixed=accent).
- Map: coral pins; centers on the user's **geolocation** (fallback Islamabad).
- Everything else (buttons, badges, cards, admin) inherits the tokens automatically.

Screenshots: `e2e/shots/brand-*.png`.
