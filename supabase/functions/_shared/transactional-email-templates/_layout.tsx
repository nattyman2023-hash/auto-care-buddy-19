import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Selam Unisex Salon'
const SITE_URL = 'https://www.wubhair.com'

export interface Props {
  name?: string
  serviceName?: string
  scheduledAt?: string
  stylistName?: string
  manageUrl?: string
  intro?: string
  ctaLabel?: string
  ctaUrl?: string
  bodyText?: string
}

export const Layout = ({ name, intro, bodyText, ctaLabel, ctaUrl, serviceName, scheduledAt, stylistName, manageUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{intro || `A note from ${SITE_NAME}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={brand}>{SITE_NAME}</Heading>
        </Section>
        <Section style={card}>
          <Heading style={h1}>{name ? `Hi ${name},` : 'Hello,'}</Heading>
          {intro && <Text style={text}>{intro}</Text>}
          {(serviceName || scheduledAt || stylistName) && (
            <Section style={detailsBox}>
              {serviceName && <Text style={detailRow}><strong>Service:</strong> {serviceName}</Text>}
              {scheduledAt && <Text style={detailRow}><strong>When:</strong> {scheduledAt}</Text>}
              {stylistName && <Text style={detailRow}><strong>With:</strong> {stylistName}</Text>}
            </Section>
          )}
          {bodyText && <Text style={text}>{bodyText}</Text>}
          {ctaLabel && ctaUrl && (
            <Section style={{ textAlign: 'center', margin: '28px 0 8px' }}>
              <Button href={ctaUrl} style={button}>{ctaLabel}</Button>
            </Section>
          )}
          {manageUrl && (
            <Text style={muted}>
              Need to change something? <a href={manageUrl} style={link}>Manage your appointment</a>.
            </Text>
          )}
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          {SITE_NAME} · <a href={SITE_URL} style={link}>{SITE_URL.replace('https://', '')}</a>
        </Text>
      </Container>
    </Body>
  </Html>
)

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif', margin: 0, padding: 0 }
const container = { maxWidth: '560px', margin: '0 auto', padding: '32px 20px' }
const header = { textAlign: 'center' as const, marginBottom: '20px' }
const brand = { fontSize: '22px', color: '#C4654A', margin: 0, letterSpacing: '0.5px', fontWeight: 600 }
const card = { backgroundColor: '#FBF4EE', borderRadius: '14px', padding: '28px 26px' }
const h1 = { fontSize: '20px', color: '#2b2b2b', margin: '0 0 14px', fontWeight: 600 }
const text = { fontSize: '15px', color: '#444', lineHeight: '1.55', margin: '0 0 16px' }
const detailsBox = { backgroundColor: '#ffffff', borderRadius: '10px', padding: '14px 16px', margin: '8px 0 16px', border: '1px solid #f0e0d6' }
const detailRow = { fontSize: '14px', color: '#333', margin: '4px 0' }
const button = { backgroundColor: '#C4654A', color: '#ffffff', padding: '12px 26px', borderRadius: '8px', textDecoration: 'none', fontSize: '15px', fontWeight: 600, display: 'inline-block' }
const muted = { fontSize: '13px', color: '#7a7a7a', margin: '18px 0 0' }
const link = { color: '#87A878', textDecoration: 'underline' }
const hr = { borderColor: '#f0e0d6', margin: '28px 0 12px' }
const footer = { fontSize: '12px', color: '#999', textAlign: 'center' as const, margin: 0 }

export const _SITE = { name: SITE_NAME, url: SITE_URL }
export const _placeholder: TemplateEntry = { component: Layout, subject: 'placeholder' }
