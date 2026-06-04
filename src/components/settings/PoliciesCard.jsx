import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';

const POLICIES = [
  {
    id: 'privacy',
    title: 'Privacy Policy',
    lastUpdated: 'April 2025',
    content: `This Privacy Policy describes how Top 7 ("we", "us", or "our") collects, uses, and shares information about you when you use our mobile and web application ("App").

Information We Collect
• Account information: name and email address.
• Training data: workouts, distances, pace, duration, and related metrics you log in the App.
• Coach-athlete data: training plans, planned workouts, feedback, and messages exchanged between coaches and athletes.
• Usage data: how you interact with the App.

How We Use Your Information
• To provide and operate the App.
• To enable coach-athlete communication and training plan assignment.
• To generate performance analytics.
• To improve the App through anonymized, aggregated usage analysis.
• We do not sell your personal information to third parties.

Data Retention
We retain your data for as long as your account is active. You may request deletion of your account and all associated data at any time from Account Settings.

Your Rights
You have the right to access, correct, or delete your personal data. Contact us at privacy@top7.app for any privacy-related requests.

Contact
privacy@top7.app`,
  },
  {
    id: 'data-deletion',
    title: 'Account & Data Deletion Policy',
    lastUpdated: 'April 2025',
    content: `Requesting Deletion
You may delete your account and all associated data at any time by going to Account Settings → Delete Account. This action is permanent and cannot be undone.

What Gets Deleted
Upon account deletion, we remove:
• Your profile and authentication credentials
• All workout logs and planned workouts
• Training plans, goals, and race targets
• Coach-athlete relationships and team memberships
• All messages and comments

Retention Period
Deletion requests are processed within 30 days. Some anonymized, aggregated data (not linked to you personally) may be retained for service improvement.

Contact
To submit a manual deletion request: privacy@top7.app`,
  },
];

function PolicySection({ policy }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/40 transition-colors"
      >
        <div>
          <p className="text-sm font-medium">{policy.title}</p>
          <p className="text-xs text-muted-foreground">Last updated: {policy.lastUpdated}</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border bg-muted/20">
          <div className="mt-3 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {policy.content}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PoliciesCard() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" /> Legal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground mb-3">
          Review our privacy policy and data deletion rights.
        </p>
        {POLICIES.map(p => (
          <PolicySection key={p.id} policy={p} />
        ))}
      </CardContent>
    </Card>
  );
}