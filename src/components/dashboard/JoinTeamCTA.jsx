import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, ArrowRight } from 'lucide-react';
import JoinTeamModal from '@/components/JoinTeamModal';

export default function JoinTeamCTA({ onSuccess }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Join a Team</h3>
              <p className="text-sm text-muted-foreground">Get personalized workouts from your coach</p>
            </div>
          </div>
          <Button
            onClick={() => setShowModal(true)}
            className="gap-2 shrink-0"
          >
            Join Now
            <ArrowRight className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>

      <JoinTeamModal
        open={showModal}
        onOpenChange={setShowModal}
        onSuccess={onSuccess}
      />
    </>
  );
}