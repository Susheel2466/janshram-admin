import { useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from './ui/alert-dialog';

/**
 * Confirmation for a destructive admin action.
 *
 * The backend refuses deletes that would destroy financial or dispute history
 * (a paid booking, a user with reviews, …) and answers with an explanatory 409.
 * That message is the useful part, so it is surfaced verbatim rather than being
 * flattened into a generic "could not delete".
 */
export function ConfirmDelete<T>({
  target,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmLabel = 'Delete',
  successMessage,
}: {
  target: T | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (target: T) => Promise<unknown>;
  title: (target: T) => string;
  description: (target: T) => string;
  confirmLabel?: string;
  successMessage?: (target: T) => string;
}) {
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await onConfirm(target);
      toast.success(successMessage ? successMessage(target) : 'Deleted');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not complete that action');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={!!target} onOpenChange={(o) => !o && onOpenChange(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{target ? title(target) : ''}</AlertDialogTitle>
          <AlertDialogDescription>{target ? description(target) : ''}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); run(); }}
            disabled={busy}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {busy ? 'Working…' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
