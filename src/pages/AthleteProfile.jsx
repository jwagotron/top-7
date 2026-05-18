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
import { format, parseISO, subWeeks } from 'date-fns';
import { Trophy, MessageSquare, Activity, TrendingUp, MapPin, Clock, Heart, ArrowLeft, CheckCircle2, XCircle, Send } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import RaceGoalForm from '@/components/athlete/RaceGoalForm';
import CoachNoteForm from '@/components/athlete/CoachNoteForm';
import { parseDateOnly } from '@/lib/dateUtils';
import { useAuth } from '@/lib/AuthContext';

const priorityColors = { A: 'bg-destructive/10 text-destructive', B: 'bg-accent/10 text-accent', C: 'bg-muted text-muted-foreground' };

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

  const { data: activities = [] } = useQuery({
    queryKey: ['activities-athlete', athleteEmail],
    queryFn: () => base44.entities.Activity.filter({ user_email: athleteEmail }),
    enabled: !!athleteEmail,
  });

  const { data: raceGoals = [] } = useQuery({
    queryKey: ['race-goals', athleteEmail],
    queryFn: () => base44.entities.RaceGoal.filter({ athlete_email: athleteEmail }),
    enabled: !!athleteEmail,
  });

  const { data: feedback = [] } = useQuery({
    queryKey: ['feedback-athlete', athleteEmail],
    queryFn: () => base44.entities.AthleteFeedback.filter({ athlete_email: athleteEmail }),
    enabled: !!athleteEmail,
  });

  const { data: plannedWorkouts = [] } = useQuery({
    queryKey: ['planned-athlete', athleteEmail],
    queryFn: () => base44.entities.PlannedWorkout.filter({ assigned_to: athleteEmail }, 'scheduled_date', 200),
    enabled: !!athleteEmail,
  });

  const { data: completions = [] } = useQuery({
    queryKey: ['completions-athlete', athleteEmail],
    queryFn: () => base44.entities.WorkoutCompletion.filter({ athlete_email: athleteEmail }, '-completed_at', 200),
    enabled: !!athleteEmail,
  });

  const { data: allMessages = [] } = useQuery({
    queryKey: ['messages-thread', athleteEmail, user?.email],
    queryFn: () => base44.entities.CoachMessage.list('-created_date', 100),
    enabled: !!athleteEmail && !!user?.email,
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
      qc.invalidateQueries({ queryKey: ['messages'] });
      setReplyBody('');
    },
  });

  const createRaceMut = useMutation({
    mutationFn: d => base44.entities.RaceGoal.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['race-goals'] }); setShowRaceForm(false); }
  });

  const weeklyData = Array.from({ length: 8 }, (_, i) => {
    const weekStart = subWeeks(new Date(), 7 - i);
    const weekEnd = subWeeks(new Date(), 6 - i);
    const weekActs = activities.filter(a => {
      const d = new Date(a.started_at);
      return d >= weekStart && d < weekEnd;
    });
    return {
      week: `W${i + 1}`,
      km: Math.round(weekActs.reduce((s, a) => s + (a.distance_m || 0) / 1000, 0) * 10) / 10,
    };
  });

  const totalKm = Math.round(activities.reduce((s, a) => s + (a.distance_m || 0) / 1000, 0));
  const completedCount = completions.filter(c => c.status === 'completed').length;
  const compliance = plannedWorkouts.length > 0 ? Math.round((completedCount / plannedWorkouts.length) * 100) : 0;
  const avgRpe = feedback.filter(f => f.rpe).length
    ? (feedback.reduce((s, f) => s + (f.rpe || 0), 0) / feedback.filter(f => f.rpe).length).toFixed(1)
    : '—';

  const unreadInThread = thread.filter(m => !m.read && m.recipient_email === user?.email).length;

  if (!athleteEmail) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar title="Athlete Profile" />
        <div className="p-8 text-center text-muted-foreground">No athlete selected.</div>
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
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Activities', value: activities.length, icon: Activity, color: 'text-primary' },
            { label: 'Total km', value: totalKm, icon: MapPin, color: 'text-secondary' },
            { label: 'Compliance', value: `${compliance}%`, icon: TrendingUp, color: 'text-accent' },
            { label: 'Avg RPE', value: avgRpe, icon: Heart, color: 'text-destructive' },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <s.icon className={`w-7 h-7 ${s.color}`} />
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="workouts">
          <TabsList>
            <TabsTrigger value="workouts">Workouts</TabsTrigger>
            <TabsTrigger value="activities">Activities</TabsTrigger>
            <TabsTrigger value="volume">Volume</TabsTrigger>
            <TabsTrigger value="races">Races</TabsTrigger>
            <TabsTrigger value="messages">
              Messages {unreadInThread > 0 && <Badge className="ml-1 h-4 px-1 text-[10px]">{unreadInThread}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workouts" className="space-y-3 mt-4">
            {plannedWorkouts.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No workouts assigned yet.</p>
            ) : plannedWorkouts.map(w => {
              const comp = completions.find(c => c.planned_workout_id === w.id);
              const done = comp?.status === 'completed';
              const isPast = parseDateOnly(w.scheduled_date) < new Date();
              const missed = !done && isPast;
              return (
                <Card key={w.id} className={done ? 'border-secondary/30' : missed ? 'border-destructive/20' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {done ? <CheckCircle2 className="w-4 h-4 text-secondary shrink-0" />
                            : missed ? <XCircle className="w-4 h-4 text-destructive/50 shrink-0" /> : null}
                          <p className={`font-medium text-sm ${done ? 'text-secondary' : ''}`}>{w.title}</p>
                          {w.run_type && <Badge variant="outline" className="text-[10px]">{w.run_type.replace('_', ' ')}</Badge>}
                        </div>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span>{format(parseDateOnly(w.scheduled_date), 'MMM d')}</span>
                          {w.target_distance_km && <span><MapPin className="w-3 h-3 inline mr-0.5" />{w.target_distance_km} km</span>}
                          {w.target_duration_minutes && <span><Clock className="w-3 h-3 inline mr-0.5" />{w.target_duration_minutes} min</span>}
                        </div>
                        {comp?.notes && (
                          <p className="text-xs text-muted-foreground italic mt-1.5 border-l-2 border-secondary/30 pl-2">"{comp.notes}"</p>
                        )}
                      </div>
                      <Badge className={`text-[10px] shrink-0 ${done ? 'bg-secondary/10 text-secondary' : missed ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                        {done ? 'Done' : missed ? 'Missed' : 'Upcoming'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="activities" className="space-y-3 mt-4">
            {activities.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">No activities yet.</p>}
            {activities.slice(0, 20).map(a => (
              <Card key={a.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{a.title || a.sport}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(a.started_at), 'MMM d, yyyy')}</p>
                  </div>
                  <div className="flex gap-3 text-sm text-muted-foreground flex-wrap justify-end">
                    {a.distance_m && <span>{(a.distance_m / 1000).toFixed(2)} km</span>}
                    {a.elapsed_sec && <span><Clock className="w-3 h-3 inline mr-1" />{Math.round(a.elapsed_sec / 60)} min</span>}
                    {a.avg_hr && <span><Heart className="w-3 h-3 inline mr-1" />{a.avg_hr} bpm</span>}
                    <Badge variant="outline" className="text-xs">{a.source}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="volume" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Weekly Volume (km) — Last 8 Weeks</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={weeklyData}>
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="km" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="races" className="space-y-3 mt-4">
            {raceGoals.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">No races added yet.</p>}
            {raceGoals.map(r => (
              <Card key={r.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-accent" />
                      <p className="font-medium">{r.race_name}</p>
                      {r.priority && <Badge className={priorityColors[r.priority]}>{r.priority}-Race</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{format(parseISO(r.race_date), 'MMMM d, yyyy')} · {r.distance}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium text-primary">{r.goal_time || '—'}</p>
                    <p className="text-xs text-muted-foreground">Goal time</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="messages" className="mt-4 space-y-3">
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {thread.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">No messages yet. Send a note to this athlete.</p>
              ) : thread.map(msg => {
                const isFromMe = msg.sender_email === user?.email;
                return (
                  <div key={msg.id} className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${isFromMe ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                      <p className="text-sm leading-relaxed">{msg.body}</p>
                      <p className={`text-[10px] mt-1 ${isFromMe ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
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