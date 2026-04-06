import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRole } from '@/lib/RoleContext';
import { Dumbbell, Users, ShieldCheck } from 'lucide-react';

const roles = [
  {
    id: 'athlete',
    label: 'Athlete',
    icon: Dumbbell,
    description: 'Track workouts, follow training plans, and monitor your progress.',
    color: 'text-primary border-primary/30 hover:border-primary hover:bg-primary/5',
    activeColor: 'border-primary bg-primary/10 text-primary',
    iconBg: 'bg-primary/10 text-primary',
  },
  {
    id: 'coach',
    label: 'Coach',
    icon: Users,
    description: 'Manage athletes, assign workouts, and build training plans.',
    color: 'text-secondary border-secondary/30 hover:border-secondary hover:bg-secondary/5',
    activeColor: 'border-secondary bg-secondary/10 text-secondary',
    iconBg: 'bg-secondary/10 text-secondary',
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: ShieldCheck,
    description: 'Full access to all features including admin panel and user management.',
    color: 'text-accent border-accent/30 hover:border-accent hover:bg-accent/5',
    activeColor: 'border-accent bg-accent/10 text-accent',
    iconBg: 'bg-accent/10 text-accent',
  },
];

export default function RoleSelectionScreen() {
  const { setRole } = useRole();
  const [selected, setSelected] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = () => {
    if (!selected) return;
    setConfirming(true);
    setTimeout(() => setRole(selected), 300);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg">
            <img
              src="https://media.base44.com/images/public/69c32a03dfe10b4cd6245abe/cbf2fa9c6_image.png"
              alt="Top 7"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center text-foreground mb-1">
          How will you use this app?
        </h1>
        <p className="text-sm text-muted-foreground text-center mb-8">
          Choose your role to personalise your experience.
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
                  isSelected ? r.activeColor : `bg-card border-border text-foreground ${r.color}`
                }`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? r.iconBg : 'bg-muted'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm leading-tight">{r.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{r.description}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all duration-200 ${
                  isSelected ? 'border-current bg-current' : 'border-border'
                }`}>
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </motion.button>
            );
          })}
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleConfirm}
          disabled={!selected || confirming}
          className={`w-full mt-6 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
            selected
              ? 'bg-primary text-primary-foreground shadow-md hover:bg-primary/90'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}
        >
          {confirming ? 'Setting up…' : 'Continue'}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}