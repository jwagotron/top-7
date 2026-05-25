import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import TopBar from '@/components/layout/TopBar';
import RacePredictor from '@/components/predictor/RacePredictor';
import { Info } from 'lucide-react';

export default function RacePredictorPage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col h-full bg-background">
      <TopBar title="Race Predictor" />
      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="max-w-5xl mx-auto space-y-5 pb-24 lg:pb-8">

          {/* Explainer */}
          <div className="flex gap-3 items-start bg-primary/5 border border-primary/20 rounded-2xl px-4 py-4">
            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-foreground mb-1">How predictions are generated</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your race results, tempo runs, intervals, and long runs are weighted by recency and quality, 
                then projected across distances using the Riegel formula. Hit <strong>Recalculate</strong> any 
                time to refresh with your latest logged runs. Logging a recent race or time trial will 
                significantly improve accuracy.
              </p>
            </div>
          </div>

          <RacePredictor userEmail={user?.email} />
        </div>
      </div>
    </div>
  );
}