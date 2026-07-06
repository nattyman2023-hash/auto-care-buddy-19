import * as React from 'npm:react@18.3.1'
import { Layout, _SITE } from './_layout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props { name?: string; serviceName?: string; scheduledAt?: string; stylistName?: string; manageUrl?: string }

const Email = (p: Props) => (
  <Layout
    name={p.name}
    intro={`Just a friendly reminder — your appointment at ${_SITE.name} is tomorrow.`}
    serviceName={p.serviceName}
    scheduledAt={p.scheduledAt}
    stylistName={p.stylistName}
    manageUrl={p.manageUrl}
    bodyText="Please arrive 5 minutes early. Need to reschedule? Use the link below."
    ctaLabel="Manage appointment"
    ctaUrl={p.manageUrl || _SITE.url}
  />
)

export const template = {
  component: Email,
  subject: 'Reminder: your appointment is tomorrow',
  displayName: 'Booking reminder · 24h',
  previewData: { name: 'Alex', serviceName: 'Silk Press', scheduledAt: 'Tomorrow at 11:30 AM', stylistName: 'Selam', manageUrl: 'https://www.wubhair.com/manage/abc' },
} satisfies TemplateEntry
