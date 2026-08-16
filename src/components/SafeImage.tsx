import { useState } from 'react';
import { ImageOff } from 'lucide-react';

/**
 * A photo, attachment or document thumbnail with something sensible to show
 * when there isn't one.
 *
 * `<img src={undefined}>` renders the browser's broken-image glyph, and a stored
 * URL that no longer resolves does the same — which happens here for anything
 * uploaded before the move off R2. Both cases now draw a muted tile instead, so
 * a missing photo reads as "none uploaded" rather than "this console is broken".
 *
 * Avatars don't use this: they go through `UserCell`, whose Radix Avatar already
 * falls back to the person's initials.
 */
export function SafeImage({
  src,
  alt,
  className = '',
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-muted ${className}`}
        aria-label={alt}
        role="img"
      >
        <ImageOff className="size-4 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
