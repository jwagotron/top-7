import React, { useState } from 'react';
import { LOGO_URL, APP_NAME } from '@/lib/branding';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { setLocalRole } from '@/lib/RoleContext';
import AthleteSetup from './AthleteSetup';
import CoachOnboarding from './CoachOnboarding';

const roles = [
  {
    id: 'athlete',
    label: 'Athlete',
    icon: Dumbbell,
    description: 'Track your runs, follow training plans, and monitor your personal progress.',
    color: 'border-primary/40 hover:border-primary hover:bg-primary/5',
    activeColor: 'border-primary bg-primary/10',
    iconBg: 'bg-primary/10 text-primary',
  },
  {
    id: 'coach',
    label: 'Coach',
    icon: Users,
    description: 'Create and manage teams, assign workouts, and track all your athletes.',
    color: 'border-secondary/40 hover:border-secondary hover:bg-secondary/5',
    activeColor: 'border-secondary bg-secondary/10',
    iconBg: 'bg-secondary/10 text-secondary',
  },
];

export default function OnboardingWizard() {
  const { user, refetchUser } = useAuth();
  const [step, setStep] = useState('choose'); // 'choose' | 'athlete' | 'coach'
  const [selected, setSelected] = useState(null);

  const handleContinue = () => {
    if (!selected) return;
    setLocalRole(selected); // reactive — RoleProvider state updates via custom event
    if (!user) {
      // Unauthenticated (local dev): role state is now updated, guard will dismiss automatically
      return;
    }
    if (selected === 'coach') setStep('coach');
    else setStep('athlete');
  };

  if (step === 'athlete') return <AthleteSetup userType="athlete" />;  
  if (step === 'coach') return <CoachOnboarding userType="coach" />;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6"
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg">
            <img src={LOGO_URL} alt={APP_NAME} className="w-full h-full object-cover" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center text-foreground mb-1">Welcome! How will you use the app?</h1>
        <p className="text-sm text-muted-foreground text-center mb-8">
          This determines your experience. You won't be able to change this yourself.
        </p>

        <div className="space-y-3">
          {roles.map((r) => {
            const Icon = r.icon;
            const isSelected = selected === r.id;
            return (
              <motion.button
                key={r.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelected(r.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 text-left ${
                  isSelected ? r.activeColor + ' border-2' : `bg-card border-border ${r.color}`
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? r.iconBg : 'bg-muted text-muted-foreground'}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-base leading-tight">{r.label}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug">{r.description}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all duration-200 ${
                  isSelected ? 'border-primary bg-primary' : 'border-border'
                }`}>
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </motion.button>
            );
          })}
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleContinue}
          disabled={!selected}
          className={`w-full mt-6 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
            selected ? 'bg-primary text-primary-foreground shadow-md hover:bg-primary/90' : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}
        >
          {'Continue →'}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}