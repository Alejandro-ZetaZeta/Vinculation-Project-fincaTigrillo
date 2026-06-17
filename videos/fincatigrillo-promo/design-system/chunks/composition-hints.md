# Composition hints — Emerald Editorial

- **Default surface:** `var(--canvas)` (the site's brand canvas). Reach for `var(--ink)` as the full slide surface only for section-opener and closing moments.
- **Default text on canvas:** `var(--ink)`. **Default text on ink:** `var(--canvas)`. The system has exactly one color flip — never introduce a third (e.g. paper-on-ink) without explicit reason.
- **Focal element sizing:** one display headline per scene at 92-200px Bodoni-equivalent. Hero / cover scenes go to 184px; jumbo numeral panels go to 460px. Routine headlines stay at 92-104px. Pick from the ladder (92 / 104 / 120 / 128 / 130 / 184 / 200) — never invent a new size.
- **Tile rotation:** in any row of 3-4 supporting tiles (KPI grid, process flow), alternate `--ee-inverse-bg` (ink) and `--ee-paper` (alt-surface) tiles. Three all-ink tiles in a row reads as monotony; pattern is `ink → paper → ink → paper`.
- **Rule rhythm:** every section separator, list-row border, tile internal divider is a 4px solid `var(--ink)` rule. Never 1px, never 2px (2px is reserved for chart grid lines only), never dashed.
- **Ornament use:** the double-rule ornament works best around a small connector word between two display lines. Don't use it as page-wide decoration without a word inside the bracket — the bracket without a word reads as broken.
- **Density:** one display headline + 3-4 supporting tiles is the rhythm. A scene with six small elements breaks the editorial register; if you find yourself crowding, increase the headline size and drop tiles.
- **No corner radius anywhere.** Pills, tags, tiles, panels, bars, ornament strips — all strict rectangles. The only curves are inside the Bodoni glyphs themselves.
- **No shadows, no gradients, no glass.** If a scene needs depth, invert a tile or add a 4px rule. Never reach for box-shadow.
- **Masthead/footline chrome:** cover and closing scenes carry a top + bottom Manrope row (two uppercase strings, opposite sides) at `top/bottom: 56px, side: 80px`. Content scenes typically skip the chrome and let the 110px-top padding hold the page.
- **Section-opener pattern:** a 50/50 split where the left half is a solid `var(--ink)` panel holding a jumbo Bodoni numeral (~460px) and the right half is canvas with eyebrow + headline + lede + mark chips.
- **Transition vocabulary:** snap-cut or `--ee-paper` page-flip wipe. Never crossfade.
- **Brand color placement:** if the site exposes `--brand-primary`, prefer it for the **rule-fill accent** moments (small inline highlights on display headlines, like an underlined word in a magazine). Keep the dominant text in `--ink`.
