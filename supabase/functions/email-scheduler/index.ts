import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SITE_URL = 'https://www.wubhair.com'

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-GB', {
      weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      timeZone: 'Europe/London',
    })
  } catch { return iso }
}

async function alreadySent(dedupeKey: string) {
  const { data } = await supabase
    .from('email_dispatch_log').select('id').eq('dedupe_key', dedupeKey).maybeSingle()
  return !!data
}

async function logDispatch(dedupeKey: string, templateName: string, recipientEmail: string) {
  await supabase.from('email_dispatch_log').insert({ dedupe_key: dedupeKey, template_name: templateName, recipient_email: recipientEmail })
}

async function send(templateName: string, recipientEmail: string, idempotencyKey: string, templateData?: Record<string, unknown>) {
  if (!recipientEmail) return { skipped: 'no-email' }
  if (await alreadySent(idempotencyKey)) return { skipped: 'dedup' }
  const res = await supabase.functions.invoke('send-transactional-email', {
    body: { templateName, recipientEmail, idempotencyKey, templateData },
  })
  if (!res.error) await logDispatch(idempotencyKey, templateName, recipientEmail)
  return res
}

async function processBookingReminders() {
  const now = Date.now()
  const in23h = new Date(now + 23 * 3600 * 1000).toISOString()
  const in25h = new Date(now + 25 * 3600 * 1000).toISOString()
  const in1_75h = new Date(now + 1.75 * 3600 * 1000).toISOString()
  const in2_25h = new Date(now + 2.25 * 3600 * 1000).toISOString()

  // Fetch upcoming jobs with customer info
  const fetchJobs2 = async (gte: string, lte: string) => {
    const { data } = await supabase
      .from('jobs')
      .select('id, scheduled_at, status, customer:customers(name,email)')
      .gte('scheduled_at', gte).lte('scheduled_at', lte)
      .in('status', ['pending', 'confirmed'])
    return data ?? []
  }

  for (const j of await fetchJobs2(in23h, in25h)) {
    const c: any = j.customer
    if (!c?.email) continue
    await send('booking-reminder-24h', c.email, `reminder24-${j.id}`, {
      name: c.name, scheduledAt: fmtDate(j.scheduled_at!),
      manageUrl: `${SITE_URL}/portal/appointments`,
    })
  }
  for (const j of await fetchJobs2(in1_75h, in2_25h)) {
    const c: any = j.customer
    if (!c?.email) continue
    await send('booking-reminder-2h', c.email, `reminder2-${j.id}`, {
      name: c.name, scheduledAt: fmtDate(j.scheduled_at!),
      manageUrl: `${SITE_URL}/portal/appointments`,
    })
  }
}

async function processBookingFollowups() {
  const since = new Date(Date.now() - 26 * 3600 * 1000).toISOString()
  const until = new Date(Date.now() - 23 * 3600 * 1000).toISOString()
  const { data } = await supabase
    .from('jobs')
    .select('id, completed_at, customer:customers(name,email)')
    .eq('status', 'completed')
    .gte('completed_at', since).lte('completed_at', until)
  for (const j of data ?? []) {
    const c: any = j.customer
    if (!c?.email) continue
    await send('booking-followup', c.email, `followup-${j.id}`, {
      name: c.name, bookUrl: `${SITE_URL}/booking`,
    })
  }
}

async function processIncompleteBookings() {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  const until = new Date(Date.now() - 1 * 3600 * 1000).toISOString()
  const { data } = await supabase
    .from('booking_drafts')
    .select('id, email, name, scheduled_at, service_catalog_id, service:service_catalog(name)')
    .eq('completed', false)
    .is('reminder_sent_at', null)
    .gte('last_seen_at', since).lte('last_seen_at', until)
  for (const d of data ?? []) {
    if (!d.email) continue
    const r = await send('booking-incomplete', d.email, `incomplete-${d.id}`, {
      name: d.name, serviceName: (d as any).service?.name,
      resumeUrl: `${SITE_URL}/booking?draft=${d.id}`,
    })
    if (!('skipped' in (r as any))) {
      await supabase.from('booking_drafts').update({ reminder_sent_at: new Date().toISOString() }).eq('id', d.id)
    }
  }
}

async function processAbandonedCarts() {
  const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString()
  const until = new Date(Date.now() - 2 * 3600 * 1000).toISOString()
  const { data: sessions } = await supabase
    .from('cart_sessions').select('session_id, email, name')
    .is('reminder_sent_at', null)
    .gte('updated_at', since).lte('updated_at', until)
  for (const s of sessions ?? []) {
    const { data: items } = await supabase
      .from('cart_items').select('quantity, service:service_catalog(name)').eq('session_id', s.session_id)
    if (!items || items.length === 0) continue
    const summary = items.map((i: any) => `${i.service?.name ?? 'Item'} × ${i.quantity ?? 1}`).join(', ')
    const r = await send('cart-abandoned', s.email, `cart-${s.session_id}`, {
      name: s.name, itemSummary: summary, cartUrl: `${SITE_URL}/cart`,
    })
    if (!('skipped' in (r as any))) {
      await supabase.from('cart_sessions').update({ reminder_sent_at: new Date().toISOString() }).eq('session_id', s.session_id)
    }
  }
}

async function processAbandonedOrders() {
  const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString()
  const until = new Date(Date.now() - 2 * 3600 * 1000).toISOString()
  const { data } = await supabase
    .from('orders')
    .select('id, total, customer:customers(name,email)')
    .eq('status', 'pending')
    .gte('created_at', since).lte('created_at', until)
  for (const o of data ?? []) {
    const c: any = o.customer
    if (!c?.email) continue
    await send('order-abandoned', c.email, `order-abandoned-${o.id}`, {
      name: c.name, orderTotal: `£${Number(o.total ?? 0).toFixed(2)}`,
      checkoutUrl: `${SITE_URL}/checkout`,
    })
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  const summary: Record<string, string> = {}
  for (const [name, fn] of [
    ['reminders', processBookingReminders],
    ['followups', processBookingFollowups],
    ['incomplete', processIncompleteBookings],
    ['carts', processAbandonedCarts],
    ['orders', processAbandonedOrders],
  ] as const) {
    try { await fn(); summary[name] = 'ok' } catch (e) { summary[name] = String((e as Error).message ?? e) }
  }
  return new Response(JSON.stringify({ ok: true, summary }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
