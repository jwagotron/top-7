import React from 'react';
import { Menu, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDrawer } from '@/lib/DrawerContext';
import { useTheme } from '@/lib/ThemeContext';
import { useUserImpersonation } from '@/lib/UserImpersonationContext';
import { Badge } from '@/components/ui/badge';

export default function TopBar({ title, children }) {
  const drawer = useDrawer();
  const { theme, setTheme } = useTheme();
  const isDark = theme.mode === 'dark';
  const { impersonatedUser } = useUserImpersonation();

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
      <h1 className="flex-1 min-w-0 text-lg lg:text-xl font-bold tracking-tight whitespace-nowrap overflow-hidden text-ellipsis flex items-center gap-2">
        {title}
        {impersonatedUser && (
          <Badge className="text-[10px] bg-primary/20 text-primary border-primary/30 ml-2 shrink-0">
            As {impersonatedUser.name || impersonatedUser.email}
          </Badge>
        )}
      </h1>

      {/* Dark mode toggle — always visible top right */}
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0"
        onClick={() => setTheme({ mode: isDark ? 'light' : 'dark' })}
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </Button>

      {/* Right-side actions — responsive gap and sizing */}
      {children && (
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {children}
        </div>
      )}
    </header>
  );
}