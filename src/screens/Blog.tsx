// Writing and publishing the articles the public site shows.
//
// The site reads from /content/blog, which only returns posts that are
// PUBLISHED *and* whose publishedAt has passed. So this screen has three states
// to make legible, not two: a draft nobody can see, an article that is live,
// and an article that is published but dated forward and therefore still
// invisible. The last one is the one that gets reported as a bug.

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, FileText, Clock, Eye } from 'lucide-react';
import { adminApi } from '../lib/api';
import { useApi } from '../lib/useApi';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { SearchInput, fmtDate } from '../components/common';
import { FilterSelect } from '../components/FilterSelect';
import { ImagesField } from '../components/ImagesField';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import type { AdminBlogPost, AdminBlogPostSummary, PostStatus } from '../lib/types';

const STATUS_TONE: Record<PostStatus, string> = {
  PUBLISHED: 'bg-green-500/10 text-green-600 border-green-500/20',
  DRAFT: 'bg-muted text-muted-foreground border-border',
  ARCHIVED: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
};

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft — not on the site' },
  { value: 'PUBLISHED', label: 'Published — live on the site' },
  { value: 'ARCHIVED', label: 'Archived — taken down, kept' },
];

const SITE_ORIGIN = import.meta.env.VITE_SITE_ORIGIN ?? 'https://janshram.in';

/**
 * Mirrors the backend's slugify, including the `\p{M}` that keeps Devanagari
 * matras — this is only a preview of the address, and a preview that disagrees
 * with what gets saved is worse than none.
 */
const slugify = (text: string) =>
  text.toLowerCase().normalize('NFC')
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');

interface FormState {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  coverImage: string | null;
  category: string;
  tags: string;
  authorName: string;
  status: PostStatus;
  publishedAt: string;
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
}

const empty: FormState = {
  title: '', slug: '', excerpt: '', body: '', coverImage: null, category: '',
  tags: '', authorName: '', status: 'DRAFT', publishedAt: '',
  seoTitle: '', seoDescription: '', canonicalUrl: '',
};

/** `datetime-local` wants 'YYYY-MM-DDTHH:mm' in local time, not an ISO string. */
const toLocalInput = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const isScheduled = (p: AdminBlogPostSummary) =>
  p.status === 'PUBLISHED' && !!p.publishedAt && new Date(p.publishedAt) > new Date();

