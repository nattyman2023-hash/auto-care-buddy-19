Customer portal mobile layout decisions and rejected patterns.

## Rejected
- Horizontal scrolling tabs — user said "unprofessional", replaced with 2-column icon card grid
- `max-h-[85vh] overflow-y-auto` on booking modal — causes "frozen scroll" on mobile

## Current Design
- Mobile: 2-column grid of tappable action cards (Jobs, Invoices, Quotes, Vehicles, Estimates, Report Issue)
- Desktop: standard TabsList (hidden on mobile via `hidden sm:flex`)
- Tabs are controlled via `activeTab` state
- Booking modal uses 3-step flow: Vehicle → Date → Time
- Calendar auto-collapses after date selection, auto-advances to step 3
- Main container has `pb-20` for bottom clearance
