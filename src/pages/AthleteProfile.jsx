import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import TopBar from '@/components/layout/TopBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, parseISO, subDays, startOfWeek, isWithinInterval } from 'date-fns';
import {
  Trophy, MessageSquare, TrendingUp, MapPin, Clock, Heart,
  ArrowLeft, CheckCircle2, XCircle, Send, Flame, Target,
  BarChart2, Zap, Award, CalendarCheck, AlertCircle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Cell
} from 'recharts';
import RaceGoalForm from '@/components/athlete/RaceGoalForm';
import CoachNoteForm from '@/components/athlete/CoachNoteForm';
import { parseDateOnly } from '@/lib/dateUtils';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';
import { useUnits } from '@/hooks/useUnits';

const priorityColors = {
  A: 'bg-destructive/10 text-destructive border-destructive/20',
  B: 'bg-accent/10 text-accent border-accent/20',
  C: 'bg-muted text-muted-foreground border-border'
};

function StatCard({ icon: Icon, label, value, sub, color = 'text-primary', bg = 'bg-primary/10' }) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
            <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', bg)}>
            <Icon className={cn('w-5 h-5', color)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ComplianceRing({ value }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const fill = circ * (value / 100);
  const color = value >= 80 ? '#22c55e' : value >= 60 ? '#3b82f6' : value >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
        <circle
          cx="48" cy="48" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 48 48)"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
        <text x="48" y="48" textAnchor="middle" dy="0.35em" fontSize="18" fontWeight="700" fill="currentColor">{value}%</text>
      </svg>
      <p className="text-xs text-muted-foreground font-medium">Compliance</p>
    </div>
  );
}