export function Blog() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);

  const { data, loading, refetch } = useApi(
    () => adminApi.blog.list({ q: q || undefined, status: status === 'all' ? undefined : status, page }),
    [q, status, page],
  );

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  /** The slug as loaded, so an untouched one is never sent — see save(). */
  const [savedSlug, setSavedSlug] = useState('');
  const [loadingPost, setLoadingPost] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<AdminBlogPostSummary | null>(null);

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const openCreate = () => {
    setEditingId(null);
    setSavedSlug('');
    setForm(empty);
    setOpen(true);
  };

  // The list has no body, so editing always fetches the article in full first.
  const openEdit = async (row: AdminBlogPostSummary) => {
    setEditingId(row.id);
    setSavedSlug(row.slug);
    setForm({ ...empty, title: row.title, slug: row.slug, status: row.status });
    setOpen(true);
    setLoadingPost(true);
    try {
      const { post } = await adminApi.blog.get(row.id);
      setForm(fromPost(post));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open that article');
      setOpen(false);
    } finally {
      setLoadingPost(false);
    }
  };

  const fromPost = (p: AdminBlogPost): FormState => ({
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt ?? '',
    body: p.body,
    coverImage: p.coverImage,
    category: p.category ?? '',
    tags: p.tags.join(', '),
    authorName: p.authorName ?? '',
    status: p.status,
    publishedAt: toLocalInput(p.publishedAt),
    seoTitle: p.seoTitle ?? '',
    seoDescription: p.seoDescription ?? '',
    canonicalUrl: p.canonicalUrl ?? '',
  });

  const save = async () => {
    if (form.title.trim().length < 3) return toast.error('Give the article a title first');
    if (!form.body.trim()) return toast.error('An article needs a body');

    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      body: form.body,
      excerpt: form.excerpt.trim() || undefined,
      coverImage: form.coverImage || null,
      category: form.category.trim() || null,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      authorName: form.authorName.trim() || null,
      status: form.status,
      seoTitle: form.seoTitle.trim() || null,
      seoDescription: form.seoDescription.trim() || null,
      canonicalUrl: form.canonicalUrl.trim() || null,
      // Left out entirely when blank: sending null would clear the date an
      // article was first published and take it off the site's date ordering.
      ...(form.publishedAt ? { publishedAt: new Date(form.publishedAt).toISOString() } : {}),
    };
    // Only when it was actually edited. The backend moves the address whenever
    // a different slug arrives, and a live article's URL should not change
    // because somebody fixed a typo in the headline.
    if (!editingId || form.slug.trim() !== savedSlug) payload.slug = form.slug.trim() || undefined;

    setSaving(true);
    try {
      if (editingId) {
        await adminApi.blog.update(editingId, payload);
        toast.success('Article saved');
      } else {
        await adminApi.blog.create(payload);
        toast.success(form.status === 'PUBLISHED' ? 'Article published' : 'Draft saved');
      }
      setOpen(false);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the article');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await adminApi.blog.remove(toDelete.id);
      toast.success('Article deleted');
      setToDelete(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete the article');
    }
  };

  const slugPreview = (editingId ? form.slug : form.slug || slugify(form.title)) || '…';
  const words = form.body.trim().split(/\s+/).filter(Boolean).length;

  const columns: Column<AdminBlogPostSummary>[] = [
    {
      key: 'title',
      header: 'Article',
      cell: (p) => (
        <div className="min-w-0 max-w-[420px]">
          <div className="font-medium truncate">{p.title}</div>
          <div className="text-xs text-muted-foreground truncate">/{p.slug}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (p) => (
        <div className="space-y-1">
          <Badge variant="outline" className={`text-xs ${STATUS_TONE[p.status]}`}>
            {p.status === 'PUBLISHED' ? 'Live' : p.status === 'DRAFT' ? 'Draft' : 'Archived'}
          </Badge>
          {/* Published, but dated forward — live on the console, absent from the
              site. Without this the row looks identical to one that is showing. */}
          {isScheduled(p) && (
            <div className="flex items-center gap-1 text-xs text-amber-600">
              <Clock className="size-3" /> shows {fmtDate(p.publishedAt)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      cell: (p) => <span className="text-sm">{p.category ?? '—'}</span>,
    },
    {
      key: 'read',
      header: 'Length',
      cell: (p) => (
        <span className="text-xs text-muted-foreground">
          {p.readingMinutes ? `${p.readingMinutes} min read` : '—'}
        </span>
      ),
    },
    {
      key: 'updated',
      header: 'Updated',
      cell: (p) => <span className="text-xs text-muted-foreground">{fmtDate(p.updatedAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      cell: (p) => (
        <div className="flex items-center gap-1 justify-end">
          {p.status === 'PUBLISHED' && !isScheduled(p) && (
            <Button asChild variant="ghost" size="icon" className="size-8" title="Open on the site">
              <a
                href={`${SITE_ORIGIN}/blog/${p.slug}/`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                <Eye className="size-4" />
              </a>
            </Button>
          )}
          <Button variant="ghost" size="icon" className="size-8" onClick={(e) => { e.stopPropagation(); openEdit(p); }}>
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost" size="icon"
            className="size-8 text-destructive hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); setToDelete(p); }}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
      headerClassName: 'text-right',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Blog"
        description="Articles on the public site"
        actions={<Button onClick={openCreate}><Plus className="size-4" /> New article</Button>}
      />

      <div className="flex flex-wrap gap-3">
        <SearchInput
          value={q}
          onChange={(v) => { setQ(v); setPage(1); }}
          placeholder="Search by title"
          className="flex-1 min-w-[240px]"
        />
        <FilterSelect
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          options={[
            { value: 'all', label: 'All statuses' },
            { value: 'PUBLISHED', label: 'Published' },
            { value: 'DRAFT', label: 'Drafts' },
            { value: 'ARCHIVED', label: 'Archived' },
          ]}
          className="w-44"
        />
      </div>

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        loading={loading}
        rowKey={(p) => p.id}
        onRowClick={openEdit}
        emptyLabel={q || status !== 'all' ? 'No articles match that.' : 'No articles yet — write the first one.'}
        pagination={data?.pagination}
        onPageChange={setPage}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit article' : 'New article'}</DialogTitle>
            <DialogDescription>
              {editingId ? `janshram.in/blog/${slugPreview}/` : 'Drafts stay off the site until you publish them.'}
            </DialogDescription>
          </DialogHeader>

          {loadingPost ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading the article…</div>
          ) : (
            <Tabs defaultValue="write">
              <TabsList>
                <TabsTrigger value="write">Write</TabsTrigger>
                <TabsTrigger value="meta">Details</TabsTrigger>
                <TabsTrigger value="seo">Search &amp; sharing</TabsTrigger>
              </TabsList>

              <TabsContent value="write" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="bp-title">Title</Label>
                  <Input
                    id="bp-title"
                    value={form.title}
                    onChange={(e) => set({ title: e.target.value })}
                    placeholder="e.g. How to hire a plumber in Gaya"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bp-excerpt">Excerpt</Label>
                  <Textarea
                    id="bp-excerpt"
                    rows={2}
                    value={form.excerpt}
                    onChange={(e) => set({ excerpt: e.target.value })}
                    placeholder="One or two lines, shown on the blog index."
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor="bp-body">Body</Label>
                    <span className="text-xs text-muted-foreground">
                      {words} {words === 1 ? 'word' : 'words'}
                      {words > 0 && ` · ~${Math.max(1, Math.round(words / 200))} min read`}
                    </span>
                  </div>
                  {/* Plain text, and the site renders it as plain text too.
                      Pasting HTML here would be shown escaped rather than
                      interpreted — which is the safe behaviour, not a bug. */}
                  <Textarea
                    id="bp-body"
                    rows={16}
                    value={form.body}
                    onChange={(e) => set({ body: e.target.value })}
                    placeholder="Write the article. Blank lines separate paragraphs."
                    className="font-normal leading-relaxed"
                  />
                </div>
              </TabsContent>

              <TabsContent value="meta" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Cover image</Label>
                  <ImagesField
                    urls={form.coverImage ? [form.coverImage] : []}
                    onChange={(urls) => set({ coverImage: urls[0] ?? null })}
                    folder="blog"
                    max={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bp-slug">Web address</Label>
                  <div className="flex items-center gap-1 text-sm">
                    <span className="text-muted-foreground shrink-0">/blog/</span>
                    <Input
                      id="bp-slug"
                      value={form.slug}
                      onChange={(e) => set({ slug: e.target.value })}
                      placeholder={slugify(form.title) || 'from-the-title'}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {editingId
                      ? 'Changing this breaks every existing link to the article.'
                      : 'Left blank, it is made from the title.'}
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="bp-cat">Category</Label>
                    <Input
                      id="bp-cat" value={form.category}
                      onChange={(e) => set({ category: e.target.value })}
                      placeholder="e.g. Home Services"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bp-author">Author</Label>
                    <Input
                      id="bp-author" value={form.authorName}
                      onChange={(e) => set({ authorName: e.target.value })}
                      placeholder="JanShram Team"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bp-tags">Tags</Label>
                  <Input
                    id="bp-tags" value={form.tags}
                    onChange={(e) => set({ tags: e.target.value })}
                    placeholder="plumbing, hiring"
                  />
                  <p className="text-xs text-muted-foreground">Separated by commas.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <FilterSelect
                      value={form.status}
                      onChange={(v) => set({ status: v as PostStatus })}
                      options={STATUS_OPTIONS}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bp-when">Publish date</Label>
                    <Input
                      id="bp-when" type="datetime-local"
                      value={form.publishedAt}
                      onChange={(e) => set({ publishedAt: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      {form.status !== 'PUBLISHED'
                        ? 'Only applies once the article is published.'
                        : form.publishedAt && new Date(form.publishedAt) > new Date()
                          ? 'In the future — the site will not show it until then.'
                          : 'Blank means the moment you publish.'}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="seo" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="bp-seo-title">Search title</Label>
                  <Input
                    id="bp-seo-title" value={form.seoTitle}
                    onChange={(e) => set({ seoTitle: e.target.value })}
                    placeholder={form.title || 'Falls back to the article title'}
                  />
                  <p className="text-xs text-muted-foreground">
                    {form.seoTitle.length > 60
                      ? `${form.seoTitle.length} characters — Google usually cuts around 60.`
                      : 'Shown as the headline in search results.'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bp-seo-desc">Search description</Label>
                  <Textarea
                    id="bp-seo-desc" rows={3} value={form.seoDescription}
                    onChange={(e) => set({ seoDescription: e.target.value })}
                    placeholder={form.excerpt || 'Falls back to the excerpt'}
                  />
                  <p className="text-xs text-muted-foreground">
                    {form.seoDescription.length > 160
                      ? `${form.seoDescription.length} characters — usually cut around 160.`
                      : 'The grey text under the headline in search results.'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bp-canonical">Canonical URL</Label>
                  <Input
                    id="bp-canonical" value={form.canonicalUrl}
                    onChange={(e) => set({ canonicalUrl: e.target.value })}
                    placeholder="https://…"
                  />
                  <p className="text-xs text-muted-foreground">
                    Only if this article was published somewhere else first — it tells search
                    engines which copy counts. Leave blank otherwise.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || loadingPost}>
              {saving ? 'Saving…' : editingId ? 'Save changes' : form.status === 'PUBLISHED' ? 'Publish' : 'Save draft'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this article?</AlertDialogTitle>
            <AlertDialogDescription>
              “{toDelete?.title}” will be gone, and {SITE_ORIGIN}/blog/{toDelete?.slug}/ will stop
              resolving for anyone who has the link. To take it off the site but keep it, archive
              it instead.
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

      {!loading && (data?.data.length ?? 0) === 0 && !q && status === 'all' && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileText className="size-3.5" />
          The site’s blog index is empty until something here is published.
        </div>
      )}
    </div>
  );
}
