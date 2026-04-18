import React from 'react';
import { Users } from 'lucide-react';

export default function SimpleAthleteRoster({ athletes }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-muted-foreground" />
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Athletes ({athletes.length})</h3>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {athletes.map(athlete => (
          <div key={athlete.id} className="bg-card border border-border rounded-xl p-4">
            <p className="font-medium text-sm">{athlete.full_name || athlete.email}</p>
            <p className="text-xs text-muted-foreground mt-1">{athlete.email}</p>
            {athlete.role && (
              <p className="text-xs text-muted-foreground mt-2 capitalize">{athlete.role}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}