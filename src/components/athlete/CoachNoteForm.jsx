import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

export default function CoachNoteForm({ athleteEmail, onClose }) {
  const { user } = useAuth();
  const [note, setNote] = useState('');
  const qc = useQueryClient();

  const mut = useMutation({
    mutationFn: () => base44.entities.CoachMessage.create({
      sender_email: user?.email,
      sender_name: user?.full_name || user?.email,
      recipient_email: athleteEmail,
      subject: 'Coach Note',
      body: note,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['messages'] }); onClose(); },
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Coach Note</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Note for {athleteEmail}</Label><Textarea value={note} onChange={e => setNote(e.target.value)} rows={4} placeholder="Write a note or feedback for this athlete…" /></div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => mut.mutate()} disabled={!note.trim()}>Send Note</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}