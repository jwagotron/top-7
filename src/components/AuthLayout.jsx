import React from "react";
import { Link } from "react-router-dom";
import AppLogo from "@/components/ui/AppLogo";
import { APP_NAME } from "@/lib/branding";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background px-4 app-safe-viewport">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex flex-col items-center justify-center gap-2 mb-5 group">
            <AppLogo className="w-14 h-14 transition-transform group-hover:scale-[1.03]" rounded="rounded-2xl" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground group-hover:text-foreground transition-colors">{APP_NAME}</span>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
        )}
        <p className="text-center text-xs text-muted-foreground mt-4">
          <Link to="/privacy" className="hover:text-foreground hover:underline">Privacy Policy</Link>
          {" · "}
          <Link to="/terms" className="hover:text-foreground hover:underline">Terms of Service</Link>
          {" · "}
          <Link to="/support" className="hover:text-foreground hover:underline">Support</Link>
        </p>
      </div>
    </div>
  );
}