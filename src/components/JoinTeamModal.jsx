import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function JoinTeamModal({ open, onOpenChange, onSuccess }) {
  const [teamCode, setTeamCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingTeamName, setPendingTeamName] = useState(null);

  const handleJoin = async () => {
    if (!teamCode.trim()) {
      setError('Please enter a team code');
      return;
    }
    setLoading(true);
    setError('');
    console.log('[joinTeam] submit started', { code: teamCode.trim() });
    try {
      const response = await base44.functions.invoke('joinTeam', {
        invite_code: teamCode.toUpperCase().trim(),
      });
      const data = response.data;
      console.log('[joinTeam] submit success', data);
      if (data.status === 'active') {
        toast.success(`You've joined ${data.team_name}!`);
        setTeamCode('');
        onOpenChange(false);
        onSuccess?.();
      } else {
        setPendingTeamName(data.team_name);
        toast.success(`Request sent to ${data.team_name} — waiting for coach approval.`);
        onSuccess?.();
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to join team';
      console.error('[joinTeam] submit failed', msg);
      if (msg.toLowerCase().includes('pending') || msg.toLowerCase().includes('already')) {
        setError('You already have a pending request for this team. Wait for your coach to approve.');
      } else if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('invalid')) {
        setError('Invalid team code. Please check with your coach.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !loading) handleJoin();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join a Team</DialogTitle>
          <DialogDescription>
            Enter your coach's team code to join their training program.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {pendingTeamName ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 className="w-10 h-10 text-secondary" />
              <div>
                <p className="font-semibold text-foreground">Request Pending</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Waiting for your coach to approve your request to join{' '}
                  <span className="font-medium">{pendingTeamName}</span>.
                </p>
              </div>
              <Button
                className="w-full"
                onClick={() => { setPendingTeamName(null); onOpenChange(false); }}
              >
                Close
              </Button>
            </div>
          ) : (
            <>
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Team Code
                </label>
                <Input
                  placeholder="e.g., ABC12345"
                  value={teamCode}
                  onChange={(e) => { setTeamCode(e.target.value.toUpperCase()); setError(''); }}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  className="uppercase font-mono tracking-widest"
                  maxLength={8}
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Ask your coach for their 8-character invite code
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleJoin}
                  disabled={loading || !teamCode.trim()}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Request'
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}