import React from "react";
import { Link } from "react-router-dom";
import AppLogo from "@/components/ui/AppLogo";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center mb-4">
            <AppLogo className="w-14 h-14" rounded="rounded-2xl" />
          </div>
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
        </p>
      </div>
    </div>
  );
}