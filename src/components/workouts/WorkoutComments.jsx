import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronUp, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function WorkoutComments({ workoutId, role = 'athlete' }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [commentText, setCommentText] = useState('');

  // Fetch comments
  const { data: comments = [] } = useQuery({
    queryKey: ['workout-comments', workoutId],
    queryFn: () => base44.entities.WorkoutComment.filter({ workout_id: workoutId }),
    enabled: !!workoutId,
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!workoutId) return;
    const unsubscribe = base44.entities.WorkoutComment.subscribe((event) => {
      if (event.data?.workout_id === workoutId) {
        queryClient.invalidateQueries({ queryKey: ['workout-comments', workoutId] });
      }
    });
    return unsubscribe;
  }, [workoutId, queryClient]);

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (content) => {
      return base44.entities.WorkoutComment.create({
        workout_id: workoutId,
        user_email: user.email,
        user_name: user.full_name || user.email,
        role: role,
        content: content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-comments', workoutId] });
      setCommentText('');
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    await addCommentMutation.mutateAsync(commentText);
  };

  return (
    <div className="border-t border-border/50 pt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full mb-2 group"
      >
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground group-hover:text-foreground transition-colors">
          Comments ({comments.length})
        </h3>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="space-y-3">
          {/* Comments list */}
          {comments.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">No comments yet</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-muted/30 rounded-lg p-2.5">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-foreground">
                        {comment.user_name}
                      </span>
                      <span className={cn(
                        'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                        comment.role === 'coach'
                          ? 'bg-primary/15 text-primary'
                          : 'bg-secondary/15 text-secondary'
                      )}>
                        {comment.role === 'coach' ? '👨‍🏫' : '🏃'}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {format(new Date(comment.created_date), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <p className="text-xs text-foreground">{comment.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* Comment input */}
          <form onSubmit={handleSubmit} className="flex gap-2 mt-3 pt-2 border-t border-border/30">
            <Input
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="text-xs h-8"
              disabled={addCommentMutation.isPending}
            />
            <Button
              type="submit"
              size="sm"
              className="h-8 w-8 p-0 shrink-0"
              disabled={!commentText.trim() || addCommentMutation.isPending}
            >
              {addCommentMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Send className="w-3 h-3" />
              )}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}