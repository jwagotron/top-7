import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import TopBar from '@/components/layout/TopBar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { User, Shield, Wifi, LogOut, Ruler } from 'lucide-react';
import { useUnits } from '@/hooks/useUnits';

export default function AccountSettings() {
  const { user } = useAuth();
  const { units, setUnits } = useUnits();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
  });

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe(form);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Account Settings" />
      <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-5">

        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4" /> Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                {(user?.full_name || user?.email || '?')[0].toUpperCase()}
              </div>
              <div>
                <p className="font-semibold">{user?.full_name || 'No name set'}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <div>
              <Label>Display Name</Label>
              <Input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Your name" />
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        {/* Role */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4" /> Role & Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Current Role</p>
                <p className="text-xs text-muted-foreground">Your role controls what features you can access.</p>
              </div>
              <Badge className="capitalize">{user?.role || 'user'}</Badge>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
              <strong>Athlete:</strong> View workouts, log activities, connect Garmin.<br />
              <strong>Coach / Admin:</strong> Access Coach Panel, assign workouts, view all athletes.
            </div>
          </CardContent>
        </Card>

        {/* Units */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Ruler className="w-4 h-4" /> Units</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Distance & Pace</p>
                <p className="text-xs text-muted-foreground">Choose how distances are displayed throughout the app.</p>
              </div>
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => setUnits('km')}
                  className={`px-4 py-1.5 text-sm font-medium transition-colors ${units === 'km' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
                >
                  km
                </button>
                <button
                  onClick={() => setUnits('mi')}
                  className={`px-4 py-1.5 text-sm font-medium transition-colors ${units === 'mi' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
                >
                  mi
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Garmin quick status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Wifi className="w-4 h-4" /> Integrations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-lg">⌚</div>
                <div>
                  <p className="text-sm font-medium">Garmin Connect</p>
                  <p className="text-xs text-muted-foreground">Sync activities and push structured workouts</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => window.location.href = '/garmin'}>Manage</Button>
            </div>
          </CardContent>
        </Card>

        {/* Logout */}
        <Card>
          <CardContent className="p-4">
            <Button variant="destructive" className="w-full gap-2" onClick={() => base44.auth.logout()}>
              <LogOut className="w-4 h-4" /> Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}