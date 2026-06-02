import React from 'react';
import { APP_NAME } from '@/lib/branding';
import AppLogo from '@/components/ui/AppLogo';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { X, LogOut, HelpCircle, ChevronRight, Repeat2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import { useDrawer } from '@/lib/DrawerContext';
import { base44 } from '@/api/base44Client';
import { useRole } from '@/lib/RoleContext';
import { NAV_ITEMS } from '@/lib/roleConfig';

function DrawerLink({ path, label, icon: Icon, onClick }) {
  const location = useLocation();
  const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <Link
      to={path}
      onClick={onClick}
      className={cn(
        'group flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 active:scale-[0.98]',
        isActive
          ? 'bg-sidebar-primary/90 text-white shadow-lg shadow-sidebar-primary/20'
          : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground'
      )}
    >
      <div className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-200',
        isActive ? 'bg-white/20' : 'bg-sidebar-accent/60 group-hover:bg-sidebar-accent'
      )}>
        <Icon className="w-4 h-4" />
      </div>
      <span className="flex-1 leading-none">{label}</span>
      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white/70 shrink-0" />}
    </Link>
  );
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function MobileDrawer() {
  const { open, close } = useDrawer();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { role, canPreview, previewRole, togglePreviewRole } = useRole();
  const items = NAV_ITEMS[role] || NAV_ITEMS.athlete;

  const handleLogout = () => {
    close();
    base44.auth.logout();
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-50 transition-opacity duration-300 opacity-100"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
          onClick={close}
        />
      )}

      {/* Drawer panel */}
      <div
        className={cn(
          'lg:hidden fixed left-0 top-0 h-full z-[60] bg-sidebar flex flex-col',
          'shadow-[4px_0_40px_rgba(0,0,0,0.4)]',
        )}
        style={{
          width: 'min(82vw, 310px)',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 320ms cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        {/* Branding header */}
        <div
          className="flex items-center justify-between px-5 shrink-0 border-b border-sidebar-border/60"
          style={{ paddingTop: 'env(safe-area-inset-top)', minHeight: '4rem' }}
        >
          <div className="flex items-center gap-3">
            <AppLogo className="w-8 h-8" rounded="rounded-xl" />
            <div>
              <span className="font-bold text-[15px] text-sidebar-foreground tracking-tight block leading-tight">{APP_NAME}</span>
              <span className="text-[10px] text-sidebar-foreground/40 uppercase tracking-widest capitalize">{user?.role === 'admin' ? 'admin' : (user?.user_type || role || 'athlete')} mode</span>
            </div>
          </div>
          <button
            onClick={close}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-150"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

          {/* User card */}
          {user && (
            <Link
              to="/profile"
              onClick={close}
              className="group flex items-center gap-3.5 mx-0 mt-4 mb-1 px-3 py-3.5 rounded-2xl bg-sidebar-accent/40 hover:bg-sidebar-accent transition-all duration-200 active:scale-[0.98]"
            >
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-sidebar-primary/60 to-sidebar-primary flex items-center justify-center shrink-0 text-white font-bold text-sm shadow-md">
                {getInitials(user.full_name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-sidebar-foreground truncate leading-tight">
                  {user.full_name || 'User'}
                </p>
                <p className="text-xs text-sidebar-foreground/45 truncate mt-0.5">{user.email}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-sidebar-foreground/30 group-hover:text-sidebar-foreground/60 transition-colors shrink-0" />
            </Link>
          )}

          {/* Role switch button — admin only */}
          {canPreview && (
            <button
              onClick={() => { togglePreviewRole(navigate); close(); }}
              className="w-full flex items-center gap-3 px-3 py-3 mt-3 rounded-xl text-sm font-semibold bg-sidebar-primary/20 hover:bg-sidebar-primary/30 text-sidebar-primary transition-all duration-150"
            >
              <div className="w-8 h-8 rounded-lg bg-sidebar-primary/20 flex items-center justify-center shrink-0">
                <Repeat2 className="w-4 h-4" />
              </div>
              Switch to {previewRole === 'athlete' ? 'Coach' : 'Athlete'}
            </button>
          )}

          {/* Nav items for current role */}
          <div className="flex items-center gap-2 px-3 pt-5 pb-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/30">
              Navigation
            </span>
            <div className="flex-1 h-px bg-sidebar-border/50" />
          </div>
          <div className="space-y-0.5">
            {items.map(item => (
              <DrawerLink key={item.path} {...item} onClick={close} />
            ))}
          </div>

          <div className="h-4" />
        </div>

        {/* Footer */}
        <div
          className="px-3 pt-2 border-t border-sidebar-border/60 shrink-0"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
        >
          <a
            href="mailto:support@top7.app"
            onClick={close}
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-sidebar-foreground/55 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-150"
          >
            <div className="w-8 h-8 rounded-lg bg-sidebar-accent/60 flex items-center justify-center shrink-0">
              <HelpCircle className="w-4 h-4" />
            </div>
            Help & Support
          </a>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-all duration-150"
          >
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
              <LogOut className="w-4 h-4" />
            </div>
            Log Out
          </button>
        </div>
      </div>
    </>
  );
}