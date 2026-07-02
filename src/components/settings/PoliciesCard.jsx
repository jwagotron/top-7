import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, ExternalLink, Trash2 } from 'lucide-react';

export default function PoliciesCard() {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" /> Legal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground mb-3">
          Review our policies and data deletion rights.
        </p>
        <button
          onClick={() => navigate('/privacy')}
          className="w-full flex items-center justify-between px-4 py-3 text-left rounded-lg border border-border hover:bg-muted/40 transition-colors"
        >
          <span className="text-sm font-medium">Privacy Policy</span>
          <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>
        <button
          onClick={() => navigate('/terms')}
          className="w-full flex items-center justify-between px-4 py-3 text-left rounded-lg border border-border hover:bg-muted/40 transition-colors"
        >
          <span className="text-sm font-medium">Terms of Service</span>
          <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>
        <button
          onClick={() => navigate('/settings')}
          className="w-full flex items-center justify-between px-4 py-3 text-left rounded-lg border border-border hover:bg-muted/40 transition-colors"
        >
          <span className="text-sm font-medium">Account & Data Deletion</span>
          <Trash2 className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>
      </CardContent>
    </Card>
  );
}