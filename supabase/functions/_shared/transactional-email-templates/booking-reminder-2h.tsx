import * as React from 'npm:react@18.3.1'
import { Layout, _SITE } from './_layout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props { name?: string; serviceName?: string; scheduledAt?: string; stylistName?: string; manageUrl?: string }

const Email = (p: Props) => (
  <Layout
    name={p.name}
    intro={`See you soon! Your appointment at ${_SITE.name} starts in about 2 hours.`}
    serviceName={p.serviceName}
    scheduledAt={p.scheduledAt}
    stylistName={p.stylistName}
    manageUrl={p.manageUrl}
    bodyText="Please come with clean, dry hair unless we agreed otherwise."
    ctaLabel="View appointment"
    ctaUrl={p.manageUrl || _SITE.url}
  />
)

export const template = {
  component: Email,
  subject: 'See you soon — your appointment is in 2 hours',
  displayName: 'Booking reminder · 2h',
  previewData: { name: 'Alex', serviceName: 'Silk Press', scheduledAt: 'Today at 11:30 AM', stylistName: 'Selam', manageUrl: 'https://www.wubhair.com/manage/abc' },
} satisfies TemplateEntry
