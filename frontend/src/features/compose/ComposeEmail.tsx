import { useMemo, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import Papa from 'papaparse';
import { ArrowLeft, Bold, CalendarDays, Check, Clock3, Italic, List, Paperclip, Send, Sparkles, Underline, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { listSenders, scheduleEmails } from '../../api/emails.api.js';
import { useAuth } from '../auth/AuthProvider.js';

interface ComposeEmailProps {
  onClose: () => void;
  onScheduled: () => Promise<void>;
}

function toLocalInputValue(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function extractEmails(value: string): string[] {
  return [...new Set(value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)?.map((email) => email.toLowerCase()) ?? [])];
}

export default function ComposeEmail({ onClose, onScheduled }: ComposeEmailProps): JSX.Element {
  const { user } = useAuth();
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientInput, setRecipientInput] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [delaySeconds, setDelaySeconds] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(50);
  const [startTime, setStartTime] = useState(toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000)));
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [fileName, setFileName] = useState('');
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const senderQuery = useQuery({ queryKey: ['senders'], queryFn: listSenders });

  const mutation = useMutation({
    mutationFn: scheduleEmails,
    onSuccess: async (result) => {
      toast.success(`${result.total} email${result.total === 1 ? '' : 's'} scheduled`);
      await onScheduled();
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const invalidCount = useMemo(() => recipients.filter((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)).length, [recipients]);
  const senderLabel = senderQuery.data?.[0]?.email ?? user?.email ?? 'Automatic sender rotation';

  const addRecipients = (value: string) => {
    const parsed = extractEmails(value);
    if (parsed.length === 0) return;
    setRecipients((current) => [...new Set([...current, ...parsed])]);
    setRecipientInput('');
  };

  const handleRecipientKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',' || event.key === ' ') {
      event.preventDefault();
      addRecipients(recipientInput);
    }
    if (event.key === 'Backspace' && !recipientInput && recipients.length) {
      setRecipients((current) => current.slice(0, -1));
    }
  };

  const handleFile = (file?: File) => {
    if (!file) return;
    setFileName(file.name);
    Papa.parse<string[]>(file, {
      skipEmptyLines: 'greedy',
      complete: ({ data }) => {
        const found = extractEmails(data.flat().join('\n'));
        if (found.length === 0) {
          toast.error('No email addresses found in that file');
          return;
        }
        setRecipients((current) => [...new Set([...current, ...found])]);
        toast.success(`${found.length} email addresses added`);
      },
      error: () => toast.error('Could not read that file'),
    });
  };

  const wrapSelection = (before: string, after = before) => {
    const input = bodyRef.current;
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selected = body.slice(start, end) || 'text';
    const updated = `${body.slice(0, start)}${before}${selected}${after}${body.slice(end)}`;
    setBody(updated);
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };

  const chooseQuickTime = (hour: number) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(hour, 0, 0, 0);
    setStartTime(toLocalInputValue(tomorrow));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    addRecipients(recipientInput);
    const leads = [...new Set([...recipients, ...extractEmails(recipientInput)])];
    if (!leads.length) {
      toast.error('Add at least one recipient');
      return;
    }
    if (!subject.trim() || !body.trim()) {
      toast.error('Add a subject and message');
      return;
    }
    if (invalidCount) {
      toast.error('Remove invalid email addresses first');
      return;
    }

    mutation.mutate({
      subject: subject.trim(),
      body: body.trim(),
      leads,
      startTime: new Date(startTime).toISOString(),
      delayBetweenMs: Math.max(0, delaySeconds) * 1000,
      hourlyLimit: Math.max(1, hourlyLimit),
    });
  };

  return (
    <main className="compose-page">
      <form className="compose-shell" onSubmit={submit}>
        <header className="compose-header">
          <button className="icon-button" type="button" title="Back to inbox" onClick={onClose}><ArrowLeft size={20} /></button>
          <h1>Compose New Email</h1>
          <div className="compose-header-actions">
            <label className="icon-button attach-control" title="Upload recipient list">
              <Paperclip size={18} />
              <input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={(event) => handleFile(event.target.files?.[0])} />
            </label>
            <button className="icon-button" type="button" title="Choose a delivery time" onClick={() => setScheduleOpen((open) => !open)}><Clock3 size={18} /></button>
            <button className="outline-green-button" type="submit" disabled={mutation.isPending}><Send size={15} /> {mutation.isPending ? 'Scheduling…' : 'Send Later'}</button>
          </div>
        </header>

        <div className="compose-form-content">
          <label className="compose-field from-field">
            <span>From</span>
            <div className="from-value">{senderLabel}<small> · automatic rotation</small></div>
          </label>
          <div className="compose-field recipients-field">
            <span>To</span>
            <div className="recipient-entry">
              {recipients.map((email) => <button type="button" className="recipient-chip" key={email} onClick={() => setRecipients((current) => current.filter((item) => item !== email))}>{email}<X size={11} /></button>)}
              <input value={recipientInput} onChange={(event) => setRecipientInput(event.target.value)} onKeyDown={handleRecipientKey} onBlur={() => addRecipients(recipientInput)} placeholder="recipient@example.com" aria-label="Recipients" />
              <label className="upload-inline"><Upload size={14} /> Upload List<input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={(event) => handleFile(event.target.files?.[0])} /></label>
            </div>
            {(fileName || recipients.length > 0) && <small className="recipient-count">{recipients.length} recipients{fileName ? ` · ${fileName}` : ''}{invalidCount ? ` · ${invalidCount} invalid` : ''}</small>}
          </div>
          <label className="compose-field subject-field"><span>Subject</span><input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Subject" maxLength={998} /></label>

          <div className="compose-controls">
            <label>Delay between emails<input type="number" min="0" max="86400" value={delaySeconds} onChange={(event) => setDelaySeconds(Number(event.target.value))} /></label>
            <label>Hourly limit<input type="number" min="1" value={hourlyLimit} onChange={(event) => setHourlyLimit(Number(event.target.value))} /></label>
            <span className="recipient-summary">{recipients.length} recipient{recipients.length === 1 ? '' : 's'}</span>
          </div>

          <section className="message-editor" aria-label="Email message">
            <div className="editor-toolbar">
              <button type="button" title="Bold" onClick={() => wrapSelection('**')}><Bold size={16} /></button>
              <button type="button" title="Italic" onClick={() => wrapSelection('*')}><Italic size={16} /></button>
              <button type="button" title="Underline" onClick={() => wrapSelection('__')}><Underline size={16} /></button>
              <span className="toolbar-divider" />
              <button type="button" title="Bulleted list" onClick={() => wrapSelection('\n- ', '')}><List size={16} /></button>
              <span className="editor-help">Plain-text message</span>
            </div>
            <textarea ref={bodyRef} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Type your message…" aria-label="Email body" />
          </section>

          <div className="compose-bottom-note"><Sparkles size={14} /> Messages are sent from your connected Ethereal test senders.</div>
        </div>

        {scheduleOpen && (
          <aside className="schedule-popover">
            <div className="popover-heading"><strong>Send Later</strong><button type="button" title="Close schedule picker" onClick={() => setScheduleOpen(false)}><X size={16} /></button></div>
            <label className="custom-time"><CalendarDays size={15} /><input type="datetime-local" value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label>
            <div className="quick-times">
              <button type="button" onClick={() => chooseQuickTime(9)}>Tomorrow</button>
              <button type="button" onClick={() => chooseQuickTime(10)}>Tomorrow, 10:00 AM</button>
              <button type="button" onClick={() => chooseQuickTime(11)}>Tomorrow, 11:00 AM</button>
              <button type="button" onClick={() => chooseQuickTime(15)}>Tomorrow, 3:00 PM</button>
            </div>
            <div className="popover-actions"><button type="button" className="text-button" onClick={() => setScheduleOpen(false)}>Cancel</button><button type="button" className="outline-green-button small" onClick={() => setScheduleOpen(false)}><Check size={14} /> Done</button></div>
          </aside>
        )}
      </form>
    </main>
  );
}