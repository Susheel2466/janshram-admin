// Where the public site's "Follow us" links point.
//
// The platform list is fixed by the API — six, each one row, so this is an
// upsert per platform rather than a free-form list. Every platform is shown
// whether or not it has been set, because "we have no YouTube link yet" is
// something you can only see if the empty row is there to look at.
//
// A link that is off is kept, not deleted: taking the account down for a week
// should not mean typing the URL back in afterwards.

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Link2, Trash2, ExternalLink } from 'lucide-react';
import { adminApi } from '../lib/api';
import { useApi } from '../lib/useApi';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Skeleton } from '../components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { SOCIAL_PLATFORMS, type SocialPlatform } from '../lib/types';

const META: Record<SocialPlatform, { label: string; placeholder: string }> = {
  instagram: { label: 'Instagram', placeholder: 'https://instagram.com/janshram' },
  facebook: { label: 'Facebook', placeholder: 'https://facebook.com/janshram' },
  youtube: { label: 'YouTube', placeholder: 'https://youtube.com/@janshram' },
  linkedin: { label: 'LinkedIn', placeholder: 'https://linkedin.com/company/janshram' },
  x: { label: 'X', placeholder: 'https://x.com/janshram' },
  whatsapp: { label: 'WhatsApp', placeholder: 'https://wa.me/919999999999' },
};

interface Draft {
  url: string;
  order: number;
  active: boolean;
  /** False for a platform that has never been saved — nothing to delete yet. */
  exists: boolean;
}

const blank = (i: number): Draft => ({ url: '', order: i, active: true, exists: false });

export function SocialLinks() {
  // No background refresh: this screen copies what it fetches into inputs, and
  // a poll landing mid-edit would overwrite what is being typed.
  const { data, loading, refetch } = useApi(() => adminApi.socialLinks.list(), [], { refreshMs: 0 });

  const [drafts, setDrafts] = useState<Record<SocialPlatform, Draft>>(() =>
    Object.fromEntries(SOCIAL_PLATFORMS.map((p, i) => [p, blank(i)])) as Record<SocialPlatform, Draft>,
  );
  const [busy, setBusy] = useState<SocialPlatform | null>(null);
  const [toRemove, setToRemove] = useState<SocialPlatform | null>(null);

  useEffect(() => {
    if (!data) return;
    setDrafts(
      Object.fromEntries(
        SOCIAL_PLATFORMS.map((p, i) => {
          const found = data.links.find((l) => l.platform === p);
          return [p, found
            ? { url: found.url, order: found.order, active: found.active, exists: true }
            : blank(i)];
        }),
      ) as Record<SocialPlatform, Draft>,
    );
  }, [data]);

  const set = (p: SocialPlatform, patch: Partial<Draft>) =>
    setDrafts((d) => ({ ...d, [p]: { ...d[p], ...patch } }));

  const save = async (p: SocialPlatform) => {
    const d = drafts[p];
    const url = d.url.trim();
    if (!url) return toast.error('Paste the link first');
    // Checked here so the failure names the field rather than arriving as a
    // bare 400 from the server's url validator.
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error('bad protocol');
    } catch {
      return toast.error('That is not a web address — it should start with https://');
    }

    setBusy(p);
    try {
      await adminApi.socialLinks.save(p, { url, order: d.order, active: d.active });
      toast.success(`${META[p].label} saved`);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save that link');
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!toRemove) return;
    setBusy(toRemove);
    try {
      await adminApi.socialLinks.remove(toRemove);
      toast.success(`${META[toRemove].label} removed`);
      setToRemove(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove that link');
    } finally {
      setBusy(null);
    }
  };

  const liveCount = data?.links.filter((l) => l.active).length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Social links"
        description="The accounts the public site links to"
      />

      {!loading && (
        <p className="text-sm text-muted-foreground">
          {liveCount === 0
            // Not an error — the site omits the section entirely rather than
            // showing dead icons, which is why nobody notices it is empty.
            ? 'Nothing is switched on, so the site hides its “Follow us” section altogether.'
            : `${liveCount} ${liveCount === 1 ? 'account is' : 'accounts are'} shown on the site.`}
        </p>
      )}

      {loading ? (
        <div className="space-y-3">
          {SOCIAL_PLATFORMS.map((p) => <Skeleton key={p} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {SOCIAL_PLATFORMS.map((p) => {
            const d = drafts[p];
            const saved = data?.links.find((l) => l.platform === p);
            const dirty = !saved
              ? d.url.trim() !== ''
              : d.url !== saved.url || d.order !== saved.order || d.active !== saved.active;

            return (
              <Card key={p} className="p-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-[220px] flex-1 space-y-2">
                    <Label htmlFor={`sl-${p}`} className="flex items-center gap-2">
                      {META[p].label}
                      {!d.exists && <span className="text-xs font-normal text-muted-foreground">not set</span>}
                      {d.exists && !d.active && (
                        <span className="text-xs font-normal text-muted-foreground">hidden on the site</span>
                      )}
                    </Label>
                    <Input
                      id={`sl-${p}`}
                      value={d.url}
                      onChange={(e) => set(p, { url: e.target.value })}
                      placeholder={META[p].placeholder}
                      inputMode="url"
                    />
                  </div>

                  <div className="w-20 space-y-2">
                    <Label htmlFor={`sl-order-${p}`} className="text-xs">Order</Label>
                    <Input
                      id={`sl-order-${p}`}
                      type="number" min={0} max={99}
                      value={d.order}
                      onChange={(e) => set(p, { order: Number(e.target.value) })}
                    />
                  </div>

                  <div className="flex items-center gap-2 pb-2">
                    <Switch
                      checked={d.active}
                      onCheckedChange={(v) => set(p, { active: v })}
                      aria-label={`Show ${META[p].label} on the site`}
                    />
                    <span className="text-xs text-muted-foreground">Shown</span>
                  </div>

                  <div className="flex items-center gap-1 pb-1">
                    {d.exists && saved && (
                      <Button asChild variant="ghost" size="icon" className="size-9" title="Open the account">
                        <a href={saved.url} target="_blank" rel="noreferrer">
                          <ExternalLink className="size-4" />
                        </a>
                      </Button>
                    )}
                    <Button onClick={() => save(p)} disabled={busy === p || !dirty}>
                      {busy === p ? 'Saving…' : 'Save'}
                    </Button>
                    {d.exists && (
                      <Button
                        variant="ghost" size="icon"
                        className="size-9 text-destructive hover:text-destructive"
                        disabled={busy === p}
                        onClick={() => setToRemove(p)}
                        title="Remove this link"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <Link2 className="size-3.5 mt-0.5 shrink-0" />
        <span>
          To take an account off the site for a while, switch “Shown” off and save — the link is
          kept. Removing deletes it.
        </span>
      </div>

      <AlertDialog open={!!toRemove} onOpenChange={(o) => !o && setToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove the {toRemove && META[toRemove].label} link?</AlertDialogTitle>
            <AlertDialogDescription>
              The address is deleted and you would have to type it in again. To hide it from the
              site but keep it, switch “Shown” off instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-white hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
