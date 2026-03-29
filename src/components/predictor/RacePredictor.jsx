import React, { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Zap } from 'lucide-react';
import RacePredictorCard from './RacePredictorCard';
import {
  generatePredictions, generateExplanation, computeTrend,
  computeReadiness, RACE_DISTANCES, formatTime
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

  const { data: existingPredictions = [], isLoading } = useQuery({
    queryKey: ['race-predictions', userEmail],
    queryFn: () => base44.entities.RacePrediction.filter({ athlete_email: userEmail }, '-prediction_date', 20),
    enabled: !!userEmail,
  });

  const savePrediction = useMutation({
    mutationFn: (data) => base44.entities.RacePrediction.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['race-predictions', userEmail] }),
  });

  // Latest prediction per distance
  const latestByDistance = useMemo(() => {
    const map = {};
    existingPredictions.forEach(p => {
      if (!map[p.distance] || p.prediction_date > map[p.distance].prediction_date)
        map[p.distance] = p;
    });
    return map;
  }, [existingPredictions]);

  // Generate fresh predictions from data
  const freshPredictions = useMemo(() => {
    if (workouts.length === 0 && activities.length === 0) return null;
    return generatePredictions({ workouts, activities, benchmarks });
  }, [workouts, activities, benchmarks]);

  const handleRefresh = () => {
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
        p.confidence, p.flags, p.best_evidence
      );
      savePrediction.mutate({
        athlete_email: userEmail,
        prediction_date: today,
        distance: dist,
        predicted_time_sec: p.predicted_time_sec,
        previous_time_sec: prev?.predicted_time_sec || null,
        confidence: p.confidence,
        trend,
        readiness_score: readiness,
        explanation,
        evidence_summary: p.best_evidence,
        data_quality_flags: p.flags,
      });
    });
  };

  // Build display map: prefer saved predictions, enrich with fresh if available
  const displayPredictions = useMemo(() => {
    const map = {};
    Object.keys(RACE_DISTANCES).forEach(dist => {
      const saved = latestByDistance[dist];
      const fresh = freshPredictions?.[dist];
      if (saved) {
        map[dist] = saved;
      } else if (fresh) {
        const km = RACE_DISTANCES[dist];
        map[dist] = {
          distance: dist,
          predicted_time_sec: fresh.predicted_time_sec,
          confidence: fresh.confidence,
          trend: 'steady',
          readiness_score: computeReadiness(workouts, km),
          explanation: generateExplanation(dist, fresh.predicted_time_sec, null, fresh.confidence, fresh.flags, fresh.best_evidence),
        };
      }
    });
    return map;
  }, [latestByDistance, freshPredictions, workouts]);

  const hasAnyData = Object.values(displayPredictions).some(Boolean);
  const lastUpdated = existingPredictions[0]?.prediction_date;

  return (
    <Card className="border rounded-2xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Race Predictor</CardTitle>
              {lastUpdated && (
                <p className="text-xs text-muted-foreground">Updated {format(new Date(lastUpdated), 'MMM d')}</p>
              )}
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={handleRefresh} disabled={savePrediction.isPending}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${savePrediction.isPending ? 'animate-spin' : ''}`} />
            Recalculate
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!hasAnyData && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <p className="mb-3">Log workouts or races to generate predictions.</p>
            <Button size="sm" onClick={handleRefresh} disabled={workouts.length === 0}>
              Generate First Prediction
            </Button>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {Object.entries(displayPredictions).map(([dist, pred]) => (
            <RacePredictorCard
              key={dist}
              distance={dist}
              prediction={pred}
              previousPrediction={null}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}