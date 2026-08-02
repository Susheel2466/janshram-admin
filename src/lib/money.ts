// Money helpers. Backend stores integer paise; UI shows rupees.

export const paiseToRupees = (paise: number): number => paise / 100;
export const rupeesToPaise = (rupees: number): number => Math.round(rupees * 100);

// "₹500" — whole rupees, no decimals.
export const formatINR = (paise: number): string =>
  `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;

// "₹500.50" — with paise when non-zero.
export const formatINRPrecise = (paise: number): string => {
  const rupees = paise / 100;
  return `₹${rupees.toLocaleString('en-IN', { minimumFractionDigits: rupees % 1 === 0 ? 0 : 2 })}`;
};

// Compact "₹1.2L" / "₹3.4K" for dashboard tiles.
export const formatINRCompact = (paise: number): string => {
  const rupees = paise / 100;
  if (rupees >= 1e7) return `₹${(rupees / 1e7).toFixed(2)}Cr`;
  if (rupees >= 1e5) return `₹${(rupees / 1e5).toFixed(2)}L`;
  if (rupees >= 1e3) return `₹${(rupees / 1e3).toFixed(1)}K`;
  return `₹${Math.round(rupees).toLocaleString('en-IN')}`;
};
