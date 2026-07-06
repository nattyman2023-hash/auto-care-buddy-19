---
name: Theme and Branding
description: Editorial Magazine aesthetic — paper, ink, terracotta, Fraunces serif
type: design
---
**Palette (Editorial Magazine)** — primary terracotta `#C4654A` (HSL 12 50% 53%), background paper `#FFFFFF`, foreground deep ink `#1A1A1A`, muted sand `#F5F0EA`, sage accent `#87A878`, hairline border `#E0E0E0`. Defined in `src/index.css` as HSL tokens; do NOT use raw hex in components.
**Helpers**: `.font-display`, `.eyebrow`, `.display-xl/lg/md`, `.pull-quote`, `.image-caption`, `.editorial-rule`, `.section-y`, `.marker-link`.
**Fonts**: Fraunces (display, h1-h6 via `--font-display`), Inter (body via `--font-sans`).
**Editorial conventions**: square corners (`--radius: 0.25rem`), 1px hairline rules between sections, no heavy card chrome, full-bleed imagery with italic captions, oversized serif headlines, small-caps tracked sans for labels (`.eyebrow`).
**Hero assets**: `src/assets/editorial-cover.jpg`, `editorial-craft.jpg`, `editorial-closing.jpg`.
**Address**: 174 Claremont Road, Manchester M14 4TT.
**Business name**: Wub Hair (single source: `BUSINESS.name` in `src/lib/siteContent.ts`).
