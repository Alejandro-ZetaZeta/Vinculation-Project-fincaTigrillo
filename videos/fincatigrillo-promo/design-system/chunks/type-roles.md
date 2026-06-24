# Type-roles atlas — Emerald Editorial

Phase 4b scene worker reads this when text outside §6 components is needed (hero displays, ledes, pill rows, CTA buttons, …). Workflow: pick role by id → paste the CSS rule into scene `<style>` with `s<N>-` prefix on the class names → wrap content using the prefixed class. Family tokens (`var(--font-*)`) resolve to brand DNA at scene-render time.

## type-role: numeral-jumbo

- family: display · px: 320–460 · weight: 900
- leading: 0.9 · tracking: -0.04em · case: upper
- purpose: hero numeral on inverse navy section-opener panel — the 460px playbill mass

```css
.t-trole-numeral-jumbo {
  display: inline-block;
  font-family: var(--font-display);
  font-weight: 900;
  font-size: clamp(160px, 24vw, 460px);
  line-height: 0.9;
  letter-spacing: -0.04em;
  text-transform: uppercase;
  color: var(--canvas);
  background: var(--ink);
  padding: 40px 56px;
}
```

Sample:

```html
<div class="t-trole-numeral-jumbo">Q3</div>
```

## type-role: display-section

- family: display · px: 160–200 · weight: 900
- leading: 0.9 · tracking: -0.015em · case: title
- purpose: agenda / section-title hero (the Programme scale)

```css
.t-trole-display-section {
  font-family: var(--font-display);
  font-weight: 900;
  font-size: clamp(96px, 12vw, 200px);
  line-height: 0.9;
  letter-spacing: -0.015em;
  color: var(--ink);
}
```

Sample:

```html
<div class="t-trole-display-section">The Programme</div>
```

## type-role: display-cover

- family: display · px: 144–184 · weight: 900
- leading: 0.92 · tracking: -0.01em · case: upper
- purpose: cover masthead title (184px Bodoni 900)

```css
.t-trole-display-cover {
  font-family: var(--font-display);
  font-weight: 900;
  font-size: clamp(96px, 11vw, 184px);
  line-height: 0.92;
  letter-spacing: -0.01em;
  text-transform: uppercase;
  color: var(--ink);
}
```

Sample:

```html
<div class="t-trole-display-cover">STATE</div>
```

## type-role: display

- family: display · px: 104–130 · weight: 900
- leading: 0.96 · tracking: -0.015em · case: title
- purpose: statement / pull-quote scale headline

```css
.t-trole-display {
  font-family: var(--font-display);
  font-weight: 900;
  font-size: clamp(72px, 8.5vw, 130px);
  line-height: 0.96;
  letter-spacing: -0.015em;
  color: var(--ink);
}
```

Sample:

```html
<div class="t-trole-display">Three Threads Worth Following.</div>
```

## type-role: headline

- family: display · px: 80–104 · weight: 900
- leading: 1 · tracking: -0.02em · case: title
- purpose: routine slide headline (the 92px default)

```css
.t-trole-headline {
  font-family: var(--font-display);
  font-weight: 900;
  font-size: clamp(56px, 6vw, 104px);
  line-height: 1;
  letter-spacing: -0.02em;
  color: var(--ink);
}
```

Sample:

```html
<div class="t-trole-headline">The Quarter, In Review.</div>
```

## type-role: ornament-word

- family: display · px: 60–84 · weight: 800
- leading: 1 · tracking: 0.02em · case: lower
- purpose: small connector word bracketed by the double-rule ornament ("of", "and", "for")

```css
.t-trole-ornament-word {
  display: inline-block;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(48px, 5.5vw, 84px);
  line-height: 1;
  letter-spacing: 0.02em;
  padding: 0 6px;
  color: var(--ink);
}
```

Sample:

```html
<span class="t-trole-ornament-word">of</span>
```

## type-role: kpi-figure

- family: display · px: 120–144 · weight: 900
- leading: 0.9 · tracking: -0.03em · case: upper
- purpose: KPI-tile numeral on inverse navy tile (144px Bodoni 900)

