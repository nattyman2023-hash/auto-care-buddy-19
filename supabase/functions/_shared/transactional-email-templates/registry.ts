/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as bookingConfirmation } from './booking-confirmation.tsx'
import { template as bookingReminder24h } from './booking-reminder-24h.tsx'
import { template as bookingReminder2h } from './booking-reminder-2h.tsx'
import { template as bookingIncomplete } from './booking-incomplete.tsx'
import { template as bookingFollowup } from './booking-followup.tsx'
import { template as cartAbandoned } from './cart-abandoned.tsx'
import { template as orderAbandoned } from './order-abandoned.tsx'
import { template as orderConfirmation } from './order-confirmation.tsx'
import { template as passwordResetManual } from './password-reset-manual.tsx'
import { template as portalInvite } from './portal-invite.tsx'
import { template as bookingRescheduled } from './booking-rescheduled.tsx'
import { template as adminMessage } from './admin-message.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'booking-confirmation': bookingConfirmation,
  'booking-reminder-24h': bookingReminder24h,
  'booking-reminder-2h': bookingReminder2h,
  'booking-incomplete': bookingIncomplete,
  'booking-followup': bookingFollowup,
  'cart-abandoned': cartAbandoned,
  'order-abandoned': orderAbandoned,
  'order-confirmation': orderConfirmation,
  'password-reset-manual': passwordResetManual,
  'portal-invite': portalInvite,
  'booking-rescheduled': bookingRescheduled,
  'admin-message': adminMessage,
}
