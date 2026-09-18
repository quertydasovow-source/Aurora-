import opportunitiesJson from '../../data/opportunities.json' with { type: 'json' };
import type { Opportunity } from '../../data/opportunityTypes';

export function loadOpportunities(): Opportunity[] {
  const rows = (opportunitiesJson as { opportunities?: Opportunity[] }).opportunities;
  return Array.isArray(rows) ? rows : [];
}

export function findVerifiedOpportunity(id: string | null | undefined): Opportunity | null {
  if (!id) return null;
  return loadOpportunities().find((item) => item.id === id && item.verificationStatus === 'verified' && item.officialUrl) ?? null;
}
