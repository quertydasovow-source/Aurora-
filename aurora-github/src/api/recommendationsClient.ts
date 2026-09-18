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
  const response = await fetch('/api/recommendations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile, targetProgramId: targetProgramId ?? null }),
    signal,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(typeof data?.notice === 'string' ? data.notice : 'Сервер рекомендаций ответил с ошибкой.');
  }
  if (!data) throw new Error('Сервер рекомендаций вернул пустой ответ.');
  return data as RecsResponse;
}
