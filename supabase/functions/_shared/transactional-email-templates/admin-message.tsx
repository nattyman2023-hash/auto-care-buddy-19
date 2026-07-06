import * as React from 'npm:react@18.3.1'
import { Layout, _SITE } from './_layout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  subject?: string
  body?: string
  ctaLabel?: string
  ctaUrl?: string
}

const Email = (p: Props) => (
  <Layout
    name={p.name}
    intro={p.subject || `A message from ${_SITE.name}`}
    bodyText={p.body || ''}
    ctaLabel={p.ctaLabel}
    ctaUrl={p.ctaUrl}
  />
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) => data?.subject || `A message from ${_SITE.name}`,
  displayName: 'Admin message',
  previewData: { name: 'Alex', subject: 'Quick update on your appointment', body: 'Hi! Just wanted to let you know your stylist is running 10 minutes late today.' },
} satisfies TemplateEntry
