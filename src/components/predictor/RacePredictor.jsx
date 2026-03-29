import React, { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, LineChart, AlertCircle } from 'lucide-react';
import RacePredictorCard from './RacePredictorCard';
import {
  generatePredictions, generateExplanation, computeTrend,
  computeReadiness, RACE_DISTANCES,
} from '@/lib/predictionEngine';
import { format } from 'date-fns';

export default function RacePredictor({ userEmail }) {
  const qc = useQueryClient();

  const { data: workouts = [] } = useQuery({
    queryKey: ['workouts'],
    queryFn: () => base44.entities.Workout.list('-date', 200),
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['activities'],
    queryFn: () => base44.entities.Activity.filter({ user_email: userEmail }, '-started_at', 200),
    enabled: !!userEmail,
  });

  const { data: benchmarks = [] } = useQuery({
    queryKey: ['benchmarks', userEmail],
    queryFn: () => base44.entities.BenchmarkEffort.filter({ athlete_email: userEmail }, '-date', 50),
    enabled: !!userEmail,
  });

  const { data: existingPredictions = [] } = useQuery({
    queryKey: ['race-predictions', userEmail],
    queryFn: () => base44.entities.RacePrediction.filter({ athlete_email: userEmail }, '-prediction_date', 30),
    enabled: !!userEmail,
  });

  const saveMut = useMutation({
    mutationFn: (data) => base44.entities.RacePrediction.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['race-predictions', userEmail] }),
  });

  // Latest saved prediction per distance
  const latestByDistance = useMemo(() => {
    const map = {};
    existingPredictions.forEach(p => {
      if (!map[p.distance] || p.prediction_date > map[p.distance].prediction_date)
        map[p.distance] = p;
    });
    return map;
  }, [existingPredictions]);

  // Compute fresh predictions from training data
  const freshPredictions = useMemo(() => {
    if (!workouts.length && !activities.length && !benchmarks.length) return null;
    return generatePredictions({ workouts, activities, benchmarks });
  }, [workouts, activities, benchmarks]);

  const handleRecalculate = () => {
    if (!freshPredictions || !userEmail) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    Object.entries(RACE_DISTANCES).forEach(([dist, km]) => {
      const p = freshPredictions[dist];
      if (!p) return;
      const prev = latestByDistance[dist];
      const trend = computeTrend(p.predicted_time_sec, prev?.predicted_time_sec);
      const readiness = computeReadiness(workouts, km);
      const explanation = generateExplanation(
        dist, p.predicted_time_sec, prev?.predicted_time_sec,
        p.confidence, p.flags, p.topEvidence
      );
      saveMut.mutate({
        athlete_email: userEmail,
        prediction_date: today,
        distance: dist,
        predicted_time_sec: p.predicted_time_sec,
        previous_time_sec: prev?.predicted_time_sec || null,
        confidence: p.confidence,
        trend,
        readiness_score: readiness,
        explanation,
        evidence_summary: p.topEvidence?.join('; '),
        data_quality_flags: p.flags,
      });
    });
  };

  // Display: prefer saved, fall back to computed-on-the-fly
  const displayPredictions = useMemo(() => {
    const map = {};
    Object.keys(RACE_DISTANCES).forEach(dist => {
      const saved = latestByDistance[dist];
      const fresh = freshPredictions?.[dist];
      if (saved) {
        // Enrich saved with fresh readiness if available
        map[dist] = { ...saved, paceSecPerKm: saved.predicted_time_sec ? Math.round(saved.predicted_time_sec / RACE_DISTANCES[dist]) : null };
      } else if (fresh) {
        const km = RACE_DISTANCES[dist];
        map[dist] = {
          distance: dist,
          predicted_time_sec: fresh.predicted_time_sec,
          confidence: fresh.confidence,
          trend: 'steady',
          readiness_score: computeReadiness(workouts, km),
          paceSecPerKm: fresh.paceSecPerKm,
          explanation: generateExplanation(dist, fresh.predicted_time_sec, null, fresh.confidence, fresh.flags, fresh.topEvidence),
        };
      }
    });
    return map;
  }, [latestByDistance, freshPredictions, workouts]);

  const hasData = Object.values(displayPredictions).some(Boolean);
  const lastUpdated = existingPredictions[0]?.prediction_date;
  const hasEnoughData = workouts.filter(w => w.sport === 'run').length >= 3 || benchmarks.length >= 1;

  return (
    <Card className="border rounded-2xl">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <LineChart className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Race Predictor</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lastUpdated
                  ? `Calculated ${format(new Date(lastUpdated), 'MMM d, yyyy')} · Multi-signal weighted model`
                  : 'Multi-signal weighted model · Riegel-based projection'}
              </p>
            </div>
          </div>
          <Button
            size="sm" variant="outline"
            onClick={handleRecalculate}
            disabled={saveMut.isPending || !hasEnoughData}
            className="shrink-0"
          >
            <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', saveMut.isPending && 'animate-spin')} />
            Recalculate
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {!hasData && (
          <div className="py-10 flex flex-col items-center gap-3 text-center">
            <AlertCircle className="w-8 h-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Not enough data yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Log at least 3 runs — including a race, time trial, or tempo — to generate meaningful predictions.
              </p>
            </div>
            <Button size="sm" onClick={handleRecalculate} disabled={!hasEnoughData}>
              Try anyway
            </Button>
          </div>
        )}

        {hasData && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {Object.entries(displayPredictions).map(([dist, pred]) =>
              pred ? (
                <RacePredictorCard key={dist} distance={dist} prediction={pred} />
              ) : (
                <div key={dist} className="border rounded-xl p-4 flex flex-col gap-2 bg-muted/30">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {dist.replace('_', ' ')}
                  </p>
                  <p className="text-xl font-bold text-muted-foreground">--</p>
                  <p className="text-[11px] text-muted-foreground">Insufficient data</p>
                </div>
              )
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}