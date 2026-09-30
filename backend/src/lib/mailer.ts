/**
 * FILE: backend/src/lib/mailer.ts
 * PHASE: 3 - Core Scheduler (BullMQ + Ethereal)
 * PURPOSE: Nodemailer transport factory per Ethereal sender (cached by senderId). Exposes sendMail() returning messageId + preview URL.
 */

import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

export interface MailSender {
  id: string;
  email: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
}

const transports = new Map<string, ReturnType<typeof nodemailer.createTransport>>();

function getTransport(sender: MailSender) {
  let transport = transports.get(sender.id);

  if (!transport) {
    transport = nodemailer.createTransport({
      host: sender.smtpHost,
      port: sender.smtpPort,
      secure: sender.smtpPort === 465,
      auth: {
        user: sender.smtpUser,
        pass: sender.smtpPass,
      },
      tls: {
        rejectUnauthorized: env.NODE_ENV !== 'development' || !env.ETHEREAL_ALLOW_SELF_SIGNED_CERTS,
      },
    });
    transports.set(sender.id, transport);
  }

  return transport;
}

export async function sendMail(sender: MailSender, message: {
  to: string;
  subject: string;
  text: string;
  from?: string;
}) {
  const info = await getTransport(sender).sendMail({
    from: message.from ?? sender.email,
    to: message.to,
    subject: message.subject,
    text: message.text,
  });

  return {
    messageId: info.messageId ?? null,
    previewUrl: nodemailer.getTestMessageUrl(info) || null,
  };
}
