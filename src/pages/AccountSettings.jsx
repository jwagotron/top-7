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
import { User, Shield, Wifi, LogOut, Ruler, Trash2 } from 'lucide-react';
import AppearanceCard from '@/components/settings/AppearanceCard';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useUnits } from '@/hooks/useUnits';
import { useRole } from '@/lib/RoleContext';
import TeamsSection from '@/components/TeamsSection';

const ROLE_LABELS = { athlete: 'Athlete', coach: 'Coach', admin: 'Admin' };

export default function AccountSettings() {
  const { user } = useAuth();
  const { role, setRole } = useRole();
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
      <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-6 pb-24 lg:pb-8">

        {/* Profile */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4 shrink-0" /> Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                {(user?.full_name || user?.email || '?')[0].toUpperCase()}
              </div>
              <div>
                <p className="font-semibold">{user?.full_name || 'No name set'}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Display Name</Label>
              <Input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Your name" />
            </div>
            <Button size="lg" className="font-semibold px-8 shadow-sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        {/* Role */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4 shrink-0" /> Role & Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-1">Switch Role</p>
              <p className="text-xs text-muted-foreground mb-3">Your role controls which features and navigation items are visible.</p>
              <div className="flex rounded-xl border border-border overflow-hidden">
                {['athlete', 'coach', 'admin'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className={`flex-1 py-2.5 text-sm font-semibold capitalize transition-all duration-200 ${
                      role === r
                        ? 'bg-primary text-primary-foreground shadow-inner'
                        : 'bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {ROLE_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground space-y-1">
              <p><strong>Athlete:</strong> View workouts, log activities, connect Garmin.</p>
              <p><strong>Coach:</strong> Manage athletes, assign workouts, build plans.</p>
              <p><strong>Admin:</strong> Full access including admin panel and all tools.</p>
            </div>
          </CardContent>
        </Card>

        {/* Units */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Ruler className="w-4 h-4 shrink-0" /> Units</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
              <div>
                <p className="text-sm font-medium">Distance & Pace</p>
                <p className="text-xs text-muted-foreground">Choose how distances are displayed throughout the app.</p>
              </div>
              <div className="flex rounded-lg border border-border overflow-hidden w-full sm:w-auto">
                <button
                  onClick={() => setUnits('km')}
                  className={`flex-1 sm:flex-none px-6 py-2 text-sm font-medium transition-colors ${units === 'km' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
                >
                  km
                </button>
                <button
                  onClick={() => setUnits('mi')}
                  className={`flex-1 sm:flex-none px-6 py-2 text-sm font-medium transition-colors ${units === 'mi' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
                >
                  mi
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team */}
        <TeamsSection />

        {/* Appearance */}
        <AppearanceCard />

        {/* Garmin quick status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Wifi className="w-4 h-4 shrink-0" /> Integrations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-lg shrink-0">⌚</div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">Garmin Connect</p>
                  <p className="text-xs text-muted-foreground leading-tight">Sync activities and push structured workouts</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="shrink-0" onClick={() => window.location.href = '/garmin'}>Manage</Button>
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

        {/* Delete Account */}
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-destructive"><Trash2 className="w-4 h-4" /> Delete Account</CardTitle>
            <CardDescription>Permanently delete your account and all associated data. This cannot be undone.</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground w-full gap-2">
                  <Trash2 className="w-4 h-4" /> Delete My Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete your account, all workouts, training plans, and data. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => base44.auth.logout()}
                  >
                    Yes, delete my account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}