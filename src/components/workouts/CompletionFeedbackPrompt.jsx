import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

export default function CompletionFeedbackPrompt({ open, onClose, onSubmit, isLoading = false }) {
  const [feedback, setFeedback] = useState('');

  const handleSubmit = async () => {
    await onSubmit(feedback);
    setFeedback('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Great work! 🎉</DialogTitle>
          <DialogDescription>How did this workout feel?</DialogDescription>
        </DialogHeader>

        <Textarea
          placeholder="Add optional feedback for your coach..."
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className="min-h-20"
        />

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Skip
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Send'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}