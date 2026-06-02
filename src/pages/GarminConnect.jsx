import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import TopBar from '@/components/layout/TopBar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { Upload, Clock, Activity } from 'lucide-react';
import FitImportDialog from '@/components/workouts/FitImportDialog';

const steps = [
  { icon: '1', title: 'Connect your device', desc: 'Link your Garmin watch to automatically import activities into your training log.' },
  { icon: '2', title: 'Auto-sync workouts', desc: 'Your completed activities sync seamlessly to track your progress toward goals.' },
  { icon: '3', title: 'Stay on plan', desc: 'Coach-assigned workouts appear on your watch for structured guidance.' },
];

export default function GarminConnect() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showImport, setShowImport] = useState(false);

  const handleImport = (data) => {
    base44.entities.Workout.create({ ...data }).then(() => qc.invalidateQueries({ queryKey: ['workouts'] }));
    setShowImport(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <FitImportDialog open={showImport} onClose={() => setShowImport(false)} onImport={handleImport} />
      <TopBar title="Device Sync">
        <Button size="sm" variant="outline" onClick={() => setShowImport(true)} className="gap-1.5">
          <Upload className="w-4 h-4" /> Import File
        </Button>
      </TopBar>
      <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-6">

        {/* Coming soon card */}
        <Card className="border-2 border-muted">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-muted">
                <Clock className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-lg">Garmin Auto-Sync</h2>
                  <Badge variant="outline" className="text-xs border-accent/40 text-accent">Coming Soon</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">Automatic Garmin device sync is in development. In the meantime, import your workouts manually below.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How it works */}
        <Card>
            <CardHeader><CardTitle className="text-base">How it works</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {steps.map(s => (
                <div key={s.icon} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center shrink-0">{s.icon}</div>
                  <div>
                    <p className="font-medium text-sm">{s.title}</p>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                </div>
              ))}
              <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground border border-border">
                <strong>Note:</strong> Direct device sync is coming soon. In the meantime, you can manually import <strong>.fit</strong> or <strong>.gpx</strong> files exported from Garmin Connect or Apple Health using the <em>Import File</em> button above.
              </div>
            </CardContent>
          </Card>


      </div>
    </div>
  );
}