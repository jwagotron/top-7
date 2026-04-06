import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import TopBar from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Mail, MailOpen, Send, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/lib/AuthContext';

export default function Messages() {
  const [showCompose, setShowCompose] = useState(false);
  const [selected, setSelected] = useState(null);
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages'],
    queryFn: () => base44.entities.CoachMessage.list('-created_date', 100),
  });

  const createMut = useMutation({
    mutationFn: (d) => base44.entities.CoachMessage.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['messages'] }); setShowCompose(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CoachMessage.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['messages'] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.CoachMessage.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['messages'] }); setSelected(null); },
  });

  const handleSelect = (msg) => {
    setSelected(msg);
    if (!msg.read) {
      updateMut.mutate({ id: msg.id, data: { read: true } });
    }
  };

  return (
    <div>
      <TopBar title="Messages from Coach">
        <Button onClick={() => setShowCompose(true)} size="sm" className="gap-1.5 h-8 px-2 sm:px-3">
          <Plus className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline text-xs">Reply</span>
        </Button>
      </TopBar>
      <div className="p-4 lg:p-6 max-w-6xl mx-auto pb-28 lg:pb-8">
        <div className="flex flex-col lg:grid lg:grid-cols-5 gap-4 lg:gap-6">
          <div className={`lg:col-span-2 space-y-2 ${selected ? 'hidden lg:block' : 'block'}`}>
            {isLoading ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-20">
                <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No coaching messages yet</p>
              </div>
            ) : messages.map(msg => (
              <div
                key={msg.id}
                onClick={() => handleSelect(msg)}
                className={`p-4 rounded-xl cursor-pointer transition-all border ${selected?.id === msg.id ? 'bg-primary/5 border-primary/30' : 'bg-card border-border hover:bg-muted/50'}`}
              >
                <div className="flex items-start gap-3">
                  {msg.read ? <MailOpen className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" /> : <Mail className="w-4 h-4 text-primary mt-0.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{msg.sender_name || msg.sender_email}</span>
                      {!msg.read && <Badge className="bg-primary text-primary-foreground text-[9px] px-1.5">New</Badge>}
                    </div>
                    {msg.subject && <p className="text-xs font-medium truncate mt-0.5">{msg.subject}</p>}
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{msg.body}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{format(new Date(msg.created_date), 'MMM d, h:mm a')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className={`lg:col-span-3 ${selected ? 'block' : 'hidden lg:flex lg:flex-col lg:items-center lg:justify-center'}`}>
            {selected ? (
              <Card className="rounded-2xl border">
                <CardContent className="p-4 lg:p-6">
                  <div className="flex items-start gap-3 justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8 shrink-0" onClick={() => setSelected(null)}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                      </Button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-semibold text-base leading-tight break-words">{selected.subject || 'No Subject'}</h2>
                      <p className="text-xs text-muted-foreground mt-1 break-words">
                        From: {selected.sender_name || selected.sender_email} · {format(new Date(selected.created_date), 'MMM d, yyyy h:mm a')}
                      </p>
                      <p className="text-xs text-muted-foreground break-words">To: {selected.recipient_email}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => deleteMut.mutate(selected.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="border-t pt-4">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{selected.body}</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Mail className="w-10 h-10 mb-3" />
                <p className="text-sm">Select a message to read</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ComposeDialog
        open={showCompose}
        onClose={() => setShowCompose(false)}
        onSend={(data) => createMut.mutate({ ...data, sender_email: user?.email, sender_name: user?.full_name })}
      />
    </div>
  );
}

function ComposeDialog({ open, onClose, onSend }) {
  const [form, setForm] = useState({ recipient_email: '', subject: '', body: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSend(form);
    setForm({ recipient_email: '', subject: '', body: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>To</Label>
            <Input value={form.recipient_email} onChange={e => setForm(p => ({ ...p, recipient_email: e.target.value }))} placeholder="athlete@email.com" required type="email" />
          </div>
          <div>
            <Label>Subject</Label>
            <Input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="Training update" />
          </div>
          <div>
            <Label>Message</Label>
            <Textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} placeholder="Write your message..." rows={5} required />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="gap-2"><Send className="w-4 h-4" /> Send</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}