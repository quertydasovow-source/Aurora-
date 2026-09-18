import type { CountryPreference, Field } from '../types';

/** Соответствие выбора анкеты текстовым направлениям каталога. */
export const FIELD_TO_CATALOG: Record<Field, string[]> = {
  it: ['IT', 'IT и инженерия', 'IT и бизнес'],
  engineering: ['Инженерия', 'IT и инженерия', 'Химическая инженерия'],
  business_management: ['Бизнес и менеджмент', 'IT и бизнес'],
  international_relations: ['Международные отношения', 'Международные отношения и регионоведение'],
  education_languages: ['Педагогика и иностранные языки'],
};

type InterestRule = { keys: string[]; fields: Field[] };

/** Свободный текст интересов сопоставляется с направлениями, а не с точной строкой каталога. */
const INTEREST_RULES: InterestRule[] = [
  { keys: ['программ', 'код', 'ит', 'it', 'компьютер', 'данн', 'ии', 'ai', 'software', 'информатик', 'цифров'], fields: ['it'] },
  { keys: ['инженер', 'механик', 'робот', 'аэрокосм', 'техник', 'химическ'], fields: ['engineering'] },
  { keys: ['бизнес', 'менеджмент', 'маркетинг', 'стартап', 'финанс', 'управлен'], fields: ['business_management'] },
  { keys: ['диплом', 'политик', 'международ', 'истори', 'междунар'], fields: ['international_relations'] },
  { keys: ['преподав', 'педагогик', 'иностранн', 'учитель', 'язык'], fields: ['education_languages', 'international_relations'] },
];

export function catalogFieldsForQuizField(field: Field): string[] {
  return FIELD_TO_CATALOG[field];
}

export function fieldsFromInterests(interests: string[]): Field[] {
  const found = new Set<Field>();
  for (const raw of interests) {
    const text = raw.trim().toLowerCase();
    if (!text) continue;
    for (const rule of INTEREST_RULES) {
      if (rule.keys.some((key) => text.includes(key))) {
        for (const field of rule.fields) found.add(field);
      }
    }
  }
  return [...found];
}

export function catalogLabelsForProfile(field: Field, interests: string[]): string[] {
  const labels = new Set<string>(catalogFieldsForQuizField(field));
  for (const extra of fieldsFromInterests(interests)) {
    for (const label of catalogFieldsForQuizField(extra)) labels.add(label);
  }
  return [...labels];
}

export function countryMatches(programCountry: string, preference: CountryPreference): boolean {
  const country = (programCountry || '').toLowerCase();
  if (preference === 'any') return true;
  if (preference === 'kz') return country.includes('казахстан') && !country.includes('великобритан');
  if (preference === 'hungary') return country.includes('венгр');
  if (preference === 'netherlands') return country.includes('нидерланд');
  return false;
}
