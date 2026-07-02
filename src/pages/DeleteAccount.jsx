import React from 'react';
import LegalPageLayout from '@/components/legal/LegalPageLayout';
import { Link } from 'react-router-dom';
import { Trash2, Mail } from 'lucide-react';

export default function DeleteAccount() {
  return (
    <LegalPageLayout title="Account & Data Deletion" lastUpdated="June 2026">
      <p>
        You may delete your Top 7 account and all associated data at any time. This action
        is permanent and cannot be undone.
      </p>

      <h2>Delete From the App</h2>
      <p>
        If you are logged in, you can delete your account directly:
      </p>
      <div className="not-prose my-4 p-4 rounded-lg border border-slate-200 bg-slate-50 flex items-start gap-3">
        <Trash2 className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-slate-700 mb-1">In-app deletion</p>
          <p className="text-sm text-slate-500">
            Go to <strong>Account Settings → Delete Account</strong> and confirm the prompt.
            Your account and all data will be scheduled for deletion.
          </p>
          <Link
            to="/settings"
            className="inline-block mt-2 text-sm font-medium text-blue-600 hover:underline"
          >
            Open Account Settings →
          </Link>
        </div>
      </div>

      <h2>Request Deletion by Email</h2>
      <p>
        If you cannot log in (e.g., forgot password, lost access), you can request manual
        deletion by emailing us. Include the email address associated with your account.
      </p>
      <div className="not-prose my-4 p-4 rounded-lg border border-slate-200 bg-slate-50 flex items-start gap-3">
        <Mail className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-slate-700 mb-1">Email request</p>
          <a
            href="mailto:dan@stratagemims.com?subject=Account%20Deletion%20Request"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            dan@stratagemims.com
          </a>
        </div>
      </div>

      <h2>What Gets Deleted</h2>
      <ul>
        <li>Your profile and authentication credentials</li>
        <li>All workout logs, activities, and planned workouts</li>
        <li>Training plans, goals, and race targets</li>
        <li>Coach-athlete relationships and team memberships</li>
        <li>All messages, comments, and feedback</li>
        <li>Personal records and benchmark data</li>
        <li>Device connections (Garmin, etc.) and synced activities</li>
      </ul>

      <h2>Retention Period</h2>
      <p>
        Deletion requests are processed within 30 days. Some anonymized, aggregated data
        (not linked to you personally) may be retained for service improvement and analytics.
      </p>

      <h2>Garmin & Third-Party Data</h2>
      <p>
        Disconnecting your Garmin device in Account Settings revokes our access to future
        data. Previously synced activities are deleted along with your account. To delete
        data held by Garmin itself, please contact Garmin directly.
      </p>
    </LegalPageLayout>
  );
}