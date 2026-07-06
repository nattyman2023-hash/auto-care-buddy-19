import * as React from 'npm:react@18.3.1'
import { Layout, _SITE } from './_layout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props { name?: string; tempPassword?: string; loginUrl?: string }

const Email = (p: Props) => (
  <Layout
    name={p.name}
    intro={`An admin at ${_SITE.name} has set a temporary password for your account.`}
    bodyText={p.tempPassword ? `Your temporary password is: ${p.tempPassword}. Please sign in and change it immediately.` : 'Please sign in and change your password immediately.'}
    ctaLabel="Sign in"
    ctaUrl={p.loginUrl || `${_SITE.url}/auth`}
  />
)

export const template = {
  component: Email,
  subject: 'Your account password was reset',
  displayName: 'Manual password reset',
  previewData: { name: 'Alex', tempPassword: 'TempPass-1234', loginUrl: 'https://www.wubhair.com/auth' },
} satisfies TemplateEntry
