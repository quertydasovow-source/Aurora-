import type { RecItem, RecsResponse } from '../../api/recommendationsClient';
import type { Profile } from '../../types';
import { loadPrograms } from './catalogLoader.ts';
import { buildDevelopmentActions } from './developmentActions.ts';
import { filterPrograms, type RecommendationCandidate } from './filterPrograms.ts';

const LOCAL_MESSAGE =
  'Подбор готов. AI-пояснения сейчас недоступны, поэтому показываем основные причины выбора.';

function toPublicItem(candidate: RecommendationCandidate): RecItem {
  return {
    programId: candidate.programId,
    program: candidate.program,
    verdict: candidate.verdict,
    eligibility: candidate.eligibility,
    suitability: candidate.suitability,
    statusWhy: candidate.statusWhy,
    whyItFits: candidate.whyItFits,
    preparationAdvice: [],
    questionsToClarify: candidate.uncertainties.slice(0, 8),
    requirementsToComplete: candidate.requirementsToComplete,
    uncertainties: candidate.uncertainties,
    deadlineNote: candidate.deadlineNote,
    yearNote: candidate.yearNote,
    tuitionNote: candidate.tuitionNote,
    budgetComparable: candidate.budgetComparable,
    budgetStatus: candidate.budgetStatus,
    dataStatus: candidate.dataStatus,
    matchStatus: candidate.matchStatus,
    fitStatus: candidate.matchStatus === 'not_match' ? 'mismatch' : candidate.matchStatus,
  };
}

/** Same rule-based payload as Express fallback. Used when /api is missing (Netlify/Pages static). */
export function buildLocalRecommendations(profile: Profile, targetProgramId?: number | null): RecsResponse {
  const filtered = filterPrograms(profile, loadPrograms());
  const recommendations = filtered.candidates.map(toPublicItem);
  const preview = filtered.preview.map(toPublicItem);
  const related = (filtered.related || []).map(toPublicItem);
  const top =
    (targetProgramId != null &&
      [...filtered.candidates, ...filtered.preview].find((item) => item.programId === targetProgramId)) ||
    filtered.candidates[0] ||
    filtered.preview[0] ||
    null;

  return {
    mode: 'rules',
    aiAvailable: false,
    message: LOCAL_MESSAGE,
    groqErrorKind: 'none',
    profileSummary: `Поступление на бакалавриат по направлению «${filtered.fieldLabel}».`,
    strengths: [],
    constraints:
      filtered.candidates.length === 0 && filtered.preview.length === 0
        ? ['По текущим ответам в каталоге нет программ, которые можно показать как подходящие.']
        : [],
    missingInformation: [],
    recommendations,
    preview,
    related,
    nextAction: top
      ? {
          title: top.requirementsToComplete[0] || top.uncertainties[0] || 'Изучи требования выбранной программы',
          description: `${top.program.university} — ${top.program.program}.`,
          programId: top.programId,
        }
      : {
          title: 'Измени направление, страну или год',
          description: 'В каталоге нет программ, подходящих под текущие ответы анкеты.',
          programId: null,
        },
    candidatesMeta: {
      considered: filtered.candidates.length,
      preview: filtered.preview.length,
      excluded: filtered.excluded.length,
      archived: filtered.archived.length,
      graduate: filtered.graduateExcluded.length,
      otherFields: filtered.fieldMismatchCount,
    },
    developmentActions: buildDevelopmentActions(profile, top),
  };
}
