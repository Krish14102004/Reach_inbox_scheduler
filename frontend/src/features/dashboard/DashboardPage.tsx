import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Check, ChevronDown, Clock3, Filter, Inbox, LogOut, Mail, Plus,
  RefreshCw, Search, Send, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { listEmails, searchEmails } from '../../api/emails.api.js';
import { disconnectSlack, getSlackStatus, slackConnectUrl } from '../../api/slack.api.js';
import { useAuth } from '../auth/AuthProvider.js';
import type { EmailStatus, ScheduledEmail } from '../../types/email.types.js';
import ComposeEmail from '../compose/ComposeEmail.js';

type Mailbox = 'scheduled' | 'sent';

function getInitials(value: string): string {
  return value.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((part) => part[0]!.toUpperCase()).join('');
}

function formatTime(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat('en', {
    weekday: 'short', hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric',
  }).format(date);
}

function getStatusLabel(status: EmailStatus): string {
  if (status === 'processing') return 'Sending';
  return status[0]!.toUpperCase() + status.slice(1);
}

export default function DashboardPage(): JSX.Element {
  const { user, signOut } = useAuth();
  const [mailbox, setMailbox] = useState<Mailbox>('scheduled');
  const [composerOpen, setComposerOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<EmailStatus | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const emailQuery = useQuery({
    queryKey: ['emails', mailbox],
    queryFn: () => listEmails(mailbox),
    refetchInterval: 10_000,
  });
  const searchQuery = useQuery({
    queryKey: ['email-search', searchTerm],
    queryFn: () => searchEmails(searchTerm),
    enabled: searchTerm.length > 0,
  });
  const slackQuery = useQuery({ queryKey: ['slack-status'], queryFn: getSlackStatus });
  const disconnectSlackMutation = useMutation({
    mutationFn: disconnectSlack,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['slack-status'] });
      toast.success('Slack disconnected');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const emails = useMemo(() => {
    if (searchTerm) return searchQuery.data?.items ?? [];
    return emailQuery.data?.items ?? [];
  }, [emailQuery.data?.items, searchQuery.data?.items, searchTerm]);
  const visibleEmails = useMemo(
    () => emails.filter((email) => !statusFilter || email.status === statusFilter),
    [emails, statusFilter],
  );

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchTerm(searchInput.trim());
  };

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['emails'] }),
      queryClient.invalidateQueries({ queryKey: ['email-search'] }),
    ]);
  };

  const logout = async () => {
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not log out');
    }
  };

  if (composerOpen) {
    return <ComposeEmail onClose={() => setComposerOpen(false)} onScheduled={refresh} />;
  }

  return (
    <main className="mail-app">
      <aside className="sidebar">
        <div className="sidebar-brand brand-lockup">
          <span className="brand-mark"><Mail size={16} strokeWidth={2.5} /></span>
          <span>reachinbox</span>
        </div>

        <div className="profile-menu">
          {user?.avatarUrl
            ? <img className="avatar" src={user.avatarUrl} alt="" />
            : <span className="avatar avatar-fallback">{getInitials(user?.name ?? 'User')}</span>}
          <span className="profile-copy"><strong>{user?.name}</strong><small>{user?.email}</small></span>
          <ChevronDown size={15} className="muted-icon" />
        </div>

        <button className="compose-button" onClick={() => setComposerOpen(true)}>
          <Plus size={17} /> Compose
        </button>

        <div className="sidebar-section-label">CORE</div>
        <nav className="mailbox-nav" aria-label="Mailboxes">
          <button className={mailbox === 'scheduled' && !searchTerm ? 'nav-item active' : 'nav-item'} onClick={() => { setMailbox('scheduled'); setSearchTerm(''); setSearchInput(''); }}>
            <Clock3 size={16} /><span>Scheduled</span><small>{mailbox === 'scheduled' ? emailQuery.data?.total ?? '—' : ''}</small>
          </button>
          <button className={mailbox === 'sent' && !searchTerm ? 'nav-item active' : 'nav-item'} onClick={() => { setMailbox('sent'); setSearchTerm(''); setSearchInput(''); }}>
            <Send size={16} /><span>Sent</span><small>{mailbox === 'sent' ? emailQuery.data?.total ?? '—' : ''}</small>
          </button>
        </nav>

        <div className="sidebar-spacer" />
        <div className="sidebar-bottom">
          <div className="slack-row">
            <span className="slack-mark">#</span>
            <span className="slack-copy"><strong>Slack alerts</strong><small>{slackQuery.data?.connected ? 'Connected' : 'Not connected'}</small></span>
            {slackQuery.data?.connected
              ? <button className="icon-button compact" title="Disconnect Slack" onClick={() => disconnectSlackMutation.mutate()}><Check size={15} /></button>
              : <a className="slack-connect" href={slackConnectUrl()} title="Connect Slack">Connect</a>}
          </div>
          <button className="nav-item settings-link" onClick={() => void logout()}><LogOut size={16} /><span>Sign out</span></button>
        </div>
      </aside>

      <section className="mail-content">
        <header className="content-toolbar">
          <form className="search-form" onSubmit={submitSearch}>
            <Search size={17} />
            <input aria-label="Search email" placeholder="Search email, subject, or message" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
            {searchInput && <button className="clear-search" type="button" onClick={() => { setSearchInput(''); setSearchTerm(''); }}>Clear</button>}
          </form>
          <div className="toolbar-actions">
            <div className="filter-control">
              <button className="icon-button" title="Filter by status" aria-expanded={filterOpen} onClick={() => setFilterOpen((open) => !open)}><Filter size={17} /></button>
              {filterOpen && <div className="filter-menu">
                <strong>Status</strong>
                {(['all', 'scheduled', 'processing', 'sent', 'failed'] as const).map((status) => (
                  <button key={status} onClick={() => { setStatusFilter(status === 'all' ? null : status); setFilterOpen(false); }}>
                    <span>{status === 'all' ? 'All messages' : getStatusLabel(status)}</span>
                    {(status === 'all' ? !statusFilter : statusFilter === status) && <Check size={14} />}
                  </button>
                ))}
              </div>}
            </div>
            <button className="icon-button" title="Refresh" onClick={() => void refresh()}><RefreshCw size={17} /></button>
            <button className="icon-button mobile-signout" title="Sign out" onClick={() => void logout()}><LogOut size={17} /></button>
          </div>
        </header>

        <div className="mailbox-heading">
          <div>
            <span className="eyebrow">YOUR WORKSPACE</span>
            <h1>{searchTerm ? 'Search results' : mailbox === 'scheduled' ? 'Scheduled' : 'Sent'}</h1>
          </div>
          <button className="secondary-button" onClick={() => setComposerOpen(true)}><Plus size={16} /> New email</button>
        </div>

        {emailQuery.isLoading && !searchTerm ? <MailLoading /> : null}
        {searchTerm && searchQuery.isFetching ? <MailLoading /> : null}
        {(emailQuery.isError || searchQuery.isError) && <div className="inline-error">Couldn’t load email. Refresh to try again.</div>}
        {!(emailQuery.isLoading && !searchTerm) && !(searchTerm && searchQuery.isFetching) && !emailQuery.isError && !searchQuery.isError && (
          visibleEmails.length > 0 ? (
            <div className="mail-list" role="list">
              {visibleEmails.map((email) => (
                <button className="mail-row" key={email.id} onClick={() => navigate(`/email/${email.id}`, { state: { email } })}>
                  <span className="mail-recipient">To: <strong>{email.toEmail}</strong></span>
                  <span className={`status-pill status-${email.status}`}>{mailbox === 'scheduled' && <Clock3 size={12} />}{getStatusLabel(email.status)}</span>
                  <span className="mail-row-copy"><strong>{email.subject}</strong><span> — {email.body.replace(/\s+/g, ' ').slice(0, 120)}</span></span>
                  <span className="mail-row-time">{formatTime(mailbox === 'sent' && email.sentAt ? email.sentAt : email.scheduledAt)}</span>
                </button>
              ))}
            </div>
          ) : (
            <EmptyMailbox searchTerm={searchTerm} mailbox={mailbox} onCompose={() => setComposerOpen(true)} />
          )
        )}

        <footer className="list-footer">
          <span>{searchTerm ? searchQuery.data?.total ?? 0 : emailQuery.data?.total ?? 0} messages</span>
          <span><span className="online-dot" /> All systems operational</span>
        </footer>
      </section>
    </main>
  );
}

function MailLoading(): JSX.Element {
  return <div className="mail-loading" aria-label="Loading emails">{[1, 2, 3].map((item) => <span key={item} />)}</div>;
}

function EmptyMailbox({ searchTerm, mailbox, onCompose }: { searchTerm: string; mailbox: Mailbox; onCompose: () => void }): JSX.Element {
  return (
    <div className="empty-mailbox">
      <div className="empty-icon">{searchTerm ? <Search size={22} /> : mailbox === 'scheduled' ? <Inbox size={23} /> : <Send size={22} />}</div>
      <h2>{searchTerm ? 'No matching email' : mailbox === 'scheduled' ? 'Nothing waiting to send' : 'Your sent mail will appear here'}</h2>
      <p>{searchTerm ? 'Try another recipient, subject, or phrase.' : 'Keep your outreach moving with a thoughtfully timed message.'}</p>
      {!searchTerm && mailbox === 'scheduled' && <button className="compose-button empty-compose" onClick={onCompose}><Plus size={16} /> Compose email</button>}
    </div>
  );
}

export { getInitials, formatTime };
