import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import TopBar from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Mail, Send, Trash2, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/lib/AuthContext';
import { useRole } from '@/lib/RoleContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { APP_NAME } from '@/lib/branding';
import { toast } from 'sonner';

export default function Messages() {
  const [showCompose, setShowCompose] = useState(false);
  const { user } = useAuth();
  const { role } = useRole();
  const qc = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();

  const { data: allMessages = [], isLoading } = useQuery({
    queryKey: ['messages', user?.email],
    queryFn: () => base44.entities.CoachMessage.list('-created_date', 200),
    enabled: !!user?.email,
  });

  const messages = allMessages.filter(m =>
    m.recipient_email === user?.email || m.sender_email === user?.email
  );

  const detailMatch = location.pathname.match(/^\/messages\/([^/]+)$/);
  const selectedId = detailMatch ? decodeURIComponent(detailMatch[1]) : null;
  const selected = selectedId ? messages.find(m => m.id === selectedId) || null : null;
  const unreadCount = messages.filter(m => !m.read && m.recipient_email === user?.email).length;

  const { data: recipientOptions = [] } = useQuery({
    queryKey: ['message-recipients', user?.email, role],
    queryFn: async () => {
      if (!user?.email) return [];
      const memberships = role === 'athlete'
        ? await base44.entities.TeamMembership.filter({ athlete_email: user.email, status: 'active' })
        : await base44.entities.TeamMembership.filter({ coach_email: user.email, status: 'active' });

      const candidates = role === 'athlete'
        ? memberships.map(m => ({ email: m.coach_email, name: 'Coach' }))
        : memberships.map(m => ({ email: m.athlete_email, name: m.athlete_name || m.athlete_email }));

      return [...new Map(
        candidates
          .filter(r => r.email)
          .map(r => [r.email, r])
      ).values()];
    },
    enabled: !!user?.email,
    staleTime: 30000,
  });

  const createMut = useMutation({
    mutationFn: (d) => base44.entities.CoachMessage.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['messages', user?.email] }); setShowCompose(false); },
    onError: (error) => toast.error(error?.message || 'Could not send message. Please try again.'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CoachMessage.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['messages', user?.email] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.CoachMessage.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages', user?.email] });
      navigate('/messages', { replace: true });
      toast.success('Message deleted');
    },
    onError: (error) => toast.error(error?.message || 'Could not delete message. Please try again.'),
  });

  const handleSelect = (msg) => {
    navigate(`/messages/${msg.id}`);
  };

  useEffect(() => {
    if (selected && !selected.read && selected.recipient_email === user?.email) {
      updateMut.mutate({ id: selected.id, data: { read: true } });
    }
  }, [selected?.id]);

  useEffect(() => {
    if (!isLoading && selectedId && !selected) {
      navigate('/messages', { replace: true });
    }
  }, [isLoading, selectedId, selected, navigate]);

  useEffect(() => {
    if (!location.pathname.startsWith('/messages')) return;
    document.title = selected
      ? `${selected.subject || 'Message'} | ${APP_NAME}`
      : `Messages | ${APP_NAME}`;
  }, [selected, location.pathname]);

  return (
    <div>
      <TopBar title="Messages">
        {unreadCount > 0 && (
          <Badge className="bg-primary text-primary-foreground text-xs">{unreadCount} new</Badge>
        )}
        <Button onClick={() => setShowCompose(true)} size="sm" className="gap-1.5 h-8 px-3">
          <Plus className="w-4 h-4" />
          <span className="text-xs">New Message</span>
        </Button>
      </TopBar>

      <div className="p-4 lg:p-6 max-w-5xl mx-auto pb-28 lg:pb-8">
        <div className="flex flex-col lg:grid lg:grid-cols-5 gap-4 lg:gap-6">
          {/* Message list */}
          <div className={`lg:col-span-2 space-y-2 ${selectedId ? 'hidden lg:block' : 'block'}`}>
            {isLoading ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-20 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto">
                  <MessageSquare className="w-7 h-7 text-muted-foreground/30" />
                </div>
                <p className="text-sm text-muted-foreground">No messages yet</p>
                {role === 'athlete' && (
                  <p className="text-xs text-muted-foreground/60">Your coach's notes and messages will appear here</p>
                )}
              </div>
            ) : messages.map(msg => {
              const isFromMe = msg.sender_email === user?.email;
              const isUnread = !msg.read && msg.recipient_email === user?.email;
              return (
                <div
                  key={msg.id}
                  onClick={() => handleSelect(msg)}
                  className={`p-3.5 rounded-xl cursor-pointer transition-all border ${
                    selected?.id === msg.id
                      ? 'bg-primary/5 border-primary/30'
                      : 'bg-card border-border hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isFromMe ? 'bg-secondary/15 text-secondary' : 'bg-primary/15 text-primary'
                    }`}>
                      {(isFromMe ? msg.recipient_email : (msg.sender_name || msg.sender_email))[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-sm truncate ${isUnread ? 'font-semibold' : 'font-medium'}`}>
                          {isFromMe ? `To: ${msg.recipient_email}` : (msg.sender_name || msg.sender_email)}
                        </span>
                        {isUnread && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                      </div>
                      {msg.subject && <p className="text-xs font-medium truncate mt-0.5 text-muted-foreground">{msg.subject}</p>}
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{msg.body}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">{format(new Date(msg.created_date), 'MMM d, h:mm a')}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Message detail */}
          <div className={`lg:col-span-3 ${selected ? 'block' : 'hidden lg:flex lg:flex-col lg:items-center lg:justify-center'}`}>
            {selected ? (
              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="p-5 border-b border-border">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <Button variant="ghost" size="sm" className="lg:hidden h-8 px-2 gap-1 -ml-1" onClick={() => navigate(-1)}>
                      ← Back
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive shrink-0 ml-auto"
                      disabled={deleteMut.isPending}
                      onClick={() => {
                        if (window.confirm(`Delete "${selected.subject || 'this message'}"? This cannot be undone.`)) {
                          deleteMut.mutate(selected.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <h2 className="font-semibold text-base leading-tight">{selected.subject || 'No Subject'}</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    From: <span className="font-medium">{selected.sender_name || selected.sender_email}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    To: <span className="font-medium">{selected.recipient_email}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{format(new Date(selected.created_date), 'MMMM d, yyyy · h:mm a')}</p>
                </div>
                <div className="p-5">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{selected.body}</p>
                </div>
                {/* Quick reply */}
                {selected.sender_email !== user?.email && (
                  <QuickReply
                    toEmail={selected.sender_email}
                    subject={`Re: ${selected.subject || ''}`}
                    onSend={(d) => createMut.mutateAsync({ ...d, sender_email: user?.email, sender_name: user?.full_name || user?.email })}
                  />
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center">
                  <Mail className="w-7 h-7 text-muted-foreground/30" />
                </div>
                <p className="text-sm">Select a message to read</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ComposeDialog
        open={showCompose}
        onClose={() => setShowCompose(false)}
        onSend={(data) => createMut.mutateAsync({ ...data, sender_email: user?.email, sender_name: user?.full_name || user?.email })}
        recipientOptions={recipientOptions}
      />
    </div>
  );
}

function QuickReply({ toEmail, subject, onSend }) {
  const [body, setBody] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!body.trim() || sending) return;
    setSending(true);
    try {
      await onSend({ recipient_email: toEmail, subject, body });
      setBody('');
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch {
      // Mutation-level onError presents the failure and leaves the reply intact.
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="px-5 pb-5 border-t border-border pt-4">
      <p className="text-xs font-semibold text-muted-foreground mb-2">Reply</p>
      {sent ? (
        <p className="text-sm text-secondary font-medium">✓ Reply sent!</p>
      ) : (
        <div className="space-y-2">
          <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write your reply…" rows={3} className="text-sm" />
          <Button size="sm" className="gap-2" onClick={handleSend} disabled={!body.trim() || sending}>
            <Send className="w-3.5 h-3.5" /> {sending ? 'Sending…' : 'Send Reply'}
          </Button>
        </div>
      )}
    </div>
  );
}

function ComposeDialog({ open, onClose, onSend, recipientOptions = [] }) {
  const [form, setForm] = useState({ recipient_email: '', subject: '', body: '' });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    try {
      await onSend(form);
      setForm({ recipient_email: '', subject: '', body: '' });
    } catch {
      // Mutation-level onError presents the failure and keeps the draft intact.
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New Message</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>To</Label>
            {recipientOptions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2 mb-2">
                {recipientOptions.map(recipient => {
                  const selected = form.recipient_email === recipient.email;
                  return (
                    <button
                      key={recipient.email}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, recipient_email: recipient.email }))}
                      className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${selected ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/40 border-border text-foreground hover:border-primary/40'}`}
                    >
                      {recipient.name || recipient.email}
                    </button>
                  );
                })}
              </div>
            )}
            <Input
              value={form.recipient_email}
              onChange={e => setForm(p => ({ ...p, recipient_email: e.target.value }))}
              placeholder={recipientOptions.length > 0 ? 'Choose above or enter an email' : 'coach@school.edu'}
              required
              type="email"
            />
          </div>
          <div>
            <Label>Subject</Label>
            <Input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="Training question" />
          </div>
          <div>
            <Label>Message</Label>
            <Textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} placeholder="Write your message..." rows={5} required />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={sending}>Cancel</Button>
            <Button type="submit" className="gap-2" disabled={sending}>
              <Send className="w-4 h-4" /> {sending ? 'Sending…' : 'Send'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}