import * as React from 'npm:react@18.3.1'
import { Layout, _SITE } from './_layout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props { name?: string; portalKind?: 'client' | 'staff'; inviteUrl?: string }

const Email = (p: Props) => {
  const isStaff = p.portalKind === 'staff'
  return (
    <Layout
      name={p.name}
      intro={isStaff
        ? `You have been invited to access the ${_SITE.name} staff portal — view your bookings, clients, and shift schedule.`
        : `You have been invited to your ${_SITE.name} client portal — manage bookings, view your hair history, and see photos from past visits.`}
      bodyText={isStaff
        ? "Tap below to set your password and sign in."
        : "Tap below to set a password and sign in. It only takes a moment."}
      ctaLabel={isStaff ? "Open staff portal" : "Open my portal"}
      ctaUrl={p.inviteUrl || _SITE.url}
    />
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    d.portalKind === 'staff'
      ? `Your ${_SITE.name} staff portal invite`
      : `Your ${_SITE.name} client portal invite`,
  displayName: 'Portal invite',
  previewData: { name: 'Alex', portalKind: 'client', inviteUrl: 'https://www.wubhair.com/reset-password' },
} satisfies TemplateEntry
