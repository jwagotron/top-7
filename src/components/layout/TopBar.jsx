import React from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDrawer } from '@/lib/DrawerContext';

export default function TopBar({ title, children }) {
  const drawer = useDrawer();

  return (
    <header
      className="border-b border-border bg-card/80 backdrop-blur-md flex items-center px-3 lg:px-6 sticky top-0 z-30 gap-2"
      style={{ paddingTop: 'env(safe-area-inset-top)', minHeight: '4rem' }}
    >
      {/* Menu icon — mobile only, fixed width */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden shrink-0 -ml-1"
        onClick={drawer?.toggle}
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Title — takes remaining space, never shrinks below readable size */}
      <h1 className="flex-1 min-w-0 text-lg lg:text-xl font-bold tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
        {title}
      </h1>

      {/* Right-side actions — allowed to shrink, but never crush the title */}
      {children && (
        <div className="flex items-center gap-1.5 shrink-0 max-w-[55%] sm:max-w-none">
          {children}
        </div>
      )}
    </header>
  );
}