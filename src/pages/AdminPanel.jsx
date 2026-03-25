import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import TopBar from '@/components/layout/TopBar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { Activity, Wifi, AlertCircle, CheckCircle2, Clock, RefreshCw, Users, Shield } from 'lucide-react';

const statusDot = { success: 'bg-secondary', failed: 'bg-destructive', pending: 'bg-accent', duplicate: 'bg-muted-foreground' };

export default function AdminPanel() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: syncEvents = [], isLoading: loadingEvents } = useQuery({
    queryKey: ['all-sync-events'],
    queryFn: () => base44.entities.GarminSyncEvent.list('-received_at', 100),
  });

  const { data: connections = [] } = useQuery({
    queryKey: ['all-connections'],
    queryFn: () => base44.entities.DeviceConnection.list(),
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['all-activities'],
    queryFn: () => base44.entities.Activity.list('-created_date', 200),
  });

  const resyncMut = useMutation({
    mutationFn: (email) => base44.entities.GarminSyncEvent.create({
      user_email: email,
      event_type: 'activity_import',
      received_at: new Date().toISOString(),
      processing_status: 'pending',
      payload_summary: 'Admin-triggered manual resync',
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['all-sync-events'] }),
  });

  const connected = connections.filter(c => c.status === 'connected');
  const failed = syncEvents.filter(e => e.processing_status === 'failed');
  const pending = syncEvents.filter(e => e.processing_status === 'pending');

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background">
        <TopBar title="Admin Panel" />
        <div className="p-8 text-center">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Admin access required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Admin Panel" />
      <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-6">

        {/* Health overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Connected Devices', value: connected.length, icon: Wifi, color: 'text-secondary' },
            { label: 'Total Activities', value: activities.length, icon: Activity, color: 'text-primary' },
            { label: 'Pending Events', value: pending.length, icon: Clock, color: 'text-accent' },
            { label: 'Failed Events', value: failed.length, icon: AlertCircle, color: 'text-destructive' },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <s.icon className={`w-8 h-8 ${s.color}`} />
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Env config notice */}
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-accent mb-2">⚙️ Garmin Integration Config</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 text-xs font-mono text-muted-foreground">
              {['GARMIN_CLIENT_ID', 'GARMIN_CLIENT_SECRET', 'GARMIN_WEBHOOK_SECRET', 'GARMIN_API_BASE_URL', 'GARMIN_REDIRECT_URI'].map(k => (
                <div key={k} className="flex items-center justify-between bg-background rounded px-3 py-1.5 border border-border">
                  <span>{k}</span>
                  <Badge variant="outline" className="text-[10px]">NOT SET</Badge>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">Set these as secrets/env vars once Garmin developer approval is obtained. Backend functions (Builder+) required.</p>
          </CardContent>
        </Card>

        <Tabs defaultValue="webhook-log">
          <TabsList>
            <TabsTrigger value="webhook-log">Webhook / Sync Log</TabsTrigger>
            <TabsTrigger value="connections">Device Connections</TabsTrigger>
            <TabsTrigger value="activities">Imported Activities</TabsTrigger>
          </TabsList>

          <TabsContent value="webhook-log" className="mt-4 space-y-2">
            {loadingEvents && <p className="text-sm text-muted-foreground">Loading…</p>}
            {syncEvents.length === 0 && !loadingEvents && (
              <div className="text-center py-10 text-muted-foreground text-sm">No sync events recorded yet.</div>
            )}
            {syncEvents.map(e => (
              <Card key={e.id}>
                <CardContent className="p-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusDot[e.processing_status] || 'bg-muted'}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{e.event_type.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-muted-foreground truncate">{e.user_email} {e.payload_summary ? `— ${e.payload_summary}` : ''}</p>
                      {e.error_message && <p className="text-xs text-destructive">{e.error_message}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-xs">{e.processing_status}</Badge>
                    <span className="text-xs text-muted-foreground">{e.received_at ? format(new Date(e.received_at), 'MMM d, HH:mm') : '—'}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="connections" className="mt-4 space-y-2">
            {connections.length === 0 && <div className="text-center py-10 text-muted-foreground text-sm">No device connections found.</div>}
            {connections.map(c => (
              <Card key={c.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{c.user_email}</p>
                      <Badge className={c.status === 'connected' ? 'bg-secondary/10 text-secondary' : 'bg-muted text-muted-foreground'}>{c.status}</Badge>
                      <Badge variant="outline">{c.provider}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {c.last_sync_at ? `Last sync: ${format(new Date(c.last_sync_at), 'MMM d, HH:mm')}` : 'Never synced'}
                      {c.external_user_id ? ` · ID: ${c.external_user_id}` : ''}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => resyncMut.mutate(c.user_email)}>
                    <RefreshCw className="w-3 h-3 mr-1" /> Resync
                  </Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="activities" className="mt-4 space-y-2">
            {activities.length === 0 && <div className="text-center py-10 text-muted-foreground text-sm">No imported activities found.</div>}
            {activities.map(a => (
              <Card key={a.id}>
                <CardContent className="p-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">{a.title || a.sport}</p>
                    <p className="text-xs text-muted-foreground">{a.user_email} · {format(new Date(a.started_at), 'MMM d, yyyy')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.distance_m && <span className="text-xs text-muted-foreground">{(a.distance_m / 1000).toFixed(2)} km</span>}
                    <Badge variant="outline" className="text-xs">{a.source}</Badge>
                    <Badge className={a.import_status === 'imported' ? 'bg-secondary/10 text-secondary' : 'bg-muted text-muted-foreground'} variant="outline">{a.import_status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}