# Project Memory

## Core
Wub Hair salon, 174 Claremont Road, Manchester M14 4TT. Single truth: src/lib/siteContent.ts.
Editorial Magazine theme on ALL pages (public, portal, admin). Paper white #FFFFFF, deep ink #1A1A1A, terracotta primary #C4654A, sage accent. NEVER dark/charcoal backgrounds. Use semantic tokens, never raw hex.
Typography: Fraunces serif (display) + Inter (sans). Hairline rules instead of card borders. Square corners.
Terminology: Mechanic -> Stylist/Barber, Garage -> Salon. 'Vehicle History' -> 'Hair History'.
Schema constraint: 'vehicles' table = 'Hair Profiles'. vrm = Preference, make = Texture, model = Goal.
NO INVOICING. Clients pay for products at checkout or for services at the chair. Invoice/Quote/ReadyToWork pages removed; tables retained but hidden.

## Memories
- [Project Identity](mem://project/identity) — Core identity, contact details, and single source of truth for site content
- [Theme and Branding](mem://style/theme-and-branding) — Editorial Magazine palette, fonts, hero assets, helper classes
- [Mobile UX & Booking](mem://ux/mobile-navigation-and-booking) — 3-step booking wizard, duration-based slots, and mobile navigation layout
- [Admin Password Mgmt](mem://auth/admin-password-management) — Secure manual password overrides via Edge Function for clients without portal accounts
- [Workflow Automation](mem://features/workflow-automation) — Pipeline labels, hair history CRM, and real-time dashboard updates
- [Terminology & Schema Mapping](mem://domain/terminology-mapping) — Repurposing of vehicle schema and automotive terminology to salon context
