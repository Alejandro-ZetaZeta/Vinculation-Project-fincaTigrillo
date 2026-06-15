// Emerald Editorial motion: paper-and-ink. Type sets like a typewriter
// would set it — deliberate, with clear arrivals. Avoid rubber-band / bouncy.
// Decorative rules draw on like a pen across paper.

const EASE = {
  entry: "expo.out", // headlines arrive decisively, then settle
  emphasis: "power3.out", // ornament words pop in over the rule-draw
  exit: "power2.in", // exits accelerate (book closing)
  drift: "sine.inOut", // chrome (masthead, footline) breathes very slowly
  // Optional: rule-draw — bracket lines extend horizontally with a slight ease-out
  rule: "power2.out",
};

const DUR = {
  snap: 0.16, // small chrome reveals (chips, eyebrows)
  med: 0.45, // primary headline / display arrivals
  slow: 0.9, // ornament rule-draw, jumbo numeral lockup
};

// RULE: never use back / elastic / bounce easing — overshoot breaks the
//       printed-ink discipline. The system is press-and-stop, not spring.
// RULE: ornament double-rule lines draw left-to-right (scaleX 0 -> 1) with
//       transform-origin: left. The connector word fades in AFTER both
//       lines have fully drawn (stagger by DUR.med).
// RULE: jumbo Bodoni numerals (200px+) scale in from 0.9 -> 1 with EASE.entry
//       and DUR.slow. Never spin, skew, or 3D-rotate them.
// RULE: text-transform: uppercase content (chrome labels) reveals via opacity
//       only — never per-letter splittext, which fights the wide tracking.
