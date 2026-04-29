import { useRole } from '@/lib/RoleContext';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { DEFAULT_ROUTE } from '@/lib/roleConfig';
import { ShieldCheck } from 'lucide-react';

/**
 * RoleGate — restricts content to specific roles.
 *
 * Props:
 *   allow: string[] — roles that can see the content
 *   redirectTo: string (optional) — redirect instead of showing blocked UI
 *   fallback: ReactNode (optional) — what to show when blocked (default: access denied card)
 */
export default function RoleGate({ allow, redirectTo, fallback, children }) {
  const { role } = useRole();
  const { user } = useAuth();
  const navigate = useNavigate();
  // Admins always pass through, regardless of preview role
  const allowed = !role || allow.includes(role) || user?.role === 'admin';

  useEffect(() => {
    if (!allowed && redirectTo) {
      navigate(redirectTo, { replace: true });
    } else if (!allowed && !redirectTo && role) {
      navigate(DEFAULT_ROUTE[role] || '/', { replace: true });
    }
  }, [allowed, redirectTo, role]);

  if (!allowed) {
    if (fallback !== undefined) return fallback;
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center p-8">
          <ShieldCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-lg font-bold mb-1">Access Restricted</h2>
          <p className="text-sm text-muted-foreground">This area is not available for your role.</p>
        </div>
      </div>
    );
  }

  return children;
}