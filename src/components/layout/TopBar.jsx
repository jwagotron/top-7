import React from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TopBar({ title, onMenuToggle, children }) {
  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-30"
      style={{ paddingTop: 'env(safe-area-inset-top)', minHeight: '4rem' }}
    >
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuToggle}>
          <Menu className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        {children}
      </div>
    </header>
  );
}