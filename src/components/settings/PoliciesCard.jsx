import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const POLICIES = [
  {
    id: 'privacy',
    title: 'Privacy Policy',
    lastUpdated: 'April 2025',
    content: `This Privacy Policy describes how Top7 ("we", "us", or "our") collects, uses, and shares information about you when you use our mobile and web application ("App").

**Information We Collect**
• Account information: name, email address, and role (athlete or coach).
• Workout and activity data: distances, pace, heart rate, cadence, elevation, splits, and related training metrics.
• Device integration data: when you connect a Garmin device, we receive activity data pushed via the Garmin Health API, including GPS coordinates, biometric sensor readings, and activity summaries.
• Usage data: how you interact with the App, pages visited, and features used.

**How We Use Your Information**
• To provide and operate the App, including syncing Garmin activity data.
• To enable coach-athlete communication and training plan assignment.
• To generate performance analytics and race predictions.
• To improve the App through aggregated, anonymized usage analysis.
• We do not sell your personal information to third parties.

**Garmin Data**
We access Garmin Connect data solely to display and analyze your activity data within the App. Data obtained through the Garmin Health API is used only for the purposes disclosed to you and is not shared with advertisers or sold to third parties. You may disconnect your Garmin account at any time from the Garmin Connect page within the App.

**Data Retention**
We retain your data for as long as your account is active. You may request deletion of your account and all associated data at any time from Account Settings.

**Your Rights**
You have the right to access, correct, or delete your personal data. Contact us at privacy@top7.app for any privacy-related requests.

**Contact**
privacy@top7.app`,
  },
  {
    id: 'terms',
    title: 'Terms of Service',
    lastUpdated: 'April 2025',
    content: `By using Top7, you agree to the following terms.

**Eligibility**
You must be at least 13 years old to use the App. If you are under 18, you should have parental or guardian consent.

**Your Account**
You are responsible for maintaining the security of your account credentials. You agree to provide accurate information and keep it up to date.

**Acceptable Use**
You agree not to misuse the App, including attempting to access other users' data, reverse-engineer the platform, or upload harmful content.

**Garmin Integration**
When you connect your Garmin account, you authorize us to receive activity data on your behalf via the Garmin Health API. You can revoke this authorization at any time. We comply with Garmin's API Terms of Service and use your data only as described in our Privacy Policy.

**Intellectual Property**
All App content, design, and code are owned by Top7. Your personal workout data remains yours.

**Disclaimer**
The App provides fitness tracking and coaching tools for informational purposes. It is not a substitute for professional medical advice. Consult a physician before starting any exercise program.

**Changes**
We may update these terms from time to time. Continued use of the App constitutes acceptance of updated terms.

**Contact**
legal@top7.app`,
  },
  {
    id: 'garmin',
    title: 'Garmin API Compliance Policy',
    lastUpdated: 'April 2025',
    content: `Top7 integrates with the Garmin Health API. This policy describes how we comply with Garmin's developer requirements.

**Data Use**
We access only the Garmin data scopes necessary to operate the App: activity summaries, heart rate, GPS/distance data, and workout delivery. We do not request scopes beyond what is required.

**Data Storage**
Garmin activity data is stored securely and associated only with the authenticated user who authorized the connection. Data is not shared with third parties, sold, or used for advertising.

**User Control**
Users can disconnect their Garmin account at any time from the Garmin Connect page. Upon disconnection, we stop receiving new data. Users may request deletion of previously synced data via Account Settings.

**Security**
All data is transmitted over HTTPS. Garmin OAuth tokens are stored securely server-side and never exposed to the client. Webhook payloads are validated using Garmin's HMAC signature verification.

**No Reverse Engineering**
We do not attempt to reverse-engineer, scrape, or access Garmin systems outside of the documented Garmin Health API.

**Compliance Updates**
We monitor Garmin developer policy updates and update our practices accordingly. Last reviewed: April 2025.

**Contact**
For Garmin-related data requests: privacy@top7.app`,
  },
  {
    id: 'data-deletion',
    title: 'Data Deletion Policy',
    lastUpdated: 'April 2025',
    content: `**Requesting Deletion**
You may delete your account and all associated data at any time by going to Account Settings → Delete Account. This action is permanent and cannot be undone.

**What Gets Deleted**
Upon account deletion, we remove:
• Your profile and authentication credentials
• All workout logs and planned workouts
• All activity data including Garmin-synced activities
• Training plans, goals, and race targets
• Coach-athlete relationships and team memberships
• All messages and comments

**Garmin Data Deletion**
We will also cease all data collection from your Garmin account. If you wish to revoke Garmin's authorization entirely, you should also disconnect Top7 from your Garmin Connect account at connect.garmin.com.

**Retention Period**
Deletion requests are processed within 30 days. Some anonymized, aggregated data (not linked to you personally) may be retained for service improvement.

**Contact**
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
          <FileText className="w-4 h-4 text-primary" /> Policies
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground mb-3">
          Review our privacy, terms, and compliance policies — including Garmin API requirements.
        </p>
        {POLICIES.map(p => (
          <PolicySection key={p.id} policy={p} />
        ))}
      </CardContent>
    </Card>
  );
}