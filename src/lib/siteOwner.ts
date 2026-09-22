// Who runs a site.
//
// A site used to be a contractor's by definition. Providers were then given
// sites of their own — Project.contractorId became nullable — and every screen
// that reached straight through `contractor` started finding null. This is the
// one place that asks, so the list and the detail cannot answer differently.

/**
 * The least a caller has to hand over. Structural rather than a Pick of
 * AdminProject, because the review list carries the same two relations with a
 * narrower user on them, and it is the same question either way.
 */
export interface OwnedSite {
  contractor?: { firmName: string | null; user?: { name: string | null; phone?: string | null } | null } | null;
  provider?: { user?: { name: string | null; phone?: string | null } | null } | null;
}

export interface SiteOwner {
  /** What to show. Never empty — an unowned site says so rather than rendering blank. */
  name: string;
  phone: string | null;
  /** Which side of the platform runs it, for the label under the name. */
  kind: 'Contractor' | 'Service provider' | null;
}

export function siteOwner(p: OwnedSite): SiteOwner {
  if (p.contractor) {
    return {
      name: p.contractor.firmName ?? p.contractor.user?.name ?? 'Contractor',
      phone: p.contractor.user?.phone ?? null,
      kind: 'Contractor',
    };
  }
  if (p.provider) {
    return {
      name: p.provider.user?.name ?? 'Service provider',
      phone: p.provider.user?.phone ?? null,
      kind: 'Service provider',
    };
  }
  // Neither: a site whose owner's account was deleted. Support still needs to
  // see the row — the wage record on it is the thing they were asked about.
  return { name: 'No owner on record', phone: null, kind: null };
}
