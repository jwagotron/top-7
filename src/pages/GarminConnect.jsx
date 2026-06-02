import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import TopBar from '@/components/layout/TopBar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertCircle, Clock, Activity, Zap, Upload } from 'lucide-react';
import FitImportDialog from '@/components/workouts/FitImportDialog';

// TODO: Replace with real Garmin OAuth URL once credentials are approved
// GARMIN_CLIENT_ID, GARMIN_CLIENT_SECRET, GARMIN_REDIRECT_URI must be set as env vars on the backend
const GARMIN_OAUTH_URL = '#'; // placeholder — backend service handles redirect

const steps = [
  { icon: '1', title: 'Connect your device', desc: 'Link your Garmin watch to automatically import activities into your training log.' },
  { icon: '2', title: 'Auto-sync workouts', desc: 'Your completed activities sync seamlessly to track your progress toward goals.' },
  { icon: '3', title: 'Stay on plan', desc: 'Coach-assigned workouts appear on your watch for structured guidance.' },
];

export default function GarminConnect() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const importMut = useMutation({
    mutationFn: (data) => base44.entities.Workout.create({ ...data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sync-events'] }),
  });

  const handleImport = (data) => {
    importMut.mutate(data);
    setShowImport(false);
  };

  const { data: connections = [] } = useQuery({
    queryKey: ['device-connections', user?.email],
    queryFn: () => base44.entities.DeviceConnection.filter({ user_email: user?.email }),
    enabled: !!user,
  });

  const { data: syncEvents = [] } = useQuery({
    queryKey: ['sync-events', user?.email],
    queryFn: () => base44.entities.GarminSyncEvent.filter({ user_email: user?.email }, '-received_at', 20),
    enabled: !!user,
  });

  const garmin = connections.find(c => c.provider === 'garmin');
  const isConnected = garmin?.status === 'connected';

  const disconnectMut = useMutation({
    mutationFn: () => base44.entities.DeviceConnection.update(garmin.id, {
      status: 'disconnected',
      disconnected_at: new Date().toISOString(),
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['device-connections'] }),
  });

  // Simulate a manual re-sync trigger (real implementation needs backend)
  const handleManualSync = async () => {
    setSyncing(true);
    await base44.entities.GarminSyncEvent.create({
      user_email: user.email,
      event_type: 'activity_import',
      received_at: new Date().toISOString(),
      processing_status: 'pending',
      payload_summary: 'Manual sync triggered by user',
    });
    setTimeout(() => setSyncing(false), 2000);
    qc.invalidateQueries({ queryKey: ['sync-events'] });
  };

  // Simulate connection (real OAuth flow needs backend redirect)
  const handleConnect = async () => {
    if (!garmin) {
      await base44.entities.DeviceConnection.create({
        user_email: user.email,
        provider: 'garmin',
        status: 'pending',
        consented_at: new Date().toISOString(),
        scopes: 'activity:read,workout:write',
      });
      qc.invalidateQueries({ queryKey: ['device-connections'] });
    }
    // OAuth redirect will be enabled once Garmin credentials are configured
  };

  const statusConfig = {
    connected: { color: 'bg-secondary/10 text-secondary border-secondary/20', icon: CheckCircle2, label: 'Connected' },
    disconnected: { color: 'bg-muted text-muted-foreground border-border', icon: WifiOff, label: 'Not Connected' },
    pending: { color: 'bg-accent/10 text-accent border-accent/20', icon: Clock, label: 'Pending Authorization' },
    error: { color: 'bg-destructive/10 text-destructive border-destructive/20', icon: AlertCircle, label: 'Connection Error' },
  };
  const sc = statusConfig[garmin?.status || 'disconnected'];

  return (
    <div className="min-h-screen bg-background">
      <FitImportDialog open={showImport} onClose={() => setShowImport(false)} onImport={handleImport} />
      <TopBar title="Device Sync">
        <Button size="sm" variant="outline" onClick={() => setShowImport(true)} className="gap-1.5">
          <Upload className="w-4 h-4" /> Import File
        </Button>
      </TopBar>
      <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-6">

        {/* Status card */}
        <Card className={`border-2 ${sc.color}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isConnected ? 'bg-secondary/10' : 'bg-muted'}`}>
                  {isConnected ? <Wifi className="w-6 h-6 text-secondary" /> : <WifiOff className="w-6 h-6 text-muted-foreground" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-lg">Garmin Connect</h2>
                    <Badge className={sc.color}>{sc.label}</Badge>
                  </div>
                  {garmin?.last_sync_at && (
                    <p className="text-sm text-muted-foreground">Last sync: {format(new Date(garmin.last_sync_at), 'MMM d, yyyy h:mm a')}</p>
                  )}
                  {garmin?.external_user_id && (
                    <p className="text-xs text-muted-foreground">Garmin ID: {garmin.external_user_id}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {isConnected ? (
                  <>
                    <Button variant="outline" size="sm" onClick={handleManualSync} disabled={syncing}>
                      <RefreshCw className={`w-4 h-4 mr-1 ${syncing ? 'animate-spin' : ''}`} />
                      {syncing ? 'Syncing…' : 'Sync Now'}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => disconnectMut.mutate()}>Disconnect</Button>
                  </>
                ) : (
                  <Button onClick={handleConnect} className="gap-2">
                    <Zap className="w-4 h-4" /> Connect Garmin
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How it works */}
        {!isConnected && (
          <Card>
            <CardHeader><CardTitle className="text-base">How it works</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {steps.map(s => (
                <div key={s.icon} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center shrink-0">{s.icon}</div>
                  <div>
                    <p className="font-medium text-sm">{s.title}</p>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                </div>
              ))}
              <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground border border-border">
                <strong>Note:</strong> Direct device sync is coming soon. In the meantime, you can manually import <strong>.fit</strong> or <strong>.gpx</strong> files exported from Garmin Connect or Apple Health using the <em>Import File</em> button above.
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sync event log */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Activity className="w-4 h-4" /> Sync History</CardTitle>
            <CardDescription>Recent sync events for your account</CardDescription>
          </CardHeader>
          <CardContent>
            {syncEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No sync events yet.</p>
            ) : (
              <div className="space-y-2">
                {syncEvents.map(e => (
                  <div key={e.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${e.processing_status === 'success' ? 'bg-secondary' : e.processing_status === 'failed' ? 'bg-destructive' : 'bg-accent'}`} />
                      <span className="text-sm">{e.event_type.replace(/_/g, ' ')}</span>
                      {e.payload_summary && <span className="text-xs text-muted-foreground">— {e.payload_summary}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{e.processing_status}</Badge>
                      <span className="text-xs text-muted-foreground">{e.received_at ? format(new Date(e.received_at), 'MMM d, h:mm a') : '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}