import * as React from 'npm:react@18.3.1'
import { Layout, _SITE } from './_layout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props { name?: string; serviceName?: string; oldScheduledAt?: string; scheduledAt?: string; reason?: string; manageUrl?: string }

const Email = (p: Props) => (
  <Layout
    name={p.name}
    intro={`Your appointment at ${_SITE.name} has been rescheduled.`}
    serviceName={p.serviceName}
    scheduledAt={p.scheduledAt}
    bodyText={[
      p.oldScheduledAt ? `Previously: ${p.oldScheduledAt}.` : '',
      p.reason ? `Note from the salon: ${p.reason}` : '',
      'If the new time does not work, please reply or call us and we will find another slot.',
    ].filter(Boolean).join(' ')}
    ctaLabel="View appointment"
    ctaUrl={p.manageUrl || _SITE.url}
  />
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `Your ${_SITE.name} appointment has been rescheduled${d.scheduledAt ? ` — ${d.scheduledAt}` : ''}`,
  displayName: 'Booking rescheduled',
  previewData: { name: 'Alex', serviceName: 'Silk Press', oldScheduledAt: 'Fri 23 May, 11:30 AM', scheduledAt: 'Sat 24 May, 2:00 PM', reason: 'Stylist availability change.', manageUrl: 'https://www.wubhair.com' },
} satisfies TemplateEntry
