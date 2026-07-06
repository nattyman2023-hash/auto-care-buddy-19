import * as React from 'npm:react@18.3.1'
import { Layout, _SITE } from './_layout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props { name?: string; itemSummary?: string; cartUrl?: string }

const Email = (p: Props) => (
  <Layout
    name={p.name}
    intro={`You left some items in your cart at ${_SITE.name}.`}
    bodyText={p.itemSummary ? `Still interested in: ${p.itemSummary}? Your selection is saved and ready to check out.` : 'Your selection is saved and ready to check out whenever you are.'}
    ctaLabel="Return to your cart"
    ctaUrl={p.cartUrl || `${_SITE.url}/cart`}
  />
)

export const template = {
  component: Email,
  subject: 'You left items in your cart',
  displayName: 'Cart abandoned',
  previewData: { name: 'Alex', itemSummary: 'Silk Press × 1', cartUrl: 'https://www.wubhair.com/cart' },
} satisfies TemplateEntry
