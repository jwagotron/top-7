import React from 'react';
import LegalPageLayout from '@/components/legal/LegalPageLayout';

export default function Terms() {
  return (
    <LegalPageLayout title="Terms of Service" lastUpdated="June 2026">
      <p>
        These Terms of Service ("Terms") govern your use of the Top 7 mobile and web
        application ("App") provided by Top 7 ("we", "us", or "our"). By creating an account
        or using the App, you agree to these Terms.
      </p>

      <h2>Eligibility</h2>
      <p>
        You must be at least 13 years old to use the App. If you are under 18, you must have
        the consent of a parent or legal guardian. Coaches and administrators are responsible
        for ensuring their athletes meet these requirements.
      </p>

      <h2>Accounts</h2>
      <p>
        You are responsible for maintaining the security of your account credentials and for
        all activity that occurs under your account. You agree to provide accurate information
        when registering and to keep it up to date.
      </p>

      <h2>Acceptable Use</h2>
      <ul>
        <li>Use the App only for lawful training, coaching, and athletic purposes.</li>
        <li>Do not harass, abuse, or harm other users, including athletes or coaches in your teams.</li>
        <li>Do not attempt to access data or accounts that do not belong to you.</li>
        <li>Do not reverse engineer, decompile, or disrupt the App's infrastructure.</li>
        <li>Do not upload content that is illegal, infringing, or harmful.</li>
      </ul>

      <h2>Coach-Athlete Relationships</h2>
      <p>
        The App facilitates communication between coaches and athletes. Coaches are responsible
        for the training plans and workouts they assign. Athletes participate voluntarily and
        should consult a medical professional before beginning any training program. We are not
        liable for training outcomes or injuries.
      </p>

      <h2>Device Integrations</h2>
      <p>
        The App may connect to third-party devices and services. You are responsible for
        reviewing the privacy practices and terms of those providers. We are not responsible
        for the accuracy or availability of third-party data.
      </p>

      <h2>Intellectual Property</h2>
      <p>
        The App, including its design, features, and branding, is the property of Top 7 and is
        protected by intellectual property laws. Your training data remains yours; you grant us
        a license to process it as needed to provide the service.
      </p>

      <h2>Termination</h2>
      <p>
        You may delete your account at any time from Account Settings. We may suspend or
        terminate your account if you violate these Terms or if we believe your activity poses
        a risk to the App or other users.
      </p>

      <h2>Disclaimers</h2>
      <p>
        The App is provided "as is" without warranties of any kind. We do not guarantee that
        the App will be error-free, secure, or available at all times. Race predictions and
        analytics are estimates and should not be relied upon as medical or professional advice.
      </p>

      <h2>Limitation of Liability</h2>
      <p>
        To the fullest extent permitted by law, Top 7 shall not be liable for any indirect,
        incidental, or consequential damages arising from your use of the App, including
        training-related injuries or data loss.
      </p>

      <h2>Changes to These Terms</h2>
      <p>
        We may update these Terms from time to time. We will notify you of significant changes
        by posting the updated Terms in the App and updating the "Last updated" date. Continued
        use of the App after changes constitutes acceptance of the new Terms.
      </p>

      <h2>Contact</h2>
      <p>
        For questions about these Terms, contact us at{' '}
        <a href="mailto:dan@stratagemims.com">dan@stratagemims.com</a>.
      </p>
    </LegalPageLayout>
  );
}