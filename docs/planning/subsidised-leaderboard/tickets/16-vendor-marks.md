# 16: Vendor marks in the Model cell

Type: task
Status: ready-for-agent

## What to build

Render each vendor's mark before the model name in the Model cell, per the
2026-08-26 grilling and [provider icon research](../research/provider-icons.md).
Vocabulary: a **vendor mark** (see `docs/context.md`) is the brand mark shown
beside a model — not always the vendor's corporate logo (Moonshot's mark is
Kimi, Alibaba's is Qwen).

### Assets

Add `@lobehub/icons-static-svg@^1.94.0` as a regular caret dependency — the
research doc recommends an exact pin, but the grilling decided against it:
logo refreshes should arrive with routine dependency updates, and the bundle
ships only the imported files either way. Use the nine SVGs from the research
doc's asset table (`anthropic.svg`, `openai.svg`, `google-color.svg`,
`deepseek-color.svg`, `zai.svg`, `kimi-color.svg`, `qwen-color.svg`,
`xai.svg`, `meta-color.svg`).

### `VendorMark` component

One component covering all nine marks:

- `?raw` imports + `dangerouslySetInnerHTML` (no svgr in the toolchain; the
  strings are static build-time imports, so the "dangerously" is theoretical).
  Inlining lets the four monochrome marks (Anthropic, OpenAI, Z.ai, xAI)
  inherit `currentColor` across light/dark themes. The five `-color` marks
  were checked: all mid-bright blues/gradients, legible on both themes as-is.
  Gradient `id`s are namespaced per icon, so repeated inlining doesn't collide.
- Sized `size-4`, leading the `displayName`, Model cell only — not the Models
  picker, footer, or anywhere else.
- Accessibility: `role="img"` + `aria-label` of the **vendor** name
  ("Moonshot", not "Kimi"), since the mark conveys the vendor and the display
  name doesn't always state it. Independent of any SVG `<title>`.
- The vendor→SVG map is a static map in `src/` keyed on the model mapping's
  vendor names. Presentation, not data — it does not live in
  `data/model-mapping.json`. A unit test asserts every vendor in
  `model-mapping.json` has a mark, so a new vendor forces a decision (same
  pattern as the existing mapping-coverage tests).

### Trademark posture (decided)

Show all nine marks as neutral vendor identifiers (nominative use), accepting
the non-uniform first-party terms the research flags (DeepSeek and Qwen
prohibit unauthorised logo use; Anthropic publishes no guidance). Mitigations
from the research doc apply: marks stay small and secondary to model names,
geometry unaltered (a reason the SVGs stay byte-identical `?raw` imports
rather than `.tsx` conversions), no surrounding copy suggesting sponsorship.

### Terminology cleanup

The research doc predates the glossary decision and says "provider icons";
`docs/context.md` reserves "provider" for OpenRouter endpoint operators.
Rename the doc's title/prose to vendor-mark language while keeping the
package/file names it cites verbatim. Add a line to the spec's App section
describing the mark in the Model cell.

## Acceptance criteria

- [ ] The Model cell shows the correct mark for all nine vendors; tier and
      effort variants of a model share it
- [ ] Monochrome marks follow the theme (`currentColor`) in light and dark
      mode; color marks render with their fixed brand colors
- [ ] Each mark exposes `role="img"` with the vendor name as `aria-label`
- [ ] A unit test fails when a vendor in `model-mapping.json` has no mark
- [ ] Research doc renamed to vendor-mark vocabulary; spec App section
      mentions the mark
- [ ] `vp run ready` passes
