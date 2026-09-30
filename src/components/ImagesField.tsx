import { useRef, useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { uploadFile, type UploadFolder } from '../lib/upload';
import { SafeImage } from './SafeImage';

/**
 * Several photos, uploaded here rather than pasted as URLs.
 *
 * This field used to be a text box for an image URL. The server now only
 * accepts files it issued itself — an off-site URL on a listing points every
 * customer's app at somebody else's server, which is a tracking beacon at best
 * — so pasting a link would be refused, and the console needs a real uploader
 * to keep being able to set a picture at all.
 *
 * The first photo is the cover; the server derives that from the order here.
 */
export function ImagesField({
  urls,
  onChange,
  folder = 'service-photos',
  max = 8,
  disabled = false,
}: {
  urls: string[];
  onChange: (urls: string[]) => void;
  folder?: UploadFolder;
  max?: number;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const room = max - urls.length;

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, Math.max(0, room));
    e.target.value = '';
    if (files.length === 0) return;

    setBusy(true);
    // allSettled, not all: one failed upload must not throw away the others
    // that succeeded.
    const done = await Promise.allSettled(files.map((f) => uploadFile(f, folder)));
    const added = done.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
    const failed = done.length - added.length;
    if (added.length > 0) onChange([...urls, ...added]);
    if (failed > 0) toast.error(failed === done.length ? 'Could not upload' : `${failed} of ${done.length} failed`);
    setBusy(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {urls.map((url, i) => (
          <div key={url} className="relative">
            <SafeImage src={url} alt="" className="size-16 rounded-lg object-cover border" />
            {i === 0 && (
              <span className="absolute bottom-0 inset-x-0 text-[9px] text-center bg-black/60 text-white rounded-b-lg">
                cover
              </span>
            )}
            <button
              type="button"
              onClick={() => onChange(urls.filter((u) => u !== url))}
              disabled={disabled}
              className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-background border flex items-center justify-center"
              aria-label="Remove photo"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}

        {room > 0 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || busy}
            className="size-16 rounded-lg border border-dashed flex items-center justify-center text-muted-foreground disabled:opacity-50"
            aria-label="Add photos"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {urls.length}/{max} · the first photo is the cover
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={pick}
      />
    </div>
  );
}
