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

  const handleJoin = async () => {
    if (!teamCode.trim()) {
      setError('Please enter a team code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await base44.functions.invoke('joinTeam', {
        invite_code: teamCode.toUpperCase().trim(),
      });

      const data = response.data;
      const msg = data.status === 'active'
        ? `Joined ${data.team_name}!`
        : `Request sent to ${data.team_name} — awaiting approval.`;
      toast.success(msg);
      setTeamCode('');
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to join team';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleJoin();
    }
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
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">
              Team Code
            </label>
            <Input
              placeholder="e.g., ABC12345"
              value={teamCode}
              onChange={(e) => {
                setTeamCode(e.target.value.toUpperCase());
                setError('');
              }}
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
                  Joining...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Join Team
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}