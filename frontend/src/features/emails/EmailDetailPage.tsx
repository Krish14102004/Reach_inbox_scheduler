import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Reply } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { listEmails } from '../../api/emails.api.js';
import type { ScheduledEmail } from '../../types/email.types.js';
import { formatTime, getInitials } from '../dashboard/DashboardPage.js';

export default function EmailDetailPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { emailId = '' } = useParams();
  const cachedEmail = (location.state as { email?: ScheduledEmail } | null)?.email;
  const emailsQuery = useQuery({
    queryKey: ['email-detail', emailId],
    queryFn: async () => {
      const [scheduled, sent] = await Promise.all([listEmails('scheduled'), listEmails('sent')]);
      return [...scheduled.items, ...sent.items].find((email) => email.id === emailId) ?? null;
    },
    enabled: !cachedEmail,
  });
  const email = cachedEmail ?? emailsQuery.data;

  if (emailsQuery.isLoading) return <main className="detail-loading">Loading message…</main>;
  if (!email) {
    return <main className="detail-loading"><button className="back-link" onClick={() => navigate('/')}><ArrowLeft size={17} /> Back to inbox</button><p>This message is no longer available.</p></main>;
  }

  return (
    <main className="detail-page">
      <header className="detail-toolbar">
        <button className="icon-button" title="Back to inbox" onClick={() => navigate(-1)}><ArrowLeft size={19} /></button>
        <span className="avatar avatar-fallback">{getInitials('Reach Inbox')}</span>
      </header>
      <article className="message-detail">
        <div className="message-title-row">
          <h1>{email.subject}</h1>
          <span className={`status-pill status-${email.status}`}>{email.status}</span>
        </div>
        <div className="message-meta">
          <span className="avatar sender-avatar">{getInitials('ReachInbox')}</span>
          <div className="message-sender"><strong>{email.senderId}</strong><span>&lt;sender&gt;</span><small>to {email.toEmail}</small></div>
          <time>{formatTime(email.sentAt ?? email.scheduledAt)}</time>
        </div>
        <div className="message-body">{email.body}</div>
        {email.lastError && <div className="message-error">Delivery detail: {email.lastError}</div>}
        <button className="reply-button" onClick={() => navigate('/')}><Reply size={16} /> Back to inbox</button>
      </article>
    </main>
  );
}