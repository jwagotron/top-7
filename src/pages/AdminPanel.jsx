import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import TopBar from '@/components/layout/TopBar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { Activity, Wifi, AlertCircle, Clock, RefreshCw, Shield } from 'lucide-react';
import ReviewTestAccounts from '@/components/admin/ReviewTestAccounts';

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

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: allTeams = [] } = useQuery({
    queryKey: ['all-teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  const { data: allMemberships = [] } = useQuery({
    queryKey: ['all-memberships-admin'],
    queryFn: () => base44.entities.TeamMembership.list(),
  });

  const handleChangeUserType = async (userId, newType) => {
    await base44.entities.User.update(userId, { user_type: newType });
    qc.invalidateQueries({ queryKey: ['all-users'] });
  };

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
      <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-4 lg:space-y-6 pb-24 lg:pb-8">

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

        <Tabs defaultValue="users">
          <TabsList className="w-full">
            <TabsTrigger value="users" className="flex-1 text-xs">Users</TabsTrigger>
            <TabsTrigger value="teams" className="flex-1 text-xs">Teams</TabsTrigger>
            <TabsTrigger value="webhook-log" className="flex-1 text-xs">Sync Log</TabsTrigger>
            <TabsTrigger value="connections" className="flex-1 text-xs">Connections</TabsTrigger>
            <TabsTrigger value="activities" className="flex-1 text-xs">Activities</TabsTrigger>
          </TabsList>

          {/* USERS TAB */}
          <TabsContent value="users" className="mt-4 space-y-4">
            <ReviewTestAccounts />
            <p className="text-xs text-muted-foreground">{allUsers.length} total users</p>
            {allUsers.map(u => (
              <Card key={u.id}>
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {(u.full_name || u.email || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{u.full_name || u.email}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-[10px]">{u.role || 'user'}</Badge>
                    <select
                      value={u.user_type || ''}
                      onChange={e => handleChangeUserType(u.id, e.target.value)}
                      className="text-xs border border-border rounded-md px-2 py-1 bg-background text-foreground"
                    >
                      <option value="">No type</option>
                      <option value="athlete">athlete</option>
                      <option value="coach">coach</option>
                    </select>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* TEAMS TAB */}
          <TabsContent value="teams" className="mt-4 space-y-2">
            <p className="text-xs text-muted-foreground mb-3">{allTeams.length} total teams</p>
            {allTeams.map(t => {
              const mems = allMemberships.filter(m => m.team_id === t.id && m.status === 'active');
              const pending = allMemberships.filter(m => m.team_id === t.id && m.status === 'pending');
              return (
                <Card key={t.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {t.logo_url && <img src={t.logo_url} alt="logo" className="w-8 h-8 rounded-lg object-cover shrink-0" />}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{t.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{t.coach_email} · {t.school_club || t.location || ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                        <Badge variant="outline" className="text-[10px]">{mems.length} athletes</Badge>
                        {pending.length > 0 && <Badge className="text-[10px] bg-accent/10 text-accent border-accent/20">{pending.length} pending</Badge>}
                        <Badge variant="outline" className="text-[10px]">{t.auto_join ? 'Auto-Join' : 'Approval'}</Badge>
                        <Badge className={`text-[10px] ${t.status === 'active' ? 'bg-secondary/10 text-secondary' : 'bg-muted text-muted-foreground'}`} variant="outline">{t.status}</Badge>
                      </div>
                    </div>
                    <p className="text-[10px] font-mono text-muted-foreground mt-1.5">Code: {t.invite_code}</p>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="webhook-log" className="mt-4 space-y-2">
            {loadingEvents && <p className="text-sm text-muted-foreground">Loading…</p>}
            {syncEvents.length === 0 && !loadingEvents && (
              <div className="text-center py-10 text-muted-foreground text-sm">No sync events recorded yet.</div>
            )}
            {syncEvents.map(e => (
              <Card key={e.id}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${statusDot[e.processing_status] || 'bg-muted'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-sm font-medium">{e.event_type.replace(/_/g, ' ')}</p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant="outline" className="text-[10px] px-1.5">{e.processing_status}</Badge>
                          <span className="text-[10px] text-muted-foreground">{e.received_at ? format(new Date(e.received_at), 'MMM d, HH:mm') : '—'}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{e.user_email}{e.payload_summary ? ` — ${e.payload_summary}` : ''}</p>
                      {e.error_message && <p className="text-xs text-destructive mt-0.5">{e.error_message}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="connections" className="mt-4 space-y-2">
            {connections.length === 0 && <div className="text-center py-10 text-muted-foreground text-sm">No device connections found.</div>}
            {connections.map(c => (
              <Card key={c.id}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-medium text-sm truncate">{c.user_email}</p>
                        <Badge className={`text-[10px] px-1.5 ${c.status === 'connected' ? 'bg-secondary/10 text-secondary' : 'bg-muted text-muted-foreground'}`}>{c.status}</Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5">{c.provider}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {c.last_sync_at ? `Last sync: ${format(new Date(c.last_sync_at), 'MMM d, HH:mm')}` : 'Never synced'}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" className="shrink-0" onClick={() => resyncMut.mutate(c.user_email)}>
                      <RefreshCw className="w-3 h-3 mr-1" /> Resync
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="activities" className="mt-4 space-y-2">
            {activities.length === 0 && <div className="text-center py-10 text-muted-foreground text-sm">No imported activities found.</div>}
            {activities.map(a => (
              <Card key={a.id}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{a.title || a.sport}</p>
                      <p className="text-xs text-muted-foreground truncate">{a.user_email} · {format(new Date(a.started_at), 'MMM d, yyyy')}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                      {a.distance_m && <span className="text-xs text-muted-foreground">{(a.distance_m / 1000).toFixed(1)}km</span>}
                      <Badge variant="outline" className="text-[10px] px-1.5">{a.source}</Badge>
                      <Badge className={`text-[10px] px-1.5 ${a.import_status === 'imported' ? 'bg-secondary/10 text-secondary' : 'bg-muted text-muted-foreground'}`} variant="outline">{a.import_status}</Badge>
                    </div>
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