import * as React from 'npm:react@18.3.1'
import { Layout, _SITE } from './_layout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props { name?: string; serviceName?: string; scheduledAt?: string; stylistName?: string; manageUrl?: string }

const Email = (p: Props) => (
  <Layout
    name={p.name}
    intro={`Your appointment at ${_SITE.name} is confirmed. We can't wait to see you.`}
    serviceName={p.serviceName}
    scheduledAt={p.scheduledAt}
    stylistName={p.stylistName}
    manageUrl={p.manageUrl}
    bodyText="If your plans change, please let us know at least 24 hours ahead so we can offer the slot to another client."
    ctaLabel="View appointment"
    ctaUrl={p.manageUrl || _SITE.url}
  />
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `Your booking at ${_SITE.name} is confirmed${d.scheduledAt ? ` — ${d.scheduledAt}` : ''}`,
  displayName: 'Booking confirmation',
  previewData: { name: 'Alex', serviceName: 'Silk Press', scheduledAt: 'Sat 24 May, 11:30 AM', stylistName: 'Selam', manageUrl: 'https://www.wubhair.com/manage/abc' },
} satisfies TemplateEntry
