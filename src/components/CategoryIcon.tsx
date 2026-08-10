import { useMemo, useRef, useState } from 'react';
import { DynamicIcon, iconNames, type IconName } from 'lucide-react/dynamic';
import { Shapes, Search, Upload, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from './ui/input';
import { Button } from './ui/button';

// All ~1600 lucide icon names, for search + validation. `iconNames` is a plain
// string array, so importing it is cheap — DynamicIcon lazy-loads the actual
// icon component only when rendered.
const ALL_ICONS = iconNames as unknown as string[];
const VALID = new Set<string>(ALL_ICONS);

// A category icon is EITHER a lucide icon name ("wrench") or a custom image the
// admin uploaded. Custom images are stored inline as a data URI in the same
// `Category.icon` column — small (~5-10KB at 96px), needs no object storage, and
// works identically in dev and prod. `https://` is also accepted so the column
// can hold a CDN URL if uploads are moved to R2 later.
export function isCustomIcon(icon?: string | null): boolean {
  if (!icon) return false;
  return icon.startsWith('data:image/') || icon.startsWith('http://') || icon.startsWith('https://');
}

// Normalizes a stored icon name — legacy PascalCase ("Wrench") or kebab-case
// ("air-vent", "flower-2") — to the kebab-case DynamicIcon expects.
export function toIconName(name?: string | null): string {
  if (!name) return '';
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')     // camelCase → kebab
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')  // ACRONYMCase → kebab
    .replace(/([a-zA-Z])([0-9])/g, '$1-$2')     // letter→digit (Flower2 → flower-2)
    .toLowerCase();
}

// Renders a category icon — custom upload or lucide name — with a graceful
// fallback. `className` carries the sizing, so custom images use object-contain
// to sit correctly inside whatever box the caller provides.
export function CategoryIcon({ icon, className = 'size-5' }: { icon?: string | null; className?: string }) {
  if (isCustomIcon(icon)) {
    return <img src={icon!} alt="" className={`${className} object-contain`} loading="lazy" />;
  }
  const name = toIconName(icon);
  if (!VALID.has(name)) return <Shapes className={className} />;
  return <DynamicIcon name={name as IconName} className={className} fallback={() => <Shapes className={className} />} />;
}

// ───────────────────────── Custom image upload ─────────────────────────

const ICON_PX = 96;                          // stored icons are square, 96×96
const MAX_SOURCE_BYTES = 4 * 1024 * 1024;    // reject huge source files up front
const MAX_STORED_BYTES = 256 * 1024;         // safety net on the encoded result
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif'];

// Downscales any uploaded image to a square ICON_PX PNG data URI, preserving
// aspect ratio (letterboxed, transparent padding) so non-square logos aren't
// stretched. Rasterizing everything — including SVG — keeps rendering uniform
// and avoids storing markup that would later be inlined into the app.
export async function fileToIconDataUri(file: File, px = ICON_PX): Promise<string> {
  const sourceUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read that file'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('That file is not a readable image'));
    el.src = sourceUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available in this browser');

  // SVGs can report a zero intrinsic size; fall back to a square box.
  const iw = img.naturalWidth || img.width || px;
  const ih = img.naturalHeight || img.height || px;

  const scale = Math.min(px / iw, px / ih);
  const w = Math.max(1, Math.round(iw * scale));
  const h = Math.max(1, Math.round(ih * scale));
  ctx.drawImage(img, Math.round((px - w) / 2), Math.round((px - h) / 2), w, h);

  return canvas.toDataURL('image/png');
}

// File picker + live preview for a custom category icon.
export function IconUpload({ value, onChange }: { value: string; onChange: (icon: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const custom = isCustomIcon(value);

  const pick = async (file?: File) => {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      return toast.error('Use a PNG, JPG, WEBP, GIF or SVG image');
    }
    if (file.size > MAX_SOURCE_BYTES) {
      return toast.error('That image is over 4MB — pick a smaller one');
    }
    setBusy(true);
    try {
      const uri = await fileToIconDataUri(file);
      if (uri.length > MAX_STORED_BYTES) {
        return toast.error('That image is too detailed to store — try a simpler icon');
      }
      onChange(uri);
      toast.success('Custom icon ready — save the category to apply it');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not process that image');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = ''; // allow re-picking the same file
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 rounded-lg border border-dashed p-4">
        <div className="size-16 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 overflow-hidden">
          {busy ? <Loader2 className="size-5 animate-spin" /> : <CategoryIcon icon={value} className="size-8" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{custom ? 'Custom image' : 'No custom image'}</p>
          <p className="text-xs text-muted-foreground">
            {custom
              ? 'Shown in the app in place of a library icon.'
              : `PNG, JPG, WEBP, GIF or SVG — resized to ${ICON_PX}×${ICON_PX}.`}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
            <Upload className="size-4" /> {custom ? 'Replace' : 'Upload'}
          </Button>
          {custom && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => onChange('wrench')}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
    </div>
  );
}

// Searchable grid picker over the full lucide icon set. Value/onChange use the
// kebab-case icon name.
export function IconPicker({ value, onChange, limit = 60 }: { value: string; onChange: (name: string) => void; limit?: number }) {
  const [query, setQuery] = useState('');
  const selected = toIconName(value);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Show a sensible starter set (selected first), then popular basics.
      const base = ['wrench', 'zap', 'hammer', 'sparkles', 'paintbrush', 'wind', 'house', 'truck', 'scissors', 'leaf', 'shield', 'droplet', 'brush', 'plug', 'car', 'flower', 'scissors-line-dashed', 'heart-pulse', 'dumbbell', 'sofa', 'bath', 'utensils', 'camera', 'laptop', 'stethoscope', 'graduation-cap', 'baby', 'dog', 'flower-2', 'hand-platter'];
      const uniq = Array.from(new Set([selected, ...base].filter(Boolean)));
      return uniq.slice(0, limit);
    }
    return ALL_ICONS.filter((n) => n.includes(q)).slice(0, limit);
  }, [query, selected, limit]);

  const total = query.trim() ? ALL_ICONS.filter((n) => n.includes(query.trim().toLowerCase())).length : ALL_ICONS.length;

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search 1600+ icons… (e.g. flower, scissors, dumbbell)" className="pl-9 bg-background" />
      </div>
      <div className="grid grid-cols-8 gap-1.5 max-h-52 overflow-y-auto p-0.5">
        {results.map((n) => (
          <button
            key={n}
            type="button"
            title={n}
            onClick={() => onChange(n)}
            className={`aspect-square rounded-lg flex items-center justify-center border transition-colors ${
              selected === n ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent'
            }`}
          >
            <DynamicIcon name={n as IconName} className="size-4" fallback={() => <Shapes className="size-4" />} />
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {query.trim()
          ? `${Math.min(results.length, limit)} of ${total} match "${query.trim()}"${total > limit ? ' — refine to narrow' : ''}`
          : `Search across ${total.toLocaleString()} icons. Selected: ${selected || 'none'}`}
      </p>
    </div>
  );
}
