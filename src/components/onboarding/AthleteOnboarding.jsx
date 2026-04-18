import React from 'react';
import { motion } from 'framer-motion';
import { Dumbbell, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function AthleteOnboarding() {
  const { refetchUser } = useAuth();

  const handleDone = async () => {
    await refetchUser();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6"
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center"
      >
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Dumbbell className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-2">You're all set!</h1>
        <p className="text-muted-foreground mb-6 text-sm">
          Your athlete profile is ready. You can join a team from the Settings page, or dive straight into tracking your runs.
        </p>
        <ul className="text-left space-y-2 mb-8">
          {[
            'Track your runs and activities',
            'Follow assigned training plans',
            'View personal analytics and progress',
            'Set and track your goals',
            'Connect Garmin for auto-sync',
          ].map(item => (
            <li key={item} className="flex items-center gap-2 text-sm text-foreground">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
              {item}
            </li>
          ))}
        </ul>
        <button
          onClick={handleDone}
          className="w-full py-3.5 rounded-xl font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
        >
          Go to My Dashboard
        </button>
      </motion.div>
    </motion.div>
  );
}