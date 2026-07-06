import * as React from 'npm:react@18.3.1'
import { Layout, _SITE } from './_layout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props { name?: string; orderTotal?: string; checkoutUrl?: string }

const Email = (p: Props) => (
  <Layout
    name={p.name}
    intro="You started an order with us but didn't quite finish."
    bodyText={p.orderTotal ? `Your order total: ${p.orderTotal}. Complete checkout to secure your products.` : 'Complete checkout to secure your products before they sell out.'}
    ctaLabel="Complete your order"
    ctaUrl={p.checkoutUrl || `${_SITE.url}/checkout`}
  />
)

export const template = {
  component: Email,
  subject: 'Complete your order',
  displayName: 'Order abandoned',
  previewData: { name: 'Alex', orderTotal: '£42.00', checkoutUrl: 'https://www.wubhair.com/checkout' },
} satisfies TemplateEntry
