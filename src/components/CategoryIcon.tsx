import { useMemo, useState } from 'react';
import { DynamicIcon, iconNames, type IconName } from 'lucide-react/dynamic';
import { Shapes, Search } from 'lucide-react';
import { Input } from './ui/input';

// All ~1600 lucide icon names, for search + validation. `iconNames` is a plain
// string array, so importing it is cheap — DynamicIcon lazy-loads the actual
// icon component only when rendered.
const ALL_ICONS = iconNames as unknown as string[];
const VALID = new Set<string>(ALL_ICONS);

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

// Renders any lucide icon by (possibly legacy) name, with a graceful fallback.
export function CategoryIcon({ icon, className = 'size-5' }: { icon?: string | null; className?: string }) {
  const name = toIconName(icon);
  if (!VALID.has(name)) return <Shapes className={className} />;
  return <DynamicIcon name={name as IconName} className={className} fallback={() => <Shapes className={className} />} />;
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
