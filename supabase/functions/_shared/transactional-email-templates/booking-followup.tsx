import * as React from 'npm:react@18.3.1'
import { Layout, _SITE } from './_layout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props { name?: string; bookUrl?: string }

const Email = (p: Props) => (
  <Layout
    name={p.name}
    intro={`Thank you for visiting ${_SITE.name}. We hope you love how it turned out!`}
    bodyText="If you have a moment, we'd love your feedback. Ready for your next visit? Book early to grab the time that suits you."
    ctaLabel="Book your next visit"
    ctaUrl={p.bookUrl || `${_SITE.url}/booking`}
  />
)

export const template = {
  component: Email,
  subject: `Thank you from ${_SITE.name}`,
  displayName: 'Post-visit thank you',
  previewData: { name: 'Alex', bookUrl: 'https://www.wubhair.com/booking' },
} satisfies TemplateEntry
