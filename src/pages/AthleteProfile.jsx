import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import TopBar from '@/components/layout/TopBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, parseISO, subWeeks } from 'date-fns';
import { Trophy, Target, MessageSquare, Activity, TrendingUp, Calendar, MapPin, Clock, Heart } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import RaceGoalForm from '@/components/athlete/RaceGoalForm';
import CoachNoteForm from '@/components/athlete/CoachNoteForm';

const priorityColors = { A: 'bg-destructive/10 text-destructive', B: 'bg-accent/10 text-accent', C: 'bg-muted text-muted-foreground' };

export default function AthleteProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const athleteEmail = urlParams.get('athlete');
  const [showRaceForm, setShowRaceForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const qc = useQueryClient();

  const { data: workouts = [] } = useQuery({
    queryKey: ['workouts-athlete', athleteEmail],
    queryFn: () => base44.entities.Workout.filter({ created_by: athleteEmail }),
    enabled: !!athleteEmail,
  });

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

  const createRaceMut = useMutation({
    mutationFn: d => base44.entities.RaceGoal.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['race-goals'] }); setShowRaceForm(false); }
  });

  // Weekly volume for last 8 weeks
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
  const completedWorkouts = feedback.filter(f => f.completion_status === 'completed').length;
  const compliance = feedback.length ? Math.round(completedWorkouts / feedback.length * 100) : 0;
  const avgRpe = feedback.length ? (feedback.reduce((s, f) => s + (f.rpe || 0), 0) / feedback.filter(f => f.rpe).length).toFixed(1) : '—';

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
      <TopBar title={athleteEmail}>
        <Button size="sm" onClick={() => setShowNoteForm(true)} variant="outline"><MessageSquare className="w-4 h-4 mr-1" /> Add Note</Button>
        <Button size="sm" onClick={() => setShowRaceForm(true)}><Trophy className="w-4 h-4 mr-1" /> Add Race</Button>
      </TopBar>

      <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Activities', value: activities.length, icon: Activity, color: 'text-primary' },
            { label: 'Total km', value: totalKm, icon: MapPin, color: 'text-secondary' },
            { label: 'Compliance', value: `${compliance}%`, icon: TrendingUp, color: 'text-accent' },
            { label: 'Avg RPE', value: avgRpe, icon: Heart, color: 'text-destructive' },
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

        <Tabs defaultValue="activities">
          <TabsList>
            <TabsTrigger value="activities">Activities</TabsTrigger>
            <TabsTrigger value="volume">Volume</TabsTrigger>
            <TabsTrigger value="races">Races</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
          </TabsList>

          <TabsContent value="activities" className="space-y-3 mt-4">
            {activities.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">No activities yet.</p>}
            {activities.slice(0, 20).map(a => (
              <Card key={a.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{a.title || a.sport}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(a.started_at), 'MMM d, yyyy')}</p>
                  </div>
                  <div className="flex gap-4 text-sm text-muted-foreground">
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
                      <Badge className={priorityColors[r.priority]}>{r.priority}-Race</Badge>
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

          <TabsContent value="feedback" className="space-y-3 mt-4">
            {feedback.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">No feedback submitted yet.</p>}
            {feedback.map(f => (
              <Card key={f.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      {f.rpe && <div className="text-center"><p className="text-lg font-bold text-primary">{f.rpe}</p><p className="text-[10px] text-muted-foreground">RPE</p></div>}
                      <div>
                        <Badge variant="outline">{f.completion_status}</Badge>
                        {f.soreness && <span className="ml-2 text-xs text-muted-foreground">Soreness: {f.soreness}</span>}
                        {f.energy_level && <span className="ml-2 text-xs text-muted-foreground">Energy: {f.energy_level}</span>}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{format(new Date(f.created_date), 'MMM d')}</p>
                  </div>
                  {f.notes && <p className="text-sm mt-2 text-muted-foreground">{f.notes}</p>}
                </CardContent>
              </Card>
            ))}
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