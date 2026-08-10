import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Label } from './ui/label';
import { SearchInput } from './common';

export interface PickerOption {
  value: string;
  label: string;
}

/**
 * Search-and-pick field for referencing another record (a customer, a provider)
 * inside a form.
 *
 * A plain <select> would mean loading every user up front, so this queries the
 * API as the admin types and lists the matches. The chosen option is remembered
 * separately from the result list, so it stays visible after the query changes.
 */
export function PickerField({
  label,
  value,
  onChange,
  load,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  load: (query: string) => Promise<PickerOption[]>;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<PickerOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<PickerOption | null>(null);

  useEffect(() => {
    let live = true;
    setLoading(true);
    const t = setTimeout(() => {
      load(query)
        .then((rows) => { if (live) setOptions(rows); })
        .catch(() => { if (live) setOptions([]); })
        .finally(() => { if (live) setLoading(false); });
    }, 250); // debounce so each keystroke isn't a request
    return () => { live = false; clearTimeout(t); };
    // `load` is redefined every render by the caller; keying on the query alone
    // is what we want here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {picked && value === picked.value && (
          <span className="text-xs text-muted-foreground truncate max-w-[60%]">Selected: {picked.label}</span>
        )}
      </div>
      <SearchInput value={query} onChange={setQuery} placeholder={placeholder} />
      <div className="max-h-36 overflow-y-auto rounded-lg border divide-y">
        {loading && (
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> Searching…
          </div>
        )}
        {!loading && options.length === 0 && (
          <div className="px-3 py-2 text-sm text-muted-foreground">No matches</div>
        )}
        {!loading && options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => { onChange(o.value); setPicked(o); }}
            className={`w-full text-left px-3 py-2 text-sm transition-colors ${
              value === o.value ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
