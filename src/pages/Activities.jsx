import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import TopBar from '@/components/layout/TopBar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { MapPin, Clock, Heart, Zap, TrendingUp, Activity, Search, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const sportColors = {
  run: 'bg-primary/10 text-primary',
  bike: 'bg-secondary/10 text-secondary',
  swim: 'bg-chart-4/10 text-chart-4',
  strength: 'bg-accent/10 text-accent',
  other: 'bg-muted text-muted-foreground',
};

const sourceColors = {
  garmin: 'bg-chart-2/10 text-chart-2',
  gpx_import: 'bg-primary/10 text-primary',
  manual: 'bg-muted text-muted-foreground',
};

function formatPace(secPerKm) {
  if (!secPerKm) return null;
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);
  return `${min}:${String(sec).padStart(2, '0')}`;
}

export default function Activities() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [sportFilter, setSportFilter] = useState('all');

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['my-activities', user?.email],
    queryFn: () => base44.entities.Activity.filter({ user_email: user?.email }, '-started_at', 200),
    enabled: !!user,
  });

  const filtered = activities.filter(a => {
    const matchSearch = !search || (a.title || '').toLowerCase().includes(search.toLowerCase());
    const matchSport = sportFilter === 'all' || a.sport === sportFilter;
    return matchSearch && matchSport;
  });

  const totalKm = Math.round(activities.reduce((s, a) => s + (a.distance_m || 0) / 1000, 0) * 10) / 10;
  const totalHours = Math.round(activities.reduce((s, a) => s + (a.elapsed_sec || 0) / 3600, 0) * 10) / 10;

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Activity History" />
      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-5">

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Activities', value: activities.length, icon: Activity, color: 'text-primary' },
            { label: 'Total km', value: totalKm, icon: MapPin, color: 'text-secondary' },
            { label: 'Total hrs', value: totalHours, icon: Clock, color: 'text-accent' },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-3 flex items-center gap-2">
                <s.icon className={`w-6 h-6 ${s.color}`} />
                <div>
                  <p className="font-bold text-lg leading-none">{s.value}</p>
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search activities…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1">
            {['all', 'run', 'bike', 'swim', 'strength'].map(s => (
              <Button key={s} size="sm" variant={sportFilter === s ? 'default' : 'outline'} onClick={() => setSportFilter(s)}>
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Activity list */}
        {isLoading && <p className="text-sm text-muted-foreground text-center py-8">Loading activities…</p>}
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
            <Activity className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No activities found.</p>
            <p className="text-xs text-muted-foreground mt-1">Import a GPX file or connect Garmin to get started.</p>
          </div>
        )}

        <div className="space-y-2">
          {filtered.map(a => (
            <Card key={a.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-lg ${sportColors[a.sport] || 'bg-muted'}`}>
                      {a.sport === 'run' ? '🏃' : a.sport === 'bike' ? '🚴' : a.sport === 'swim' ? '🏊' : '💪'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{a.title || `${a.sport.charAt(0).toUpperCase() + a.sport.slice(1)} Activity`}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(a.started_at), 'EEEE, MMMM d, yyyy · h:mm a')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 flex-wrap justify-end">
                    {a.distance_m && (
                      <div className="text-right">
                        <p className="text-sm font-semibold">{(a.distance_m / 1000).toFixed(2)}</p>
                        <p className="text-[10px] text-muted-foreground">km</p>
                      </div>
                    )}
                    {a.elapsed_sec && (
                      <div className="text-right">
                        <p className="text-sm font-semibold">{Math.floor(a.elapsed_sec / 60)}</p>
                        <p className="text-[10px] text-muted-foreground">min</p>
                      </div>
                    )}
                    {a.avg_pace_sec_per_km && (
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatPace(a.avg_pace_sec_per_km)}</p>
                        <p className="text-[10px] text-muted-foreground">/km</p>
                      </div>
                    )}
                    {a.avg_hr && (
                      <div className="text-right">
                        <p className="text-sm font-semibold">{a.avg_hr}</p>
                        <p className="text-[10px] text-muted-foreground">bpm</p>
                      </div>
                    )}
                    {a.calories && (
                      <div className="text-right hidden lg:block">
                        <p className="text-sm font-semibold">{a.calories}</p>
                        <p className="text-[10px] text-muted-foreground">kcal</p>
                      </div>
                    )}
                    <Badge className={sourceColors[a.source]} variant="outline">{a.source}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}