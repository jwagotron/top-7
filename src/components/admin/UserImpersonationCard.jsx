import React from 'react';
import { useUserImpersonation } from '@/lib/UserImpersonationContext';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut } from 'lucide-react';

export default function UserImpersonationCard({ user }) {
  const { impersonatedUser, setImpersonate } = useUserImpersonation();
  const isImpersonated = impersonatedUser?.email === user.email;

  return (
    <Button
      size="sm"
      variant={isImpersonated ? 'default' : 'outline'}
      onClick={() => setImpersonate(isImpersonated ? null : user)}
      className="gap-2"
    >
      {isImpersonated ? (
        <>
          <LogOut className="w-3.5 h-3.5" />
          Stop Impersonating
        </>
      ) : (
        <>
          <LogIn className="w-3.5 h-3.5" />
          Impersonate
        </>
      )}
    </Button>
  );
}