export default function AthleteProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const athleteEmail = urlParams.get('athlete');
  const athleteName = urlParams.get('name');
  const [showRaceForm, setShowRaceForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toDisplay, label } = useUnits();

  // Debug logs for coach viewing athlete profile
  console.log('[AthleteProfile] athleteEmail from URL:', athleteEmail);
  console.log('[AthleteProfile] current viewer (coach):', user?.email, 'role:', user?.role);

  const { data: raceGoals = [], isLoading: loadingGoals } = useQuery({
    queryKey: ['race-goals', athleteEmail],
    queryFn: () => base44.entities.RaceGoal.filter({ athlete_email: athleteEmail }),
    enabled: !!athleteEmail,
  });

  const { data: plannedWorkouts = [], isLoading: loadingWorkouts } = useQuery({
    queryKey: ['planned-athlete', athleteEmail],
    queryFn: () => base44.entities.PlannedWorkout.filter({ assigned_to: athleteEmail }, 'scheduled_date', 300),
    enabled: !!athleteEmail,
  });

  const { data: completions = [] } = useQuery({
    queryKey: ['completions-athlete', athleteEmail],
    queryFn: () => base44.entities.WorkoutCompletion.filter({ athlete_email: athleteEmail }, '-completed_at', 300),
    enabled: !!athleteEmail,
  });

  const { data: allMessages = [] } = useQuery({
    queryKey: ['messages-thread', athleteEmail, user?.email],
    queryFn: () => base44.entities.CoachMessage.list('-created_date', 100),
    enabled: !!athleteEmail && !!user?.email,
  });

  const { data: feedback = [] } = useQuery({
    queryKey: ['feedback-athlete', athleteEmail],
    queryFn: () => base44.entities.AthleteFeedback.filter({ athlete_email: athleteEmail }),
    enabled: !!athleteEmail,
  });

  const thread = allMessages.filter(m =>
    (m.sender_email === user?.email && m.recipient_email === athleteEmail) ||
    (m.sender_email === athleteEmail && m.recipient_email === user?.email)
  ).sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

  const sendMut = useMutation({
    mutationFn: (body) => base44.entities.CoachMessage.create({
      sender_email: user?.email,
      sender_name: user?.full_name || user?.email,
      recipient_email: athleteEmail,
      subject: 'Coach Note',
      body,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages-thread'] });
      setReplyBody('');
    },
  });

  const createRaceMut = useMutation({
    mutationFn: d => base44.entities.RaceGoal.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['race-goals'] }); setShowRaceForm(false); }
  });

  // ── Derived stats ──────────────────────────────────────────────
  // Debug: log loaded data state
  console.log('[AthleteProfile] plannedWorkouts loaded:', plannedWorkouts.length, 'completions:', completions.length, 'feedback:', feedback.length);

  const completedIds = new Set(completions.filter(c => c.status === 'completed').map(c => c.planned_workout_id));
  const today = new Date();
  const pastWorkouts = plannedWorkouts.filter(w => parseDateOnly(w.scheduled_date) <= today);
  const compliance = pastWorkouts.length > 0 ? Math.round((completedIds.size / pastWorkouts.length) * 100) : 0;

  const totalDistanceKm = completions
    .filter(c => c.status === 'completed' && c.distance_logged_km)
    .reduce((s, c) => s + c.distance_logged_km, 0);
  const totalDistance = toDisplay(totalDistanceKm);

  const avgRpe = feedback.filter(f => f.rpe).length
    ? (feedback.reduce((s, f) => s + (f.rpe || 0), 0) / feedback.filter(f => f.rpe).length).toFixed(1)
    : '—';

  // Current streak
  const sortedPast = [...pastWorkouts].sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date));
  let streak = 0;
  for (const w of sortedPast) {
    if (completedIds.has(w.id)) streak++;
    else break;
  }

  // Last 8 weeks chart
  const weeklyChart = Array.from({ length: 8 }, (_, i) => {
    const weekEnd = subDays(today, (7 - i - 1) * 7);
    const weekStart = subDays(weekEnd, 6);
    const label = `W${i + 1}`;
    const scheduled = plannedWorkouts.filter(w => {
      const d = parseDateOnly(w.scheduled_date);
      return d >= weekStart && d <= weekEnd;
    });
    const done = scheduled.filter(w => completedIds.has(w.id)).length;
    return { week: label, scheduled: scheduled.length, completed: done };
  });

  // Volume chart (target km per week)
  const volumeChart = Array.from({ length: 8 }, (_, i) => {
    const weekEnd = subDays(today, (7 - i - 1) * 7);
    const weekStart = subDays(weekEnd, 6);
    const weekCompletions = completions.filter(c => {
      if (c.status !== 'completed' || !c.completed_at) return false;
      const d = new Date(c.completed_at);
      return d >= weekStart && d <= weekEnd;
    });
    const km = weekCompletions.reduce((s, c) => s + (c.distance_logged_km || 0), 0);
    return { week: `W${i + 1}`, dist: Math.round(toDisplay(km) * 10) / 10 };
  });

  const unreadInThread = thread.filter(m => !m.read && m.recipient_email === user?.email).length;
  const upcomingRace = raceGoals.filter(r => r.status === 'upcoming').sort((a, b) => new Date(a.race_date) - new Date(b.race_date))[0];

  const initials = (athleteName || athleteEmail || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const isLoading = loadingGoals || loadingWorkouts;

  if (!athleteEmail) {
    console.warn('[AthleteProfile] No athleteEmail in URL — rendering empty state');
    return (
      <div className="min-h-screen bg-background">
        <TopBar title="Athlete Profile" />
        <div className="p-8 text-center text-muted-foreground">No athlete selected.</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar title={athleteName || 'Athlete Profile'} />
        <div className="p-8 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar title={athleteName || athleteEmail}>
        <Button size="sm" variant="ghost" onClick={() => navigate(-1)} className="gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <Button size="sm" onClick={() => setShowNoteForm(true)} variant="outline">
          <MessageSquare className="w-4 h-4 mr-1" /> Note
        </Button>
        <Button size="sm" onClick={() => setShowRaceForm(true)}>
          <Trophy className="w-4 h-4 mr-1" /> Race
        </Button>
      </TopBar>

      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-5 pb-24 lg:pb-8">

        {/* Hero header */}
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-card to-secondary/10 border border-border/40 p-5 flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary shrink-0">
            {initials}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl font-bold text-foreground">{athleteName || athleteEmail}</h2>
            <p className="text-sm text-muted-foreground">{athleteEmail}</p>
            {upcomingRace && (
              <div className="inline-flex items-center gap-1.5 mt-2 bg-accent/10 text-accent border border-accent/20 rounded-full px-3 py-1 text-xs font-medium">
                <Trophy className="w-3 h-3" />
                Next race: {upcomingRace.race_name} · {format(parseISO(upcomingRace.race_date), 'MMM d, yyyy')}
              </div>
            )}
          </div>
          <div className="sm:self-start">
            <ComplianceRing value={compliance} />
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={CalendarCheck} label="Completed" value={completedIds.size}
            sub={`of ${pastWorkouts.length} workouts`}
            color="text-secondary" bg="bg-secondary/10"
          />
          <StatCard
            icon={MapPin} label="Total Distance" value={totalDistance > 0 ? `${totalDistance.toFixed(1)} ${label}` : '—'}
            sub={`logged ${label}`}
            color="text-primary" bg="bg-primary/10"
          />
          <StatCard
            icon={Flame} label="Streak" value={streak}
            sub={streak === 1 ? 'workout in a row' : 'workouts in a row'}
            color="text-accent" bg="bg-accent/10"
          />
          <StatCard
            icon={Heart} label="Avg RPE" value={avgRpe}
            sub="rate of perceived effort"
            color="text-destructive" bg="bg-destructive/10"
          />
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="workouts">Workouts</TabsTrigger>
            <TabsTrigger value="volume">Volume</TabsTrigger>
            <TabsTrigger value="races">Races</TabsTrigger>
            <TabsTrigger value="messages">
              Messages {unreadInThread > 0 && <Badge className="ml-1 h-4 px-1 text-[10px]">{unreadInThread}</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* Overview tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Weekly completion chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-primary" /> Weekly Completion — Last 8 Weeks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={weeklyChart} barGap={2}>
                    <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="scheduled" name="Scheduled" fill="hsl(var(--muted))" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="completed" name="Completed" fill="hsl(var(--secondary))" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Recent workouts quick view */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Zap className="w-4 h-4 text-accent" /> Recent Workouts
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {pastWorkouts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No recent activity.</p>
                ) : [...pastWorkouts].sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date)).slice(0, 5).map(w => {
                  const done = completedIds.has(w.id);
                  return (
                    <div key={w.id} className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0',
                          done ? 'bg-secondary/15' : 'bg-destructive/10')}>
                          {done
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-secondary" />
                            : <XCircle className="w-3.5 h-3.5 text-destructive/50" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{w.title}</p>
                          <p className="text-xs text-muted-foreground">{format(parseDateOnly(w.scheduled_date), 'MMM d')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
                        {w.target_distance_km && <span>{toDisplay(w.target_distance_km).toFixed(1)} {label}</span>}
                        <Badge variant={done ? 'secondary' : 'outline'} className={cn('text-[10px]',
                          done ? 'bg-secondary/10 text-secondary border-secondary/20' : 'text-destructive border-destructive/20')}>
                          {done ? 'Done' : 'Missed'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* RPE trend if available */}
            {feedback.filter(f => f.rpe).length > 2 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" /> RPE Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={feedback.filter(f => f.rpe).slice(-12).map((f, i) => ({ i: i + 1, rpe: f.rpe }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="i" tick={{ fontSize: 10 }} />
                      <YAxis domain={[1, 10]} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="rpe" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Workouts tab */}
          <TabsContent value="workouts" className="space-y-3 mt-4">
            {plannedWorkouts.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No workouts assigned yet.</p>
            ) : [...plannedWorkouts].sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date)).map(w => {
              const comp = completions.find(c => c.planned_workout_id === w.id);
              const done = comp?.status === 'completed';
              const isPast = parseDateOnly(w.scheduled_date) <= today;
              const missed = !done && isPast;
              return (
                <Card key={w.id} className={cn('transition-colors', done ? 'border-secondary/30' : missed ? 'border-destructive/20' : '')}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {done && <CheckCircle2 className="w-4 h-4 text-secondary shrink-0" />}
                          {missed && <AlertCircle className="w-4 h-4 text-destructive/50 shrink-0" />}
                          <p className={cn('font-medium text-sm', done ? 'text-secondary' : '')}>{w.title}</p>
                          {w.run_type && <Badge variant="outline" className="text-[10px]">{w.run_type.replace('_', ' ')}</Badge>}
                        </div>
                        <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
                          <span>{format(parseDateOnly(w.scheduled_date), 'MMM d, yyyy')}</span>
                          {w.target_distance_km && <span><MapPin className="w-3 h-3 inline mr-0.5" />{toDisplay(w.target_distance_km).toFixed(1)} {label}</span>}
                          {w.target_duration_minutes && <span><Clock className="w-3 h-3 inline mr-0.5" />{w.target_duration_minutes} min</span>}
                        </div>
                        {comp?.notes && (
                          <p className="text-xs text-muted-foreground italic mt-1.5 border-l-2 border-secondary/30 pl-2">"{comp.notes}"</p>
                        )}
                      </div>
                      <Badge className={cn('text-[10px] shrink-0',
                        done ? 'bg-secondary/10 text-secondary border-secondary/20' :
                        missed ? 'bg-destructive/10 text-destructive border-destructive/20' :
                        'bg-primary/10 text-primary border-primary/20')}>
                        {done ? '✓ Done' : missed ? '✗ Missed' : 'Upcoming'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* Volume tab */}
          <TabsContent value="volume" className="mt-4 space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Weekly Distance ({label}) — Last 8 Weeks</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={volumeChart}>
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="dist" name={label} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                      {volumeChart.map((entry, i) => (
                        <Cell key={i} fill={entry.dist > 0 ? 'hsl(var(--primary))' : 'hsl(var(--muted))'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Races tab */}
          <TabsContent value="races" className="space-y-3 mt-4">
            {raceGoals.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">No races added yet.</p>}
            {raceGoals.map(r => (
              <Card key={r.id}>
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', priorityColors[r.priority] || 'bg-muted')}>
                      <Trophy className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{r.race_name}</p>
                        {r.priority && <Badge variant="outline" className={cn('text-[10px]', priorityColors[r.priority])}>{r.priority}-Race</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{format(parseISO(r.race_date), 'MMMM d, yyyy')} · {r.distance}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-primary text-lg">{r.goal_time || '—'}</p>
                    <p className="text-[10px] text-muted-foreground">Goal time</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Messages tab */}
          <TabsContent value="messages" className="mt-4 space-y-3">
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {thread.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">No messages yet.</p>
              ) : thread.map(msg => {
                const isFromMe = msg.sender_email === user?.email;
                return (
                  <div key={msg.id} className={cn('flex', isFromMe ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[80%] rounded-2xl px-4 py-2.5',
                      isFromMe ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground')}>
                      <p className="text-sm leading-relaxed">{msg.body}</p>
                      <p className={cn('text-[10px] mt-1', isFromMe ? 'text-primary-foreground/60' : 'text-muted-foreground')}>
                        {isFromMe ? 'You' : (msg.sender_name || 'Athlete')} · {format(new Date(msg.created_date), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 pt-2 border-t border-border">
              <Textarea
                value={replyBody}
                onChange={e => setReplyBody(e.target.value)}
                placeholder="Write a note or message to this athlete…"
                rows={2}
                className="flex-1 text-sm resize-none"
              />
              <Button
                size="sm"
                className="self-end gap-1.5 shrink-0"
                onClick={() => replyBody.trim() && sendMut.mutate(replyBody)}
                disabled={!replyBody.trim() || sendMut.isPending}
              >
                <Send className="w-3.5 h-3.5" /> Send
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {showRaceForm && (
        <RaceGoalForm
          athleteEmail={athleteEmail}
          onSubmit={d => createRaceMut.mutate({ ...d, athlete_email: athleteEmail })}
          onClose={() => setShowRaceForm(false)}
        />
      )}
      {showNoteForm && <CoachNoteForm athleteEmail={athleteEmail} onClose={() => setShowNoteForm(false)} />}
    </div>
  );
}