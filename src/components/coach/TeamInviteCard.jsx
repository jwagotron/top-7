import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, RefreshCw, Link, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function TeamInviteCard({ team, onTeamUpdated }) {
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [togglingJoin, setTogglingJoin] = useState(false);

  const joinUrl = `${window.location.origin}/join?code=${team.invite_code}`;

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied!');
  };

  const handleRegenerate = async () => {
    if (!window.confirm('Regenerate invite code? The old code will stop working.')) return;
    setRegenerating(true);
    await base44.functions.invoke('generateTeamCode', { team_id: team.id, regenerate: true });
    toast.success('Invite code regenerated');
    onTeamUpdated?.();
    setRegenerating(false);
  };

  const handleToggleAutoJoin = async () => {
    setTogglingJoin(true);
    await base44.entities.Team.update(team.id, { auto_join: !team.auto_join });
    toast.success(`Join mode set to ${!team.auto_join ? 'Auto-Join' : 'Approval Required'}`);
    onTeamUpdated?.();
    setTogglingJoin(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Link className="w-4 h-4" /> Team Invite
          </span>
          <Badge variant={team.auto_join ? 'default' : 'outline'} className="text-xs">
            {team.auto_join ? 'Auto-Join ON' : 'Approval Required'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* QR Code */}
        <div className="flex justify-center">
          <div className="p-3 bg-white rounded-xl shadow-sm border border-border">
            <QRCodeSVG value={joinUrl} size={140} level="M" />
          </div>
        </div>

        {/* Invite code */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Invite Code</p>
          <div className="flex items-center justify-center gap-2">
            <span className="font-mono text-xl font-bold tracking-widest">{team.invite_code}</span>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleCopy(team.invite_code)}>
              {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>

        {/* Join link */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => handleCopy(joinUrl)}>
            <Copy className="w-3.5 h-3.5 mr-1" /> Copy Link
          </Button>
          <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={handleRegenerate} disabled={regenerating}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${regenerating ? 'animate-spin' : ''}`} /> New Code
          </Button>
        </div>

        {/* Toggle join mode */}
        <button
          onClick={handleToggleAutoJoin}
          disabled={togglingJoin}
          className="w-full flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/60 transition-all"
        >
          <div className="text-left">
            <p className="text-xs font-semibold">{team.auto_join ? 'Auto-Join Enabled' : 'Approval Required'}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {team.auto_join ? 'Athletes join instantly with the code' : 'You review and approve each request'}
            </p>
          </div>
          {team.auto_join
            ? <ToggleRight className="w-5 h-5 text-primary shrink-0" />
            : <ToggleLeft className="w-5 h-5 text-muted-foreground shrink-0" />
          }
        </button>
      </CardContent>
    </Card>
  );
}