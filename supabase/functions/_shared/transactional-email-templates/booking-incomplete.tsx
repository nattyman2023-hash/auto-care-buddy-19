import * as React from 'npm:react@18.3.1'
import { Layout, _SITE } from './_layout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props { name?: string; serviceName?: string; resumeUrl?: string }

const Email = (p: Props) => (
  <Layout
    name={p.name}
    intro={`We saved your spot at ${_SITE.name} — looks like you didn't quite finish booking.`}
    serviceName={p.serviceName}
    bodyText="Pick up where you left off in just a couple of taps. Slots fill up fast on weekends."
    ctaLabel="Finish booking"
    ctaUrl={p.resumeUrl || `${_SITE.url}/booking`}
  />
)

export const template = {
  component: Email,
  subject: `Finish booking your appointment at ${_SITE.name}`,
  displayName: 'Booking left halfway',
  previewData: { name: 'Alex', serviceName: 'Silk Press', resumeUrl: 'https://www.wubhair.com/booking?draft=abc' },
} satisfies TemplateEntry
