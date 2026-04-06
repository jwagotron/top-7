import React, { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import usePullToRefresh from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/ui/PullToRefreshIndicator';
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
import { useUnits } from '@/hooks/useUnits';

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

function formatPaceDisplay(secPerKm, units) {
  if (!secPerKm) return null;
  const sec = units === 'mi' ? Math.round(secPerKm / 0.621371) : secPerKm;
  const min = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${min}:${String(s).padStart(2, '0')}`;
}

export default function Activities() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { units, toDisplay, label, paceLabel } = useUnits();
  const [search, setSearch] = useState('');
  const [sportFilter, setSportFilter] = useState('all');

  const handleRefresh = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ['my-activities', user?.email] });
  }, [qc, user?.email]);
  const ptr = usePullToRefresh(handleRefresh);

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

  const totalKm = activities.reduce((s, a) => s + (a.distance_m || 0) / 1000, 0);
  const totalDist = Math.round(toDisplay(totalKm) * 10) / 10;
  const totalHours = Math.round(activities.reduce((s, a) => s + (a.elapsed_sec || 0) / 3600, 0) * 10) / 10;

  return (
    <div className="min-h-screen bg-background">
      <PullToRefreshIndicator {...ptr} />
      <TopBar title="Activity History" />
      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-4 pb-24 lg:pb-6">

        {/* Summary */}
        <div className="grid grid-cols-3 gap-2 lg:gap-3">
          {[
            { label: 'Activities', value: activities.length, icon: Activity, color: 'text-primary' },
            { label: `Total ${label}`, value: totalDist, icon: MapPin, color: 'text-secondary' },
            { label: 'Total hrs', value: totalHours, icon: Clock, color: 'text-accent' },
          ].map(s => (
            <Card key={s.label} className="min-w-0">
              <CardContent className="p-3 flex flex-col gap-1">
                <s.icon className={`w-5 h-5 ${s.color} shrink-0`} />
                <p className="font-bold text-base leading-tight break-all">{s.value}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search activities…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 flex-wrap">
          {['all', 'run', 'bike', 'swim', 'strength'].map(s => (
            <Button key={s} size="sm" variant={sportFilter === s ? 'default' : 'outline'} onClick={() => setSportFilter(s)} className="text-xs">
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
              <CardContent className="p-3 lg:p-4">
                {/* Header row */}
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-base ${sportColors[a.sport] || 'bg-muted'}`}>
                    {a.sport === 'run' ? '🏃' : a.sport === 'bike' ? '🚴' : a.sport === 'swim' ? '🏊' : '💪'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm leading-tight flex-1 min-w-0 break-words">{a.title || `${a.sport.charAt(0).toUpperCase() + a.sport.slice(1)} Activity`}</p>
                      <Badge className={`${sourceColors[a.source]} shrink-0 text-[10px]`} variant="outline">{a.source}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{format(new Date(a.started_at), 'EEE, MMM d · h:mm a')}</p>
                  </div>
                </div>
                {/* Metrics row */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 ml-12">
                  {a.distance_m && (
                    <span className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">{toDisplay(a.distance_m / 1000).toFixed(2)}</span> {label}</span>
                  )}
                  {a.elapsed_sec && (
                    <span className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">{Math.floor(a.elapsed_sec / 60)}</span> min</span>
                  )}
                  {a.avg_pace_sec_per_km && (
                    <span className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">{formatPaceDisplay(a.avg_pace_sec_per_km, units)}</span> {paceLabel}</span>
                  )}
                  {a.avg_hr && (
                    <span className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">{a.avg_hr}</span> bpm</span>
                  )}
                  {a.calories && (
                    <span className="text-xs text-muted-foreground hidden lg:inline"><span className="font-semibold text-foreground">{a.calories}</span> kcal</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}