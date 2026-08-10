import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, ExternalLink, FileText } from 'lucide-react';
import { adminApi } from '../lib/api';
import { useApi } from '../lib/useApi';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Textarea } from '../components/ui/textarea';
import { Skeleton } from '../components/ui/skeleton';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import type { LegalPage } from '../lib/types';

// Where the apps link directly. Renaming these slugs breaks those links, so the
// console warns before letting it happen.
const LINKED_SLUGS = ['terms', 'privacy'];

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export function LegalPages() {
  const { data, loading, refetch } = useApi(() => adminApi.legal.list(), []);
  const pages = data?.pages ?? [];

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LegalPage | null>(null);
  const [toDelete, setToDelete] = useState<LegalPage | null>(null);
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [content, setContent] = useState('');
  const [isActive, setIsActive] = useState(true);

  const openCreate = () => {
    setEditing(null);
    setTitle(''); setSlug(''); setSlugTouched(false); setContent(''); setIsActive(true);
    setOpen(true);
  };

  const openEdit = (p: LegalPage) => {
    setEditing(p);
    setTitle(p.title); setSlug(p.slug); setSlugTouched(true); setContent(p.content); setIsActive(p.isActive);
    setOpen(true);
  };

  const save = async () => {
    if (!title.trim()) return toast.error('Title is required');
    if (!slug.trim()) return toast.error('Slug is required');
    if (!content.trim()) return toast.error('Content is required');
    if (editing && LINKED_SLUGS.includes(editing.slug) && slug !== editing.slug) {
      const ok = window.confirm(
        `The apps link to /legal/${editing.slug} from signup and Help & Support. Renaming the slug will break those links. Continue?`,
      );
      if (!ok) return;
    }

    setSaving(true);
    try {
      const body = { title: title.trim(), slug: slug.trim(), content, isActive };
      if (editing) {
        await adminApi.legal.update(editing.id, body);
        toast.success('Page updated');
      } else {
        await adminApi.legal.create(body);
        toast.success('Page created');
      }
      setOpen(false);
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not save the page');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await adminApi.legal.remove(toDelete.id);
      toast.success('Page deleted');
      setToDelete(null);
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not delete the page');
    }
  };

  const togglePublished = async (p: LegalPage) => {
    try {
      await adminApi.legal.update(p.id, { isActive: !p.isActive });
      toast.success(p.isActive ? `“${p.title}” unpublished` : `“${p.title}” published`);
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not update the page');
    }
  };

  // Move one position up/down and persist the whole sequence, which is what the
  // reorder endpoint expects.
  const move = async (index: number, dir: -1 | 1) => {
    const next = [...pages];
    const target = index + dir;
    if (target < 0 || target >= next.length || reordering) return;
    [next[index], next[target]] = [next[target], next[index]];
    setReordering(true);
    try {
      await adminApi.legal.reorder(next.map((p) => p.id));
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not reorder pages');
    } finally {
      setReordering(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Legal Pages"
        description="Terms, privacy and policy documents shown in the customer and provider apps"
        actions={<Button onClick={openCreate}><Plus className="size-4" /> New page</Button>}
      />

      <div className="space-y-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          : pages.length === 0
            ? (
              <Card className="p-10 text-center text-sm text-muted-foreground">
                No legal pages yet. Create Terms &amp; Conditions and a Privacy Policy — the apps link to them from signup.
              </Card>
            )
            : pages.map((p, i) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-start gap-4">
                  <div className="size-10 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <FileText className="size-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{p.title}</span>
                      <Badge variant={p.isActive ? 'default' : 'secondary'}>
                        {p.isActive ? 'Published' : 'Draft'}
                      </Badge>
                      {LINKED_SLUGS.includes(p.slug) && (
                        <Badge variant="outline" className="gap-1">
                          <ExternalLink className="size-3" /> linked from signup
                        </Badge>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      /legal/{p.slug} · updated {formatDate(p.updatedAt)}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {p.content.replace(/^#+\s*/gm, '').replace(/\s+/g, ' ').slice(0, 220)}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="icon" className="size-8" disabled={i === 0 || reordering}
                      onClick={() => move(i, -1)} aria-label="Move up">
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8" disabled={i === pages.length - 1 || reordering}
                      onClick={() => move(i, 1)} aria-label="Move down">
                      <ArrowDown className="size-4" />
                    </Button>
                    <Switch checked={p.isActive} onCheckedChange={() => togglePublished(p)} aria-label="Published" />
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(p)} aria-label="Edit">
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive"
                      onClick={() => setToDelete(p)} aria-label="Delete">
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit page' : 'New legal page'}</DialogTitle>
            <DialogDescription>
              Published pages appear under Quick Links on the Help &amp; Support screen of both apps.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="legal-title">Title</Label>
                <Input
                  id="legal-title"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (!editing && !slugTouched) setSlug(slugify(e.target.value));
                  }}
                  placeholder="e.g. Cancellation Policy"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="legal-slug">Slug</Label>
                <Input
                  id="legal-slug"
                  value={slug}
                  onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)); }}
                  placeholder="cancellation-policy"
                />
                <p className="text-xs text-muted-foreground">Opens in the apps at /legal/{slug || '…'}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="legal-content">Content</Label>
              <Textarea
                id="legal-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={16}
                className="font-mono text-xs leading-relaxed"
                placeholder={'## Section heading\nA paragraph of plain text.\n\n- A bullet point\n- Another bullet point'}
              />
              <p className="text-xs text-muted-foreground">
                Formatting: <code>## </code> for a heading, <code>- </code> for bullets, a blank line between paragraphs.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <div className="text-sm font-medium">Published</div>
                <div className="text-xs text-muted-foreground">Drafts stay hidden from the customer and provider apps.</div>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{editing ? 'Save changes' : 'Create page'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{toDelete?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete && LINKED_SLUGS.includes(toDelete.slug)
                ? `The apps link to /legal/${toDelete.slug} from signup and Help & Support — those links will stop working. Consider unpublishing instead.`
                : 'The page disappears from both apps immediately. This cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-white hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
