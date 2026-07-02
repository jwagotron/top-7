import React from 'react';
import { LOGO_URL, APP_NAME } from '@/lib/branding';
import { Shield } from 'lucide-react';

/**
 * SaaS-style public layout for legal pages (Privacy, Terms).
 * White background, centered logo, professional typography, mobile responsive.
 * No auth required — rendered outside ProtectedRoute.
 */
export default function LegalPageLayout({ title, lastUpdated, children }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-5 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <img
              src={LOGO_URL}
              alt={APP_NAME}
              className="w-9 h-9 rounded-xl object-cover"
            />
            <span className="text-lg font-bold tracking-tight text-slate-900">{APP_NAME}</span>
          </a>
          <a
            href="/"
            className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
            Back to app
          </a>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-10 sm:py-16">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-slate-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Legal</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-3">{title}</h1>
          <p className="text-sm text-slate-400 mb-10">Last updated: {lastUpdated}</p>

          <div className="prose prose-slate max-w-none
            prose-headings:text-slate-900 prose-headings:font-semibold
            prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-3
            prose-p:text-slate-600 prose-p:leading-relaxed prose-p:mb-4
            prose-li:text-slate-600 prose-li:leading-relaxed prose-li:mb-1
            prose-a:text-blue-600 prose-a:font-medium prose-a:no-underline hover:prose-a:underline
            prose-strong:text-slate-900 prose-strong:font-semibold">
            {children}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <img
                src={LOGO_URL}
                alt={APP_NAME}
                className="w-6 h-6 rounded-md object-cover"
              />
              <span className="text-sm font-semibold text-slate-700">{APP_NAME}</span>
            </div>
            <div className="flex items-center gap-5 text-sm">
              <a href="/privacy" className="text-slate-500 hover:text-slate-900 transition-colors">Privacy</a>
              <a href="/terms" className="text-slate-500 hover:text-slate-900 transition-colors">Terms</a>
              <a href="/delete-account" className="text-slate-500 hover:text-slate-900 transition-colors">Account Deletion</a>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-4">Last updated: {lastUpdated}</p>
        </div>
      </footer>
    </div>
  );
}