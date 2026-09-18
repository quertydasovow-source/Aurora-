import type { CountryPreference, Field } from '../types';

export type DirectionFit = 'primary' | 'related' | 'none';

/** Строгое соответствие анкеты полю «Направление» каталога. Интересы сюда не входят. */
const PRIMARY_DIRECTION: Record<Field, readonly string[]> = {
  it: ['IT', 'IT и бизнес', 'IT и инженерия'],
  engineering: ['Инженерия', 'IT и инженерия', 'Химическая инженерия'],
  business_management: ['Бизнес и менеджмент', 'IT и бизнес'],
  international_relations: ['Международные отношения', 'Международные отношения и регионоведение'],
  education_languages: ['Педагогика и иностранные языки'],
  natural_sciences: ['Естественные науки: химия'],
  psychology: ['Социальные науки: психология'],
};

/** Близкие категории — только по явной кнопке, не в основной выдаче. */
const RELATED_DIRECTION: Record<Field, readonly string[]> = {
  it: [],
  engineering: ['Естественные науки: химия'],
  business_management: [],
  international_relations: [],
  education_languages: [],
  natural_sciences: ['Химическая инженерия'],
  psychology: [],
};

const INTEREST_TOKENS: Array<{ keys: string[]; tokens: string[] }> = [
  { keys: ['программирован', 'код', 'it'], tokens: ['программ', 'информац', 'цифров', 'software'] },
  { keys: ['данн'], tokens: ['данн', 'анализ', 'data'] },
  { keys: ['инженер'], tokens: ['инженер', 'механик', 'техник'] },
  { keys: ['химия', 'химическ'], tokens: ['хим', 'лаборатор', 'естественн'] },
  { keys: ['психолог'], tokens: ['психолог', 'поведен'] },
  { keys: ['менеджмент', 'бизнес', 'стартап', 'маркетинг'], tokens: ['бизнес', 'менеджмент', 'маркетинг'] },
  { keys: ['диплом', 'политик', 'международ'], tokens: ['международ', 'диплом', 'политик'] },
  { keys: ['истори'], tokens: ['истори'] },
  { keys: ['язык', 'педагогик', 'преподав'], tokens: ['язык', 'педагогик', 'преподав'] },
];

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase();
}

function labelSet(labels: readonly string[]): Set<string> {
  return new Set(labels.map(normalizeLabel));
}

export function catalogFieldsForQuizField(field: Field): string[] {
  return [...PRIMARY_DIRECTION[field]];
}

export function relatedCatalogFields(field: Field): string[] {
  return [...RELATED_DIRECTION[field]];
}

/** Интересы намеренно игнорируются: они не расширяют фильтр направления. */
export function catalogLabelsForProfile(field: Field, _interests: string[] = []): string[] {
  return catalogFieldsForQuizField(field);
}

export function matchesSelectedDirection(programField: string, selectedDirection: Field): DirectionFit {
  const value = normalizeLabel(programField);
  if (!value) return 'none';
  if (labelSet(PRIMARY_DIRECTION[selectedDirection]).has(value)) return 'primary';
  if (labelSet(RELATED_DIRECTION[selectedDirection]).has(value)) return 'related';
  return 'none';
}

export function interestRankBonus(
  program: { field?: string; program?: string; curriculumSummary?: string },
  interests: string[],
): number {
  if (!interests.length) return 0;
  const blob = `${program.field || ''} ${program.program || ''} ${program.curriculumSummary || ''}`.toLowerCase();
  let bonus = 0;
  for (const interest of interests) {
    const raw = interest.trim().toLowerCase();
    if (raw.length < 3) continue;
    const rule = INTEREST_TOKENS.find((item) => item.keys.some((key) => raw.includes(key) || key.includes(raw)));
    const tokens = rule ? rule.tokens : [raw.slice(0, 6)];
    if (tokens.some((token) => token.length >= 3 && blob.includes(token))) bonus += 1;
  }
  return bonus;
}

export function countryMatches(programCountry: string, preference: CountryPreference): boolean {
  const country = (programCountry || '').toLowerCase();
  if (preference === 'any') return true;
  if (preference === 'kz') return country.includes('казахстан') && !country.includes('великобритан');
  if (preference === 'hungary') return country.includes('венгр');
  if (preference === 'netherlands') return country.includes('нидерланд');
  return false;
}
