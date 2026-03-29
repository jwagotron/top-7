import React from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TopBar({ title, onMenuToggle, children }) {
  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-md flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30 gap-3"
      style={{ paddingTop: 'env(safe-area-inset-top)', minHeight: '4rem' }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Button variant="ghost" size="icon" className="lg:hidden shrink-0" onClick={onMenuToggle}>
          <Menu className="w-5 h-5" />
        </Button>
        <h1 className="text-lg lg:text-xl font-bold tracking-tight truncate">{title}</h1>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {children}
      </div>
    </header>
  );
}