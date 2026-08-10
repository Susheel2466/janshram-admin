import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { EyeOff, Eye, Trash2, Pencil } from 'lucide-react';
import { adminApi } from '../lib/api';
import { useApi } from '../lib/useApi';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { SearchInput, UserCell, fmtDate } from '../components/common';
import { FilterSelect } from '../components/FilterSelect';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { FilterSelect as RatingSelect } from '../components/FilterSelect';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import type { Review } from '../lib/types';

function RatingStars({ n }: { n: number }) {
  return (
    <span className="text-amber-500 text-sm whitespace-nowrap" title={`${n} / 5`}>
      {'★'.repeat(n)}
      <span className="text-muted-foreground/30">{'★'.repeat(5 - n)}</span>
    </span>
  );
}

export function Reviews() {
  const [q, setQ] = useState('');
  const [flagged, setFlagged] = useState('all');
  const [rating, setRating] = useState('all');
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState<Review | null>(null);
  const [editing, setEditing] = useState<Review | null>(null);
  const [editRating, setEditRating] = useState('5');
  const [editComment, setEditComment] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Drill-down from a provider's detail page: /reviews?providerId=…
  const [search, setSearch] = useSearchParams();
  const providerId = search.get('providerId') ?? undefined;

  const { data, loading, refetch } = useApi(
    () =>
      adminApi.reviews.list({
        q,
        providerId,
        flagged: flagged === 'all' ? undefined : flagged,
        rating: rating === 'all' ? undefined : rating,
        page,
      }),
    [q, providerId, flagged, rating, page],
  );

  const providerName = data?.data[0]?.provider?.user?.name;

  const toggleHide = async (r: Review) => {
    await adminApi.reviews.setHidden(r.id, !r.hidden);
    toast.success(r.hidden ? 'Review restored' : 'Review hidden');
    refetch();
  };
  const remove = async () => {
    if (!toDelete) return;
    await adminApi.reviews.remove(toDelete.id);
    toast.success('Review deleted');
    setToDelete(null);
    refetch();
  };

  const openEdit = (r: Review) => {
    setEditing(r);
    setEditRating(String(r.rating));
    setEditComment(r.comment ?? '');
    setSavingEdit(false);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSavingEdit(true);
    try {
      await adminApi.reviews.update(editing.id, {
        rating: Number(editRating),
        comment: editComment.trim() || null,
      });
      toast.success('Review updated');
      setEditing(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update review');
    } finally {
      setSavingEdit(false);
    }
  };

  const columns: Column<Review>[] = [
    { key: 'author', header: 'Author', cell: (r) => <UserCell name={r.author?.name} avatar={r.author?.avatar} /> },
    { key: 'rating', header: 'Rating', cell: (r) => <RatingStars n={r.rating} /> },
    {
      key: 'comment',
      header: 'Comment',
      className: 'max-w-sm',
      cell: (r) => <p className="text-sm truncate">{r.comment ?? <span className="text-muted-foreground">No comment</span>}</p>,
    },
    { key: 'provider', header: 'Provider', cell: (r) => <span className="text-sm text-muted-foreground">{r.provider?.user?.name ?? '—'}</span> },
    { key: 'date', header: 'Date', cell: (r) => <span className="text-sm text-muted-foreground">{fmtDate(r.createdAt)}</span> },
    {
      key: 'state',
      header: 'State',
      cell: (r) => (r.hidden ? <Badge variant="outline" className="text-muted-foreground font-normal">Hidden</Badge> : <Badge variant="secondary" className="font-normal">Visible</Badge>),
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'w-28',
      cell: (r) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(r)} title="Edit review">
            <Pencil className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={() => toggleHide(r)} title={r.hidden ? 'Restore' : 'Hide'}>
            {r.hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => setToDelete(r)}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Reviews" description="Moderate customer feedback and ratings" />

      {providerId && (
        <div className="mb-3 flex items-center gap-2 text-sm">
          <Badge variant="secondary" className="font-normal">
            Provider: {providerName ?? '—'}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-muted-foreground"
            onClick={() => { setSearch({}); setPage(1); }}
          >
            Clear filter
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        loading={loading}
        rowKey={(r) => r.id}
        pagination={data?.pagination}
        onPageChange={setPage}
        toolbar={
          <div className="flex flex-col sm:flex-row gap-2">
            <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search comment or author…" className="sm:max-w-xs w-full" />
            <FilterSelect
              value={flagged}
              onChange={(v) => { setFlagged(v); setPage(1); }}
              options={[{ value: 'all', label: 'All reviews' }, { value: 'yes', label: 'Flagged only' }]}
            />
            <FilterSelect
              value={rating}
              onChange={(v) => { setRating(v); setPage(1); }}
              options={[{ value: 'all', label: 'Any rating' }, ...[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} star` }))]}
              className="w-[130px] bg-background"
            />
          </div>
        }
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this review?</AlertDialogTitle>
            <AlertDialogDescription>The review will be permanently removed and the provider’s rating recalculated.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-white hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Rating</Label>
              <RatingSelect
                value={editRating}
                onChange={setEditRating}
                options={[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} ★` }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rv-comment">Comment</Label>
              <Textarea
                id="rv-comment"
                rows={4}
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
                placeholder="Leave empty to remove the comment"
              />
              <p className="text-xs text-muted-foreground">
                Editing is for moderation — trimming abuse from an otherwise valid review. Changing the
                rating recalculates the provider's average.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={savingEdit}>{savingEdit ? 'Saving…' : 'Save changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
