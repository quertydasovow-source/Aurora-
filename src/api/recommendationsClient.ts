import type { DevelopmentAction, Profile } from '../types';
import type { RawProgram } from '../data/realCatalogTypes';

export type RecVerdict = 'matches' | 'needs_prep' | 'unknown';
export type RecEligibility = 'confirmed' | 'preview';

export type RecItem = {
  programId: number;
  program: RawProgram | null;
  verdict: RecVerdict;
  eligibility: RecEligibility;
  suitability: 'suitable' | 'preparation_needed' | 'clarification_needed' | 'not_suitable';
  statusWhy: string;
  whyItFits: string[];
  preparationAdvice: string[];
  questionsToClarify: string[];
  requirementsToComplete: string[];
  uncertainties: string[];
  deadlineNote: string;
  yearNote: string | null;
  tuitionNote: string;
  budgetComparable: boolean;
  budgetStatus?: 'within_budget' | 'over_budget' | 'unknown' | 'potentially_affordable_with_aid';
  dataStatus?:
    | 'confirmed_for_selected_year'
    | 'latest_known_conditions'
    | 'missing_details'
    | 'archived'
    | 'draft'
    | 'confirmed'
    | 'needs_clarification';
  matchStatus?: 'strong_match' | 'match' | 'possible_match' | 'not_match';
  fitStatus?: 'strong_match' | 'match' | 'possible_match' | 'mismatch';
};

export type RecsResponse = {
  mode: 'ai' | 'rules';
  aiAvailable: boolean;
  message?: string;
  groqErrorKind?: 'auth' | 'rate_limit' | 'model' | 'network' | 'invalid_response' | 'none';
  profileSummary: string;
  strengths: string[];
  constraints: string[];
  missingInformation: string[];
  recommendations: RecItem[];
  preview: RecItem[];
  related?: RecItem[];
  nextAction: { title: string; description: string; programId: number | null };
  developmentActions?: DevelopmentAction[];
  candidatesMeta?: {
    considered: number;
    preview: number;
    excluded: number;
    archived: number;
    graduate: number;
    otherFields: number;
  };
};

export async function requestRecommendations(
  profile: Profile,
  targetProgramId?: number | null,
  signal?: AbortSignal,
): Promise<RecsResponse> {
  try {
    const response = await fetch('/api/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile, targetProgramId: targetProgramId ?? null }),
      signal,
    });
    const data = await response.json().catch(() => null);
    if (response.ok && data && Array.isArray(data.recommendations)) {
      return data as RecsResponse;
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
  }
  const { buildLocalRecommendations } = await import('../lib/recommendations/localRecommendations');
  return buildLocalRecommendations(profile, targetProgramId);
}

export type ProfileAdviceResponse = {
  mode: 'ai' | 'rules';
  intro?: string;
  summary?: string;
  suggestions: DevelopmentAction[];
};

export async function requestProfileAdvice(
  profile: Profile,
  items: RecItem[],
  diagnostics?: { strengths?: string[]; gaps?: string[]; thingsToClarify?: string[] },
  signal?: AbortSignal,
): Promise<ProfileAdviceResponse> {
  const response = await fetch('/api/profile-advice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profile,
      diagnostics,
      items: items.slice(0, 4).map((item) => ({
        program: item.program
          ? { program: item.program.program, university: item.program.university, field: item.program.field }
          : null,
        requirementsToComplete: item.requirementsToComplete,
        whyItFits: item.whyItFits,
      })),
    }),
    signal,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data || !Array.isArray(data.suggestions)) {
    return { mode: 'rules', intro: '', suggestions: [] };
  }
  return data as ProfileAdviceResponse;
}
