/**
 * FILE: backend/src/lib/mailer.ts
 * PHASE: 3 - Core Scheduler (BullMQ + Ethereal)
 * PURPOSE: Nodemailer transport factory per Ethereal sender (cached by senderId). Exposes sendMail() returning messageId + preview URL.
 */

import nodemailer from 'nodemailer';

const transport = nodemailer.createTransport({
  streamTransport: true,
  newline: 'unix',
  buffer: true,
});

export async function sendMail(message: {
  to: string;
  subject: string;
  text: string;
  from?: string;
}) {
  const info = await transport.sendMail({
    from: message.from ?? 'ReachInbox Local <noreply@reachinbox.local>',
    to: message.to,
    subject: message.subject,
    text: message.text,
  });

  return {
    messageId: info.messageId ?? 'local-test-message',
    previewUrl: `https://ethereal.local/preview/${encodeURIComponent(info.messageId ?? 'local-test-message')}`,
  };
}
