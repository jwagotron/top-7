import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, X, Check, ChevronDown, ChevronUp, LogIn, LogOut } from 'lucide-react';
import { useUserImpersonation } from '@/lib/UserImpersonationContext';

const STORAGE_KEY = 'admin_review_test_accounts';

const DEFAULT_ACCOUNTS = [
  {
    id: '1',
    username: 'testathlete@trainsync.app',
    password: 'GarminReview2025!',
    role: 'athlete',
    name: 'Alex Rivera',
    profile: 'Male, 16 y/o, HS cross country runner, ~5K PR 17:45',
  },
];

const EMPTY_ACCOUNT = {
  id: '',
  username: '',
  password: '',
  role: 'athlete',
  name: '',
  profile: '',
};

function FieldRow({ label, value }) {
  return (
    <div className="flex items-start gap-2 bg-background rounded px-3 py-1.5 border border-border text-xs font-mono">
      <span className="text-muted-foreground w-28 shrink-0">{label}</span>
      <span className="text-foreground font-semibold break-all">{value || <span className="text-muted-foreground italic">not set</span>}</span>
    </div>
  );
}

function AccountForm({ account, onSave, onCancel }) {
  const [form, setForm] = useState({ ...account });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {[
          { key: 'name', label: 'Name' },
          { key: 'username', label: 'Email / Username' },
          { key: 'password', label: 'Password' },
          { key: 'role', label: 'Role', type: 'select', options: ['athlete', 'coach', 'admin'] },
        ].map(f => (
          <div key={f.key}>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5 block">{f.label}</label>
            {f.type === 'select' ? (
              <select
                value={form[f.key]}
                onChange={e => set(f.key, e.target.value)}
                className="w-full text-xs border border-border rounded-md px-2 py-1.5 bg-background text-foreground"
              >
                {f.options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input
                value={form[f.key]}
                onChange={e => set(f.key, e.target.value)}
                className="w-full text-xs border border-border rounded-md px-2 py-1.5 bg-background text-foreground"
                placeholder={f.label}
              />
            )}
          </div>
        ))}
      </div>
      <div>
        <label className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5 block">Profile Description</label>
        <textarea
          value={form.profile}
          onChange={e => set('profile', e.target.value)}
          rows={2}
          className="w-full text-xs border border-border rounded-md px-2 py-1.5 bg-background text-foreground resize-none"
          placeholder="e.g. Male, 16 y/o, HS cross country runner, ~5K PR 17:45"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={() => onSave(form)}>
          <Check className="w-3 h-3 mr-1" /> Save
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          <X className="w-3 h-3 mr-1" /> Cancel
        </Button>
      </div>
    </div>
  );
}

function AccountCard({ account, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const { impersonatedUser, setImpersonate } = useUserImpersonation();
  const isImpersonated = impersonatedUser?.email === account.username;

  return (
    <Card className={`border-accent/40 ${isImpersonated ? 'ring-2 ring-primary border-primary' : 'bg-accent/5'}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-accent">{account.name || account.username}</span>
            <Badge className="text-[10px] bg-accent/20 text-accent border-accent/30">{account.role}</Badge>
            {isImpersonated && <Badge className="text-[10px] bg-primary/20 text-primary border-primary/30">Impersonating</Badge>}
          </div>
          <div className="flex items-center gap-1">
            <Button 
              size="icon" 
              variant={isImpersonated ? 'default' : 'outline'}
              className="h-7 w-7"
              onClick={() => setImpersonate(isImpersonated ? null : { email: account.username, role: account.role, name: account.name })}
              title={isImpersonated ? 'Stop impersonating' : 'Impersonate this user'}
            >
              {isImpersonated ? <LogOut className="w-3.5 h-3.5" /> : <LogIn className="w-3.5 h-3.5" />}
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setExpanded(e => !e)}>
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <FieldRow label="Email" value={account.username} />
          <FieldRow label="Password" value={account.password} />
          <FieldRow label="Name" value={account.name} />
          {expanded && <FieldRow label="Role" value={account.role} />}
          {expanded && <FieldRow label="Profile" value={account.profile} />}
        </div>

        {!expanded && (
          <button onClick={() => setExpanded(true)} className="text-[10px] text-muted-foreground hover:text-foreground mt-2 block">
            Show full details…
          </button>
        )}
      </CardContent>
    </Card>
  );
}

export default function ReviewTestAccounts() {
  const [accounts, setAccounts] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_ACCOUNTS;
    } catch {
      return DEFAULT_ACCOUNTS;
    }
  });
  const [editing, setEditing] = useState(null); // id or 'new'
  const [editData, setEditData] = useState(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  }, [accounts]);

  const startNew = () => {
    setEditData({ ...EMPTY_ACCOUNT, id: Date.now().toString() });
    setEditing('new');
  };

  const startEdit = (acc) => {
    setEditData({ ...acc });
    setEditing(acc.id);
  };

  const handleSave = (form) => {
    if (editing === 'new') {
      setAccounts(a => [...a, form]);
    } else {
      setAccounts(a => a.map(x => x.id === form.id ? form : x));
    }
    setEditing(null);
    setEditData(null);
  };

  const handleDelete = (id) => {
    setAccounts(a => a.filter(x => x.id !== id));
  };

  const handleCancel = () => {
    setEditing(null);
    setEditData(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-accent">🧪 Review Test Accounts</p>
          <p className="text-xs text-muted-foreground">Create separate athlete and coach profiles for review testing.</p>
        </div>
        <Button size="sm" onClick={startNew} className="shrink-0">
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Account
        </Button>
      </div>

      {/* New account form */}
      {editing === 'new' && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <p className="text-xs font-bold text-primary mb-3">New Test Account</p>
            <AccountForm account={editData} onSave={handleSave} onCancel={handleCancel} />
          </CardContent>
        </Card>
      )}

      {accounts.map(acc => (
        editing === acc.id ? (
          <Card key={acc.id} className="border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <p className="text-xs font-bold text-primary mb-3">Edit Test Account</p>
              <AccountForm account={editData} onSave={handleSave} onCancel={handleCancel} />
            </CardContent>
          </Card>
        ) : (
          <AccountCard
            key={acc.id}
            account={acc}
            onEdit={() => startEdit(acc)}
            onDelete={() => handleDelete(acc.id)}
          />
        )
      ))}
    </div>
  );
}