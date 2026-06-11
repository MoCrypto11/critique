# Critique — UI/UX Review (Arc as quality reference)

- **Date:** 2026-06-11
- **Subject:** https://usecritique.xyz (homepage)
- **Reference for quality only:** https://www.arc.io (`arc.network` → `www.arc.io`)
- **Status:** Audit / recommendations only. **No code was changed.**

> Arc is used as a *quality bar* (restraint, whitespace, infrastructure tone), **not**
> a template to copy. Do not copy Arc's font files, assets, icons, wording, or dark theme
> wholesale. Critique keeps its own **green / teal / ivory / dark-ink** identity — the
> recommendations below make that identity feel more premium, not more Arc-like.

## Snapshot of what each side does today

**Critique homepage order:** Header → Hero (animated teal arcs, serif headline, no buttons) →
CTA card ("Start focused") → How it works (accordion steps) → Feedback formats (4 cards) →
For founders (5 cards) → Contributor experience (card) → FAQ (accordion) → large dark "Arc Network"
section → one-line dark footer.

**Arc reference, in short:** confident sans-serif hero ("Build real-world finance onchain"),
restrained geometric motion, dark neutral palette with functional accents, categorized header
nav, consistent line-icon cards with generous whitespace, varied section rhythm, and a structured
multi-column footer. Premium comes from **restraint + whitespace + hierarchy**, not decoration.

---

## Recommendations (30)

### 1. Overall first impression
- **Current:** Reads as a competent product page but slightly "template/editorial" — many similar
  card grids stacked at even spacing; the serif headline sets a magazine tone rather than
  infrastructure.
- **Arc reference:** Immediately feels like infrastructure: few elements, large confident type,
  lots of air.
