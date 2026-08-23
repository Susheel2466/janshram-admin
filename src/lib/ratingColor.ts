// One rating, one colour — red at 1 star, green at 5. Mirrors the customer
// app's lib/ratingColor so a provider's rating looks the same in the console as
// it does to the customers who gave it.
//
// The scale climbs in lightness as well as hue, so it still reads as an ordered
// range without colour vision; the number is always shown alongside.

export interface Rgb { r: number; g: number; b: number; }

const SCALE: { at: number; rgb: Rgb }[] = [
  { at: 1, rgb: { r: 220, g: 38, b: 38 } },   // red-600
  { at: 2, rgb: { r: 234, g: 88, b: 12 } },   // orange-600
  { at: 3, rgb: { r: 245, g: 158, b: 11 } },  // amber-500
  { at: 4, rgb: { r: 132, g: 204, b: 22 } },  // lime-500
  { at: 5, rgb: { r: 22, g: 163, b: 74 } },   // green-600
];

export function ratingRgb(rating: number): Rgb {
  if (!Number.isFinite(rating)) return SCALE[SCALE.length - 1].rgb;
  const value = Math.min(5, Math.max(1, rating));
  for (let i = 0; i < SCALE.length - 1; i++) {
    const low = SCALE[i];
    const high = SCALE[i + 1];
    if (value > high.at) continue;
    const t = (value - low.at) / (high.at - low.at);
    return {
      r: Math.round(low.rgb.r + (high.rgb.r - low.rgb.r) * t),
      g: Math.round(low.rgb.g + (high.rgb.g - low.rgb.g) * t),
      b: Math.round(low.rgb.b + (high.rgb.b - low.rgb.b) * t),
    };
  }
  return SCALE[SCALE.length - 1].rgb;
}

export function ratingColor(rating: number): string {
  const { r, g, b } = ratingRgb(rating);
  return `rgb(${r}, ${g}, ${b})`;
}

export function ratingTint(rating: number, alpha = 0.12): string {
  const { r, g, b } = ratingRgb(rating);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function ratingLabel(rating: number): string {
  if (rating >= 4.5) return 'Excellent';
  if (rating >= 3.5) return 'Good';
  if (rating >= 2.5) return 'Average';
  if (rating >= 1.5) return 'Poor';
  return 'Very poor';
}
