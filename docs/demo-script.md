<!--
  FILE: docs/demo-script.md
  PHASE: 9 - Hardening, Load Test, Docs & Submission
  PURPOSE: Step-by-step script for the <=5 min demo video: schedule, dashboard, restart scenario, rate-limit + Slack message, load behaviour.
-->

# Demo Script (Under 5 Minutes)

## Before Recording

- Start Docker services, API, worker, and frontend.
- Confirm `/health` reports `status`, `db`, and `redis` as `ok`.
- Sign in with Google and use an account with an Ethereal sender.
- For a predictable rate-limit demonstration, use a sender with no sends in the current UTC hour or wait for the next hour window.

## Walkthrough

1. **Login and dashboard (30 seconds):** sign in and show the Scheduled/Sent mailbox, search, and Slack connection state.
2. **Compose (60 seconds):** add three example recipients, a subject and body, set a short spacing, choose a time one to two minutes ahead, and schedule. Show the items in Scheduled.
3. **Ethereal delivery (45 seconds):** keep the worker running; show the email moving to Sent and open the preview URL from the worker log.
4. **Restart persistence (60 seconds):** schedule another future message, stop only the worker before it is due, restart it, and show the message sent once. Avoid starting a second worker instead of stopping the first.
5. **Hourly limit (60 seconds):** at a clean sender/window, schedule three recipients with limit `1`. Show one send and the remaining jobs scheduled into the next UTC window in order. Explain that prior sends in the same UTC hour count against the same sender limit.
6. **Slack/search (30 seconds, if configured):** connect Slack and show a rate-limit alert, then search for the scheduled/sent subject.

## Claims to Avoid

- Ethereal is a test SMTP sink, not real email delivery.
- Do not claim live Slack delivery or multi-worker load results unless those checks were run during the demo.
