import React from 'react';
import LegalPageLayout from '@/components/legal/LegalPageLayout';

export default function Privacy() {
  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated="June 2026">
      <p>
        This Privacy Policy describes how Top 7 ("we", "us", or "our") collects, uses, and
        shares information about you when you use our mobile and web application ("App").
      </p>

      <h2>Information We Collect</h2>
      <ul>
        <li><strong>Account information:</strong> name and email address.</li>
        <li><strong>Training data:</strong> workouts, distances, pace, duration, and related metrics you log in the App.</li>
        <li><strong>Coach-athlete data:</strong> training plans, planned workouts, feedback, and messages exchanged between coaches and athletes.</li>
        <li><strong>Device data:</strong> data synced from connected devices, including activities, heart rate, and sleep metrics.</li>
        <li><strong>Usage data:</strong> how you interact with the App, including features used and crash reports.</li>
      </ul>

      <h2>How We Use Your Information</h2>
      <ul>
        <li>To provide and operate the App.</li>
        <li>To enable coach-athlete communication and training plan assignment.</li>
        <li>To generate performance analytics and race predictions.</li>
        <li>To sync data from connected devices.</li>
        <li>To improve the App through anonymized, aggregated usage analysis.</li>
      </ul>
      <p>We do not sell your personal information to third parties.</p>

      <h2>Data Sharing</h2>
      <p>
        We share your data only in limited circumstances: with your coach or athletes within
        a team you have joined, with third-party providers when you connect a device, and
        when required by law. All sharing is limited to what is necessary to provide the service.
      </p>

      <h2>Data Retention</h2>
      <p>
        We retain your data for as long as your account is active. You may request deletion of
        your account and all associated data at any time from Account Settings. Some anonymized,
        aggregated data (not linked to you personally) may be retained for service improvement.
      </p>

      <h2>Your Rights</h2>
      <p>
        You have the right to access, correct, or delete your personal data. You may also
        request a copy of your data or withdraw consent for device connections at any time.
      </p>

      <h2>Security</h2>
      <p>
        We use industry-standard measures to protect your data, including encrypted transmission
        and secure storage. No method of transmission or storage is completely secure, but we
        work to protect your information using reasonable safeguards.
      </p>

      <h2>Children's Privacy</h2>
      <p>
        The App is designed for coaches and athletes, including student-athletes. If you are a
        parent or guardian and believe your child has provided us with personal information
        without consent, please contact us so we can delete it.
      </p>

      <h2>Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will notify you of significant
        changes by posting the updated policy in the App and updating the "Last updated" date.
      </p>

      <h2>Contact</h2>
      <p>
        For any privacy-related questions or requests, contact us at{' '}
        <a href="mailto:dan@stratagemims.com">dan@stratagemims.com</a>.
      </p>
    </LegalPageLayout>
  );
}