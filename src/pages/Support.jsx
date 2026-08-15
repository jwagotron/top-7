import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, Mail, ShieldCheck, UserRound, Users } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';
import { APP_NAME } from '@/lib/branding';

const supportItems = [
  {
    icon: UserRound,
    title: 'Account and sign-in help',
    body: 'Get help signing in, creating an account, verifying your email, or recovering access to Top 7.',
  },
  {
    icon: Users,
    title: 'Teams, coaches, and athletes',
    body: 'Get help joining a team, using a team code, managing athlete access, or resolving coach-athlete account issues.',
  },
  {
    icon: ShieldCheck,
    title: 'Privacy and account requests',
    body: 'Ask questions about privacy, data access, connected services, or account deletion.',
  },
];

export default function Support() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5">
            <AppLogo className="w-9 h-9" rounded="rounded-xl" />
            <span className="font-bold text-lg tracking-tight">{APP_NAME}</span>
          </Link>
          <Link to="/login" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
            Log in
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary mb-5">
              <HelpCircle className="w-3.5 h-3.5" /> Top 7 Support
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight">How can we help?</h1>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
              Top 7 is a training platform for runners and coaches. If something is keeping you from signing in, joining your team, or using your account, contact us and we will help you get moving again.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 mt-10">
            {supportItems.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-border bg-card p-5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h2 className="font-bold text-base">{title}</h2>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 mt-6">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Contact support</h2>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Email us with the email address on your Top 7 account and a short description of what you need help with.
                </p>
                <a
                  href="mailto:dan@stratagemims.com?subject=Top%207%20Support"
                  className="inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-bold hover:bg-primary/90 transition-colors mt-4"
                >
                  Email Top 7 Support
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} {APP_NAME}</span>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/support" className="hover:text-foreground">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
