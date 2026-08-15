import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, CalendarDays, CheckCircle2, Footprints, MessageSquare, ShieldCheck, Users } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';
import { APP_NAME } from '@/lib/branding';

const athleteBenefits = [
  'Know exactly what to run today',
  'Track workouts, progress, PRs, and training volume',
  'Send fast post-workout feedback to your coach',
  'Keep shoe mileage and training discipline in one place',
];

const coachBenefits = [
  'Build and assign workouts and training plans',
  'See completion, feedback, and athlete trends quickly',
  'Manage teams and athlete groups from one dashboard',
  'Catch athletes who need attention before they drift',
];

function BenefitList({ items }) {
  return (
    <ul className="space-y-3">
      {items.map(item => (
        <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
          <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <AppLogo className="w-9 h-9" rounded="rounded-xl" />
            <span className="font-bold text-lg tracking-tight">{APP_NAME}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login" className="px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
              Log in
            </Link>
            <Link to="/register" className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/90 transition-colors">
              Get started <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-14 sm:pb-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary mb-5">
              <Footprints className="w-3.5 h-3.5" /> Built for runners and coaches
            </div>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[0.98]">
              Train with purpose.<br />Coach with clarity.
            </h1>
            <p className="mt-6 text-base sm:text-xl text-muted-foreground max-w-2xl leading-relaxed">
              Top 7 puts the daily training loop in one place: the coach assigns the work, the athlete knows exactly what to do, the workout gets completed, and feedback comes straight back to the coach.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link to="/register" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-3.5 text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm">
                Create an account <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/join" className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-5 py-3.5 text-sm font-semibold hover:bg-muted/50 transition-colors">
                Have a team code? Join a team
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-12 sm:mt-16">
            {[
              { icon: CalendarDays, label: 'Daily training plan' },
              { icon: BarChart3, label: 'Performance analytics' },
              { icon: MessageSquare, label: 'Coach feedback loop' },
              { icon: ShieldCheck, label: 'Team accountability' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
                <Icon className="w-5 h-5 text-primary mb-3" />
                <p className="text-sm font-semibold leading-snug">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-border/60 bg-muted/20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 grid lg:grid-cols-2 gap-6">
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                <Footprints className="w-5 h-5 text-primary" />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">For athletes</p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-5">Open the app. Know the workout. Go run.</h2>
              <BenefitList items={athleteBenefits} />
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">For coaches</p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-5">Program the team without losing the athlete.</h2>
              <BenefitList items={coachBenefits} />
            </div>
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Less app friction. More consistent training.</h2>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
            Top 7 is designed around the work that matters every day, not a maze of features athletes and coaches never use.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row justify-center gap-3">
            <Link to="/register" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-3.5 text-sm font-bold hover:bg-primary/90 transition-colors">
              Start using Top 7 <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/login" className="inline-flex items-center justify-center rounded-xl border border-border px-5 py-3.5 text-sm font-semibold hover:bg-muted/50 transition-colors">
              Log in
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} {APP_NAME}</span>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