```css
.t-trole-kpi-figure {
  font-family: var(--font-display);
  font-weight: 900;
  font-size: clamp(96px, 11vw, 144px);
  line-height: 0.9;
  letter-spacing: -0.03em;
  color: var(--canvas);
  background: var(--ink);
  padding: 28px 40px;
  display: inline-block;
}

.t-trole-kpi-figure .u {
  font-size: 0.42em;
  margin-left: 4px;
  font-weight: 800;
}
```

Sample:

```html
<div class="t-trole-kpi-figure">94<span class="u">%</span></div>
```

## type-role: stat-figure

- family: display · px: 80–92 · weight: 900
- leading: 1 · tracking: -0.02em · case: upper
- purpose: secondary stat numeral in a side panel (92px Bodoni 900)

```css
.t-trole-stat-figure {
  font-family: var(--font-display);
  font-weight: 900;
  font-size: clamp(64px, 7vw, 92px);
  line-height: 1;
  letter-spacing: -0.02em;
  color: var(--ink);
}

.t-trole-stat-figure .u {
  font-size: 0.52em;
  margin-left: 2px;
}
```

Sample:

```html
<div class="t-trole-stat-figure">+24<span class="u">%</span></div>
```

## type-role: title-card

- family: display · px: 40–64 · weight: 800
- leading: 1.05 · tracking: -0.005em · case: title
- purpose: Bodoni 800 title inside a card / agenda-row name / chart take-away

```css
.t-trole-title-card {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(32px, 4vw, 64px);
  line-height: 1.05;
  letter-spacing: -0.005em;
  color: var(--ink);
}
```

Sample:

```html
<div class="t-trole-title-card">A Reading Of The Data</div>
```

## type-role: eyebrow

- family: body · px: 24–28 · weight: 800
- leading: 1.2 · tracking: 0.18em · case: upper
- purpose: Manrope 800 uppercase eyebrow above a headline (0.18em tracking)

```css
.t-trole-eyebrow {
  font-family: var(--font-body);
  font-weight: 800;
  font-size: clamp(24px, 1.8vw, 28px);
  line-height: 1.2;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ink);
}
```

Sample:

```html
<div class="t-trole-eyebrow">A Reading Of The Period</div>
```

## type-role: label

- family: body · px: 24–28 · weight: 700
- leading: 1.2 · tracking: 0.08em · case: upper
- purpose: masthead / footline label (Manrope 700, 0.08em)

```css
.t-trole-label {
  font-family: var(--font-body);
  font-weight: 700;
  font-size: clamp(24px, 1.8vw, 28px);
  line-height: 1.2;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink);
}
```

Sample:

```html
<div class="t-trole-label">Data Study · Quarterly Movement</div>
```

## type-role: tag

- family: body · px: 24–26 · weight: 800
- leading: 1 · tracking: 0.12em · case: upper
- purpose: inverse pill / chip mark (ink bg, emerald text, Manrope 800 0.12em)

```css
.t-trole-tag {
  display: inline-block;
  font-family: var(--font-body);
  font-weight: 800;
  font-size: clamp(24px, 1.6vw, 26px);
  line-height: 1;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  background: var(--ink);
  color: var(--canvas);
  padding: 10px 22px;
}
```

Sample:

```html
<span class="t-trole-tag">Three Themes</span>
```

## type-role: caption

- family: body · px: 24–26 · weight: 700
- leading: 1.35 · tracking: 0.1em · case: upper
- purpose: agenda-row kind label / chart axis / KPI sub-label (Manrope 700 uppercase 0.1em)

```css
.t-trole-caption {
  font-family: var(--font-body);
  font-weight: 700;
  font-size: clamp(24px, 1.6vw, 26px);
  line-height: 1.35;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink);
}
```

Sample:

```html
<div class="t-trole-caption">Overview · 8 Min</div>
```

## type-role: delta-pill

- family: body · px: 24–26 · weight: 800
- leading: 1 · tracking: 0.08em · case: upper
- purpose: directional change chip inside a KPI tile (emerald bg, navy text on ink tile)

```css
.t-trole-delta-pill {
  display: inline-block;
  font-family: var(--font-body);
  font-weight: 800;
  font-size: clamp(24px, 1.6vw, 26px);
  line-height: 1;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: var(--canvas);
  color: var(--ink);
  padding: 6px 16px;
  border: 2px solid var(--ink);
}
```

Sample:

```html
<span class="t-trole-delta-pill">+ 12.4%</span>
```
