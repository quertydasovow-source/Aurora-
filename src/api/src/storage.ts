import type { Profile, StoredState } from './types';

const KEY = 'aurora-admission-state-v3';
const LEGACY_KEYS = ['aurora-admission-state-v2', 'aurora-admission-state-v1'];

const RESET_NOTICE =
  'Анкета Aurora обновилась. Старый профиль не удалось прочитать — заполни анкету заново.';

export const emptyState: StoredState = {
  profile: null,
  view: 'landing',
  quizStep: 0,
  journeyTab: 'summary',
  selectedIds: [],
  targetId: null,
  taskDone: {},
  extraPlanTasks: [],
  lastFingerprint: null,
  changeNote: null,
  resetNotice: null,
};

export const defaultProfileDraft: Profile = {
  classYear: '11',
  intakeYear: 2027,
  field: 'it',
  countryPreference: 'any',
  interests: [],
  gradeScale: 'five_point',
  gradeValue: 4,
  untStatus: 'unsure',
  untScore: null,
  untSubjects: [],
  englishLevel: 'unsure',
  ieltsStatus: 'not_taken',
  ieltsScore: null,
  satStatus: 'unsure',
  satTotal: null,
  satReadingWriting: null,
  satMath: null,
  satDate: null,
  toeflStatus: 'unsure',
  toeflType: 'ibt',
  toeflScale: 'ibt_120',
  toeflScore: null,
  toeflDate: null,
  languagePreference: 'any',
  tuitionBudgetKzt: 900000,
  needsFinancialAid: false,
};

export function withExamDefaults(value: Partial<Profile> & Pick<Profile, 'classYear' | 'field' | 'tuitionBudgetKzt'>): Profile {
  return {
    ...defaultProfileDraft,
    ...value,
    satStatus: value.satStatus ?? 'unsure',
    satTotal: value.satTotal ?? null,
    satReadingWriting: value.satReadingWriting ?? null,
    satMath: value.satMath ?? null,
    satDate: value.satDate ?? null,
    toeflStatus: value.toeflStatus ?? 'unsure',
    toeflType: value.toeflType ?? 'ibt',
    toeflScale: value.toeflScale ?? 'ibt_120',
    toeflScore: value.toeflScore ?? null,
    toeflDate: value.toeflDate ?? null,
    ieltsStatus: value.ieltsStatus ?? 'not_taken',
    ieltsScore: value.ieltsScore ?? null,
    untSubjects: value.untSubjects ?? [],
    interests: value.interests ?? [],
  };
}

function looksLikeCurrentProfile(value: unknown): value is Profile {
  if (!value || typeof value !== 'object') return false;
  const profile = value as Record<string, unknown>;
  return (
    typeof profile.tuitionBudgetKzt === 'number' &&
    typeof profile.untStatus === 'string' &&
    typeof profile.countryPreference === 'string' &&
    typeof profile.field === 'string' &&
    Array.isArray(profile.untSubjects)
  );
}

export function loadState(): StoredState {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return { ...emptyState, resetNotice: 'Не удалось прочитать сохранённые данные браузера. Профиль начат заново.' };
  }

  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if (parsed.profile === null) {
          return { ...emptyState, ...parsed, extraPlanTasks: parsed.extraPlanTasks || [], profile: null, resetNotice: null };
        }
        if (looksLikeCurrentProfile(parsed.profile)) {
          return {
            ...emptyState,
            ...parsed,
            extraPlanTasks: Array.isArray(parsed.extraPlanTasks) ? parsed.extraPlanTasks : [],
            journeyTab: parsed.journeyTab || 'summary',
            profile: withExamDefaults(parsed.profile),
            resetNotice: null,
          };
        }
      }
    } catch {
      // повреждённый JSON
    }
  }

  const hadAnyOldData =
    Boolean(raw) ||
    LEGACY_KEYS.some((key) => {
      try {
        return localStorage.getItem(key) != null;
      } catch {
        return false;
      }
    });

  try {
    localStorage.removeItem(KEY);
    LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {
    // localStorage недоступен
  }

  return { ...emptyState, resetNotice: hadAnyOldData ? RESET_NOTICE : null };
}

export function saveState(state: StoredState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // сайт продолжает работать без сохранения
  }
}