- **Improvement:** Reduce the number of stacked card sections (see #16/#24), widen vertical
  spacing, and shift headline tone to "modern infrastructure" (see #3). Aim for fewer, stronger
  sections.
- **Priority:** High

### 2. Hero section strength
- **Current:** After removing the photo, the hero is headline + subcopy + a *faint* animated arc
  layer. It can feel under-filled on large screens with nothing anchoring the right side.
- **Arc reference:** Restrained but clearly present geometric motion gives the hero a focal point
  without a photo.
- **Improvement:** Keep the no-photo direction, but give the hero one on-brand anchor — e.g. a
  slightly more present (still subtle) motion layer, or an abstract product-UI motif (a stylized
  bounty/approval card in mint/ivory). Do not add a literal screenshot or stock image.
- **Priority:** High

### 3. Hero headline wording & typography
- **Current:** Headline uses `font-display` = `"Californian FB", Georgia, "Times New Roman", serif`.
  Californian FB is an Office-bundled decorative serif that is **absent on most Macs, Linux, and
  mobile**, so the majority of visitors actually see **Georgia/Times** — a generic serif. This is
  the single biggest "feels less premium / inconsistent across devices" tell.
- **Arc reference:** A single, deliberately chosen modern sans at large scale, rendered identically
  everywhere.
- **Improvement:** Self-host one licensed display family and stop relying on a local-only font.
  Best fit for the "infrastructure" tone: a clean grotesk/geometric sans (e.g. open-licensed
  General Sans, Geist, or Inter Display) for headlines. If the serif identity is intentional,
  then self-host a real licensed serif (e.g. Fraunces/Newsreader) so it never falls back to
  Georgia. Either way: **stop shipping Californian FB as the primary.**
- **Priority:** High

### 4. Background motion / geometric layer
- **Current:** The CSS-animated arc layer is heavily masked and low-opacity; on many displays the
  motion is barely perceptible, so the effort doesn't read.
- **Arc reference:** Motion is subtle but *noticeable* and purposeful.
- **Improvement:** Modestly raise the visible-zone stroke opacity / size of the motion layer so it
  registers within a few seconds, and ensure it has a clear focal cluster on the open right side.
  Keep `prefers-reduced-motion` off-switch. Don't over-animate.
- **Priority:** Medium

### 5. Header alignment & spacing
- **Current:** Header is `max-w-7xl` and now aligns with the hero column (good). Vertical height
  `min-h-[72px]` is fine. It's transparent over the hero, which is clean.
- **Arc reference:** Clean horizontal header, balanced logo vs nav, comfortable padding.
- **Improvement:** Mostly good — keep. Minor: add a faint bottom hairline/`backdrop-blur` only
  *after* scroll (sticky state) so the header stays legible over white content lower down.
- **Priority:** Low

### 6. Logo placement & sizing
- **Current:** "CQ" SVG icon + "Critique" wordmark, left-aligned, ~46–70px icon. Reasonable.
- **Arc reference:** Logo is present but doesn't dominate; balanced against nav.
- **Improvement:** Keep placement. Ensure the icon is optically centered with the wordmark
  baseline and that the wordmark weight matches the chosen display font (see #3) for consistency.
- **Priority:** Low

### 7. Navigation arrangement
- **Current:** Three centered links (How it works, Create, FAQ) + wallet right. Simple and
  appropriate for the product's size.
- **Arc reference:** Categorized dropdowns for a larger information architecture.
- **Improvement:** Keep it simple — Critique doesn't need dropdowns. Optionally add a single
  "Dashboard" affordance for connected users (already conditional). Don't over-build the nav.
- **Priority:** Low

### 8. Wallet button placement & visual style
- **Current:** Single clean control per state (Connect / Switch to Arc / connected pill with
  dropdown), right-aligned. This is already good and matches "one clean control."
- **Arc reference:** Primary action consistent and subordinate styling for secondary.
- **Improvement:** Keep. Minor polish: the connected pill's green status dot + "Arc" tag is good;
  ensure the dropdown menu shares the card radius/shadow scale used elsewhere.
- **Priority:** Low (keep)

### 9. CTA card placement under hero
- **Current:** A "Start focused / Create your first feedback bounty" `.surface` card sits directly
  under the hero (already moved out of the hero). Good transition.
- **Arc reference:** CTAs appear after a value statement, not crowded into the hero.
- **Improvement:** Keep. Watch that it doesn't *duplicate* the hero's job too closely — the hero
  subcopy and the CTA description say similar things. Tighten one of them so they complement
  rather than echo.
- **Priority:** Low (keep, minor copy tighten)

### 10. Button hierarchy
- **Current:** Primary = deep-green filled (`.btn-primary`), Secondary = white bordered
  (`.btn-secondary`). Consistent and readable. The dark Arc section introduces white-filled and
  ghost-white buttons.
- **Arc reference:** Consistent verb-led labels, clear primary vs subordinate.
- **Improvement:** Keep the two-tier system. Standardize labels to verb-led, parallel phrasing
  ("Create a bounty" / "Preview a bounty"). Ensure only **one** primary (green) button is visible
  per viewport so the eye has a single target.
- **Priority:** Medium

### 11. Color palette
- **Current:** Warm ivory surfaces (`#f8f5eb`/`#fffdf7`), deep green action `#116149`, mint
  accents, dark ink text. Cohesive and *distinct from Arc* — a strength.
- **Arc reference:** Dark neutral + functional accents.
- **Improvement:** **Keep the light green/ivory identity** — it's a differentiator, do not switch
  to a dark theme. One controlled adjustment: the page ends with two heavy dark zones (Arc section
  + dark footer) abutting ivory; soften that transition (see #19/#23) so the palette feels
  intentional rather than abruptly switching.
- **Priority:** Medium

### 12. Typography (body & scale)
- **Current:** Body is `system-ui` sans (fine), headings are the serif display. Section headings
  repeat the same size (`text-3xl sm:text-4xl`) everywhere, so there's little typographic
  hierarchy between the page-level hero and section headers.
- **Arc reference:** Clear type scale; hero dominates, sections step down deliberately.
- **Improvement:** Define a small type scale (display / H2 / H3 / body / caption) and apply it
  consistently. Pair the new display font (#3) with the system sans for body. Increase line-height
  on dense card body copy slightly for a more premium read.
- **Priority:** Medium

### 13. Icon style
- **Current:** Mostly lucide line icons at `strokeWidth 2`, often inside green-tint chips
  (`bg-action/10`). But treatment is inconsistent: "How it works", "Feedback formats", "Contributor
  experience" use tinted chips, while "For founders" uses **bare** icons with no chip.
- **Arc reference:** One consistent line style and container treatment across all cards.
- **Improvement:** Pick **one** icon container treatment (recommend the tinted rounded chip) and
  apply it to every feature/use-case card. Keep a single stroke weight. Replace the CSS
  border-rotate chevrons (#18) with a real lucide `ChevronDown` for crispness.
- **Priority:** Medium

### 14. Card design
- **Current:** `.surface` cards are consistent (rounded-2xl, `border-line/70`, very subtle shadow,
  ivory). Good baseline, but the shadow is so light that borders do all the work — can read flat,
  and there's no hover state on most cards.
- **Arc reference:** Generous internal whitespace, subtle elevation, calm density.
- **Improvement:** Add a touch more internal padding on dense cards, a slightly stronger but still
  soft shadow, and a subtle hover lift/border-tint on interactive cards. Keep the radius scale
  uniform.
- **Priority:** Medium

### 15. Section spacing
- **Current:** Almost every body section uses the same `py-10 sm:py-12`. Even spacing makes the
  page feel like a uniform stack rather than grouped ideas.
- **Arc reference:** Generous, slightly varied vertical rhythm that groups concepts and gives the
  page "breath."
- **Improvement:** Introduce a spacing scale: larger gaps between *major* movements (hero → how it
  works → social/contributor → FAQ) and tighter gaps within a movement. Increase the base section
  padding (e.g. `py-16/20`) for a more premium, less compressed feel.
- **Priority:** Medium

### 16. Main page content order
- **Current:** Hero → CTA → How it works → Feedback formats → For founders → Contributor experience
  → FAQ → Arc Network → footer. That's three consecutive card-grid sections ("Feedback formats",
  "For founders", and partly "Contributor experience") that feel similar.
- **Arc reference:** Fewer, more differentiated sections.
- **Improvement:** Merge "Feedback formats" and "For founders" into one "What you can do with
  Critique" section (or alternate their layouts), and move the heavy Arc section to a slim strip
  near the footer (see #24). Target ~5 strong sections instead of 8.
- **Priority:** Medium

### 17. How it works section
- **Current:** The four core steps are rendered as **accordions that are collapsed by default**
  (only one open). The product's central explanation is hidden behind clicks.
- **Arc reference:** Value/steps are shown openly and scannable.
- **Improvement:** Show all four steps at a glance as a simple numbered 4-up row/grid (icon, "Step
  N", title, one line of body) — no accordion. Reserve accordions for the FAQ only.
- **Priority:** High

### 18. FAQ section
- **Current:** Accordion with a centered heading and real `<button aria-expanded>` toggles — good
  pattern and accessible. Chevron is a CSS border-rotate.
- **Arc reference:** Clean, scannable support content.
- **Improvement:** Keep the accordion. Swap the CSS-rotate chevron for a lucide `ChevronDown`
  (consistency with #13). Optionally allow deep-linking each Q (`id` anchors).
- **Priority:** Low (keep)

### 19. Footer
- **Current:** A single thin dark line: "© 2026 Critique. Built on Arc testnet." This is the most
  obviously **unfinished** element on the site.
- **Arc reference:** Structured multi-column footer (grouped links: Build / Explore / Connect) +
  legal — signals a real product.
- **Improvement:** Build a proper footer: 2–4 columns — **Product** (Create, Preview bounty,
  Dashboard), **Resources** (How it works, FAQ), **Built on Arc** (Arc Explorer, Arc docs) — plus
  the logo, a one-line description, and the copyright/testnet note. Keeps the dark tone but makes
  it feel intentional.
- **Priority:** High

### 20. Mobile layout
- **Current:** Generally responsive (single-column collapse, `break-all` on addresses). Risk spot:
  step titles use `whitespace-nowrap` (e.g. "Review submissions") inside constrained grid cells —
  can clip or force awkward widths at ~320px.
- **Arc reference:** Responsive type scaling, simplified cards, preserved hierarchy.
- **Improvement:** Remove `whitespace-nowrap` from step titles (allow wrap), verify the longer hero
  headline and all card grids at 320/375/390 with no horizontal scroll, and confirm tap targets
  stay ≥44px. Test the dark Arc card grid on small screens.
- **Priority:** Medium

### 21. Visual rhythm between sections
- **Current:** Repeated "eyebrow → serif H2 → paragraph → card grid" pattern in nearly every
  section creates a monotonous cadence.
- **Arc reference:** Alternates section types (full-bleed, centered, split, list) to keep interest.
- **Improvement:** Vary layouts: alternate left-aligned vs centered headers, add one split
  (text+visual) section, and use the spacing scale (#15) to mark transitions. Avoid identical
  section skeletons back-to-back.
- **Priority:** Medium

### 22. Professional / launch-ready feeling
- **Current:** ~80% there. The font fallback (#3), one-line footer (#19), and accordion-hidden
  steps (#17) are the three things that most undercut a "launch-ready" impression.
- **Arc reference:** Cohesive, finished, institutional.
- **Improvement:** Fixing #3, #17, #19 alone moves the perceived quality up a tier. Then layer in
  spacing (#15) and icon consistency (#13).
- **Priority:** High

### 23. What feels cheap or unfinished
- **Current:** (a) Georgia/Times fallback headline; (b) single-line footer; (c) very faint hero
  motion; (d) CSS-rotate chevrons; (e) abrupt ivory→dark transition into the Arc section/footer.
- **Arc reference:** None of these — everything reads deliberate.
- **Improvement:** Address each: self-host font, build footer, lift motion slightly, use real
  chevron icons, add a soft transition band before the dark sections.
- **Priority:** High

### 24. What should be removed (or condensed)
- **Current:** The large dark **"Arc Network"** section reproduces Arc's *own* marketing (feature
  grid, "stablecoin-native infrastructure", Explorer/docs buttons). It's big, it over-emphasizes
  Arc over Critique's story, and it risks looking like an official Arc property.
- **Arc reference:** N/A (that's Arc's content).
- **Improvement:** Condense it to a **slim "Built on Arc testnet" strip** (one line + Explorer/docs
  links) near the footer. Remove the duplicated feature grid. Let Critique's identity lead the
  page; keep attribution honest and small. (Do not use "Powered by Arc.")
- **Priority:** Medium

### 25. What should be added
- **Current:** No structured footer, no clear single hero focal anchor, no light "why trust this"
  signal.
- **Arc reference:** Footer IA; institutional credibility; clear focal hero.
- **Improvement:** Add (a) the structured footer (#19); (b) a subtle hero anchor (#2); (c) optional
  honest trust signals — e.g. a small "Built on Arc testnet · USDC rewards · No wallet needed to
  give feedback" strip. **No fake partner logos or testimonials.**
- **Priority:** Medium

### 26. What should stay unchanged
- **Current/keep:** Green/teal/ivory/dark-ink palette; single clean wallet control; CTA card under
  the hero; FAQ accordion; consistent `.surface` card base; lucide line icons; the no-photo hero;
  the simple 3-link nav.
- **Arc reference:** These already match Arc-level restraint where it counts.
- **Improvement:** Protect these from churn while polishing everything else.
- **Priority:** Keep

### 27. Highest-impact quick wins
- Self-host a real display font; stop relying on Californian FB (#3).
- Build a structured footer (#19).
- Show "How it works" steps open, not as accordions (#17).
- Unify container width (hero/header at `max-w-7xl` vs body at `max-w-6xl` → pick one) (see #15/#16).
- Bump base section spacing for breathing room (#15).
- **Priority:** High

### 28. Medium-priority polish
- Condense the Arc Network section to a slim strip (#24).
- Standardize icon chips and swap CSS chevrons for lucide icons (#13/#18).
- Add subtle card hover elevation + a bit more internal padding (#14).
- Soften the ivory→dark transition before the Arc/footer zone (#11/#23).
- Vary section layouts to break the repeated skeleton (#21).
- **Priority:** Medium

### 29. Things to avoid
- Copying Arc's font files, icons, exact wording, dark theme, or assets.
- Re-introducing a hero photo or heavy imagery.
- "Powered by Arc" / implying an official Arc partnership.
- Adding heavy animation libraries or distracting motion.
- Over-building the nav (dropdowns Critique doesn't need).
- Abandoning the green/ivory identity for an Arc-style dark theme.
- **Priority:** High (guardrails)

### 30. Final recommended homepage structure
1. **Header** (transparent over hero; sticky hairline after scroll).
2. **Hero** — eyebrow `FEEDBACK BOUNTIES ON ARC`, Title-Case display headline, one-line subcopy,
   subtle on-brand motion anchor; no buttons.
3. **CTA transition card** — "Create your first feedback bounty" (keep).
4. **How it works** — 4 open, scannable steps (no accordion).
5. **What you can do** — merged formats + founder use-cases, one differentiated layout.
6. **Contributor experience** — "no wallet needed to give feedback" highlight.
7. **FAQ** — accordion (keep), lucide chevron.
8. **Slim "Built on Arc testnet" strip** — one line + Explorer/docs links.
9. **Structured footer** — columns + logo + copyright.
- **Priority:** High (target end-state)

---

## Top 10 changes I would implement first (ranked)

1. **Self-host a proper display font** and remove the Californian FB → Georgia fallback (#3). *High*
2. **Replace the one-line footer with a structured multi-column footer** (#19). *High*
3. **Make "How it works" steps open and scannable** (drop the accordion there) (#17). *High*
4. **Increase and vary section spacing** for breathing room; unify container width (#15/#16). *High*
5. **Condense the large dark "Arc Network" section into a slim "Built on Arc" strip** (#24). *Medium→High*
6. **Standardize iconography** (one chip treatment + one stroke weight; real chevrons) (#13/#18). *Medium*
7. **Give the hero one subtle on-brand focal anchor** + slightly lift motion visibility (#2/#4). *Medium*
8. **Add card hover elevation + more internal padding**; soften ivory→dark transition (#14/#11). *Medium*
9. **Merge "Feedback formats" + "For founders"** into one differentiated section (#16/#21). *Medium*
10. **Mobile pass:** remove `whitespace-nowrap` step titles; verify 320–430px has no overflow (#20). *Medium*

---

## Report summary

- **Recommendations included:** 30 (areas 1–30) + a ranked Top-10 list.
- **Reference grounding:** Critique homepage read from source (`app/page.tsx`, `globals.css`,
  `AppHeader`, `WalletConnect`, `Footer`); Arc characterized from `www.arc.io`.
- **Identity guardrail:** keep green/teal/ivory/dark-ink; no Arc assets/wording/dark-theme copying;
  no "Powered by Arc."
- **No code, styles, content, or config were changed** — this is an audit deliverable only.
