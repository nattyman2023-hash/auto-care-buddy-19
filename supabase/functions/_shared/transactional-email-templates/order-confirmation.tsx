import * as React from 'npm:react@18.3.1'
import { Layout, _SITE } from './_layout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props { name?: string; orderId?: string; orderTotal?: string; orderUrl?: string }

const Email = (p: Props) => (
  <Layout
    name={p.name}
    intro={`Thanks for your order at ${_SITE.name}!`}
    bodyText={`${p.orderId ? `Order #${p.orderId}. ` : ''}${p.orderTotal ? `Total: ${p.orderTotal}. ` : ''}We'll send another note when it's on its way.`}
    ctaLabel="View order"
    ctaUrl={p.orderUrl || `${_SITE.url}/orders`}
  />
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `Order confirmed${d.orderId ? ` · #${d.orderId}` : ''}`,
  displayName: 'Order confirmation',
  previewData: { name: 'Alex', orderId: '1042', orderTotal: '£42.00', orderUrl: 'https://www.wubhair.com/orders/1042' },
} satisfies TemplateEntry
