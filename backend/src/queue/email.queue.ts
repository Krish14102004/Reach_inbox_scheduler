/**
 * FILE: backend/src/queue/email.queue.ts
 * PHASE: 3 - Core Scheduler (BullMQ + Ethereal)
 * PURPOSE: BullMQ Queue instance + addEmailJobs(): bulk add delayed jobs with deterministic jobId = emailId (idempotent enqueue).
 */

import { Queue, type JobsOptions } from 'bullmq';
import { QUEUE_NAMES } from '../config/constants.js';
import { defaultJobOptions, queueConnection } from './queue.connection.js';

export interface EmailJobData {
  id: string;
  userId: string;
  toEmail: string;
  subject: string;
  body: string;
  senderId: string;
  scheduledAt: string;
}

export const emailQueue = new Queue<EmailJobData>(QUEUE_NAMES.email, {
  connection: queueConnection,
  defaultJobOptions,
});

export async function addEmailJobs(jobs: Array<{ id: string; data: EmailJobData; delay: number }>): Promise<void> {
  const jobOptions: JobsOptions = {
    jobId: jobs[0]?.id,
    delay: jobs[0]?.delay ?? 0,
    ...defaultJobOptions,
  };

  for (const job of jobs) {
    await emailQueue.add(QUEUE_NAMES.email, job.data, {
      ...defaultJobOptions,
      jobId: job.id,
      delay: Math.max(0, job.delay),
    });
  }

  if (jobs.length === 0) {
    void jobOptions;
  }
}
