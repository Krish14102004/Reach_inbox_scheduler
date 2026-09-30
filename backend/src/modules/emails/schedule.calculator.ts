/**
 * FILE: backend/src/modules/emails/schedule.calculator.ts
 * PHASE: 3 - Core Scheduler (BullMQ + Ethereal)
 * PURPOSE: PURE function: given leads, startTime, delay, senders -> per-email scheduledAt + sender assignment (round-robin). Heavily unit-tested.
 */

export type LeadInput = string | { email: string; name?: string };

export interface ScheduleEmailsOptions {
  leads: LeadInput[];
  startTime: Date | string | number;
  delayBetweenMs: number;
  senderCount: number;
}

export interface ScheduledLead {
  email: string;
  name?: string;
  scheduledAt: Date;
  senderIndex: number;
}

function normalizeLead(lead: LeadInput): { email: string; name?: string } | null {
  if (typeof lead === 'string') {
    const email = lead.trim();
    return email ? { email } : null;
  }

  const email = lead.email.trim();
  if (!email) return null;

  return {
    email,
    name: lead.name?.trim() || undefined,
  };
}

export function scheduleEmails({
  leads,
  startTime,
  delayBetweenMs,
  senderCount,
}: ScheduleEmailsOptions): ScheduledLead[] {
  const normalizedLeads = leads.map(normalizeLead).filter((lead): lead is { email: string; name?: string } => lead !== null);
  const safeSenderCount = Math.max(1, Math.floor(senderCount || 1));
  const safeDelayMs = Math.max(0, Number(delayBetweenMs) || 0);
  const start = new Date(startTime);

  return normalizedLeads.map((lead, index) => ({
    email: lead.email,
    name: lead.name,
    scheduledAt: new Date(start.getTime() + index * safeDelayMs),
    senderIndex: index % safeSenderCount,
  }));
}
