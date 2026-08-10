import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, HelpCircle } from 'lucide-react';
import { adminApi } from '../lib/api';
import { useApi } from '../lib/useApi';
import { PageHeader } from '../components/PageHeader';
import { FilterSelect } from '../components/FilterSelect';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Textarea } from '../components/ui/textarea';
import { Skeleton } from '../components/ui/skeleton';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import type { Faq, FaqAudience } from '../lib/types';

const AUDIENCE_LABEL: Record<FaqAudience, string> = {
  ALL: 'Everyone',
  CUSTOMER: 'Customers',
  PROVIDER: 'Providers',
};

const AUDIENCE_OPTIONS = [
  { value: 'ALL', label: 'Everyone (customers + providers)' },
  { value: 'CUSTOMER', label: 'Customers only' },
  { value: 'PROVIDER', label: 'Providers only' },
];

const FILTER_OPTIONS = [{ value: 'all', label: 'All audiences' }, ...AUDIENCE_OPTIONS];

interface FormState {
  question: string;
  answer: string;
  audience: FaqAudience;
  isActive: boolean;
}

const empty: FormState = { question: '', answer: '', audience: 'ALL', isActive: true };

export function Faqs() {
  const { data, loading, refetch } = useApi(() => adminApi.faqs.list(), []);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Faq | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [toDelete, setToDelete] = useState<Faq | null>(null);
  const [audienceFilter, setAudienceFilter] = useState('all');
  const [saving, setSaving] = useState(false);

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  // Backend already returns these ordered; keep that as the canonical sequence.
  const all = data?.faqs ?? [];
  const visible = audienceFilter === 'all' ? all : all.filter((f) => f.audience === audienceFilter);

  const openCreate = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (f: Faq) => {
    setEditing(f);
    setForm({ question: f.question, answer: f.answer, audience: f.audience, isActive: f.isActive });
    setOpen(true);
  };

  const save = async () => {
    if (!form.question.trim()) return toast.error('Question is required');
    if (!form.answer.trim()) return toast.error('Answer is required');
    setSaving(true);
    try {
      const payload = {
        question: form.question.trim(),
        answer: form.answer.trim(),
        audience: form.audience,
        isActive: form.isActive,
      };
      if (editing) {
        await adminApi.faqs.update(editing.id, payload);
        toast.success('FAQ updated');
      } else {
        await adminApi.faqs.create(payload);
        toast.success('FAQ created');
      }
      setOpen(false);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save FAQ');
    } finally {
      setSaving(false);
    }
  };

  // Publish/unpublish inline — the most common edit, so it shouldn't need the dialog.
  const togglePublished = async (f: Faq) => {
    try {
      await adminApi.faqs.update(f.id, { isActive: !f.isActive });
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update FAQ');
    }
  };

  // Moves an entry one slot within the FULL list and persists the new sequence.
  const move = async (id: string, delta: -1 | 1) => {
    const i = all.findIndex((f) => f.id === id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= all.length) return;
    const ids = all.map((f) => f.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    try {
      await adminApi.faqs.reorder(ids);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not reorder FAQs');
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await adminApi.faqs.remove(toDelete.id);
      toast.success('FAQ deleted');
      setToDelete(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete FAQ');
    }
  };

  return (
    <div>
      <PageHeader
        title="FAQs"
        description="Help-centre answers shown in the customer and provider apps"
        actions={
          <>
            <FilterSelect
              value={audienceFilter}
              onChange={setAudienceFilter}
              options={FILTER_OPTIONS}
              placeholder="All audiences"
              className="w-52"
            />
            <Button onClick={openCreate}><Plus className="size-4" /> New FAQ</Button>
          </>
        }
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : visible.length === 0 ? (
        <Card className="p-12 text-center">
          <HelpCircle className="size-8 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">{audienceFilter !== 'all' ? 'No FAQs for this audience' : 'No FAQs yet'}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {audienceFilter !== 'all'
              ? 'Clear the filter or add an entry scoped to this audience.'
              : 'Add your first entry — it appears in the apps’ Help & Support screen immediately.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((f) => {
            const idx = all.findIndex((x) => x.id === f.id);
            return (
              <Card key={f.id} className="p-4">
                <div className="flex items-start gap-3">
                  {/* Reorder handles act on the full list, so they're disabled while filtered. */}
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <Button
                      variant="ghost" size="icon" className="size-7"
                      disabled={audienceFilter !== 'all' || idx <= 0}
                      title={audienceFilter !== 'all' ? 'Clear the audience filter to reorder' : 'Move up'}
                      onClick={() => move(f.id, -1)}
                    >
                      <ChevronUp className="size-4" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="size-7"
                      disabled={audienceFilter !== 'all' || idx >= all.length - 1}
                      title={audienceFilter !== 'all' ? 'Clear the audience filter to reorder' : 'Move down'}
                      onClick={() => move(f.id, 1)}
                    >
                      <ChevronDown className="size-4" />
                    </Button>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{f.question}</span>
                      <Badge variant="secondary">{AUDIENCE_LABEL[f.audience]}</Badge>
                      {!f.isActive && <Badge variant="outline">Hidden</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{f.answer}</p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Switch
                      checked={f.isActive}
                      onCheckedChange={() => togglePublished(f)}
                      aria-label={f.isActive ? 'Unpublish FAQ' : 'Publish FAQ'}
                    />
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(f)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className="size-8 text-destructive hover:text-destructive"
                      onClick={() => setToDelete(f)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit FAQ' : 'New FAQ'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="faq-q">Question</Label>
              <Input
                id="faq-q"
                value={form.question}
                onChange={(e) => set({ question: e.target.value })}
                placeholder="e.g. How do I cancel a booking?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="faq-a">Answer</Label>
              <Textarea
                id="faq-a"
                rows={5}
                value={form.answer}
                onChange={(e) => set({ answer: e.target.value })}
                placeholder="Write the answer as it should appear in the app."
              />
            </div>
            <div className="space-y-2">
              <Label>Audience</Label>
              <FilterSelect
                value={form.audience}
                onChange={(v) => set({ audience: v as FaqAudience })}
                options={AUDIENCE_OPTIONS}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Published</p>
                <p className="text-xs text-muted-foreground">Hidden entries stay out of the apps.</p>
              </div>
              <Switch checked={form.isActive} onCheckedChange={(v) => set({ isActive: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this FAQ?</AlertDialogTitle>
            <AlertDialogDescription>
              “{toDelete?.question}” will be removed from the apps. This cannot be undone — to hide
              it temporarily, switch it to unpublished instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-white hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
