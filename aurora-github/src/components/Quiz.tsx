import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  countryPreferenceLabels,
  englishLabels,
  examStatusLabels,
  fieldLabels,
  languagePreferenceLabels,
  scaleLabels,
  scaleShort,
  toeflScaleLabels,
  toeflTypeLabels,
} from '../data/labels';
import { scaleBounds as boundsOf } from '../logic/grades';
import { CLASS_YEARS, COUNTRY_PREFERENCES, ENGLISH_LEVELS, FIELDS, GRADE_SCALES, TOEFL_SCALES, TOEFL_TYPES, UNT_SUBJECTS } from '../types';
import type { CountryPreference, ExamStatus, Field, LanguagePreference, Profile, ToeflScale, ToeflType, UntSubject } from '../types';
import { HomeButton } from './Shell';

const STEPS = ['О тебе', 'Подготовка', 'Пожелания', 'Проверка'] as const;
const STEP_TITLES = [
  'Давай познакомимся.',
  'Что уже есть в твоём багаже?',
  'Какие условия тебе подходят?',
  'Всё верно? Построим маршрут.',
];
const INTAKE_YEARS = [2026, 2027, 2028, 2029, 2030, 2031];

const FIELD_HINTS: Record<Field, string> = {
  it: 'Программирование, данные, цифровые системы.',
  engineering: 'Механика, техника, инженерные программы.',
  business_management: 'Менеджмент, маркетинг, стартапы.',
  international_relations: 'Дипломатия, политика, регионы.',
  education_languages: 'Педагогика и иностранные языки.',
};

const INTEREST_CHIPS = [
  'программирование',
  'данные',
  'инженерия',
  'менеджмент',
  'стартапы',
  'маркетинг',
  'дипломатия',
  'история',
  'языки',
  'педагогика',
];

const EXAM_CHOICES: ExamStatus[] = ['not_taken', 'planning', 'taken', 'unsure'];
const LANGUAGE_PREF_CHOICES: LanguagePreference[] = ['any', 'kz', 'ru', 'en'];

type FieldError = { field: string; message: string };

type Props = {
  value: Profile;
  step: number;
  onStep: (step: number) => void;
  onChange: (profile: Profile) => void;
  onBackHome: () => void;
  onSubmit: () => void;
};

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id?: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0" aria-describedby={id ? `${id}-hint` : undefined}>
      <legend className="px-0 text-sm font-semibold text-ink">{label}</legend>
      {hint ? (
        <p id={id ? `${id}-hint` : undefined} className="mt-1 text-sm text-muted">
          {hint}
        </p>
      ) : null}
      <div className="mt-3">{children}</div>
      {error ? (
        <p className="mt-2 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

function SelectedMark({ on }: { on: boolean }) {
  return (
    <span
      className={`ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
        on ? 'bg-on-accent text-accent' : 'border border-line text-muted'
      }`}
      aria-hidden="true"
    >
      {on ? '✓' : ''}
    </span>
  );
}

export function Quiz({ value, step, onStep, onChange, onBackHome, onSubmit }: Props) {
  const [error, setError] = useState<FieldError | null>(null);
  const [interestDraft, setInterestDraft] = useState('');
  const [saved, setSaved] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const bounds = useMemo(() => boundsOf(value.gradeScale), [value.gradeScale]);

  useEffect(() => {
    headingRef.current?.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  function persist(next: Profile) {
    onChange(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  }

  function set<K extends keyof Profile>(key: K, next: Profile[K]) {
    persist({ ...value, [key]: next });
    if (error) setError(null);
  }

  function toggleInterest(item: string) {
    if (value.interests.includes(item)) {
      set('interests', value.interests.filter((i) => i !== item));
    } else if (value.interests.length < 6) {
      set('interests', [...value.interests, item]);
    }
  }

  function toggleSubject(subject: UntSubject) {
    if (value.untSubjects.includes(subject)) {
      set('untSubjects', value.untSubjects.filter((s) => s !== subject));
      return;
    }
    if (value.untSubjects.length >= 2) {
      set('untSubjects', [value.untSubjects[1], subject]);
      return;
    }
    set('untSubjects', [...value.untSubjects, subject]);
  }

  function validate(current: number): FieldError | null {
    if (current === 1) {
      if (Number.isNaN(value.gradeValue)) return { field: 'gradeValue', message: 'Укажи средний балл.' };
      if (value.gradeValue < bounds.min || value.gradeValue > bounds.max) {
        return { field: 'gradeValue', message: `Для этой шкалы допустимо ${bounds.min}–${bounds.max}.` };
      }
      if (value.untStatus === 'taken') {
        if (value.untScore == null || Number.isNaN(value.untScore)) {
          return { field: 'untScore', message: 'Укажи балл ЕНТ — ты выбрал(а) статус «есть результат».' };
        }
        if (value.untScore < 0 || value.untScore > 140) {
          return { field: 'untScore', message: 'ЕНТ оценивается от 0 до 140.' };
        }
      }
      if (value.ieltsStatus === 'taken') {
        if (value.ieltsScore == null || Number.isNaN(value.ieltsScore)) {
          return { field: 'ieltsScore', message: 'Укажи балл IELTS — ты выбрал(а) статус «есть результат».' };
        }
        if (value.ieltsScore < 0 || value.ieltsScore > 9) {
          return { field: 'ieltsScore', message: 'IELTS бывает от 0 до 9.' };
        }
      }
      if (value.satStatus === 'taken') {
        if (value.satTotal == null || Number.isNaN(value.satTotal)) {
          return { field: 'satTotal', message: 'Укажи общий балл SAT — ты выбрал(а) статус «есть результат».' };
        }
        if (value.satTotal < 400 || value.satTotal > 1600) {
          return { field: 'satTotal', message: 'Общий балл SAT бывает от 400 до 1600.' };
        }
        if (value.satReadingWriting != null && (value.satReadingWriting < 200 || value.satReadingWriting > 800)) {
          return { field: 'satReadingWriting', message: 'Reading and Writing — от 200 до 800.' };
        }
        if (value.satMath != null && (value.satMath < 200 || value.satMath > 800)) {
          return { field: 'satMath', message: 'Math — от 200 до 800.' };
        }
        if (
          value.satReadingWriting != null &&
          value.satMath != null &&
          value.satReadingWriting + value.satMath !== value.satTotal
        ) {
          return {
            field: 'satTotal',
            message: 'Если заполнены обе секции, их сумма должна совпадать с общим баллом SAT.',
          };
        }
      }
      if (value.toeflStatus === 'taken') {
        if (value.toeflScore == null || Number.isNaN(value.toeflScore)) {
          return { field: 'toeflScore', message: 'Укажи результат TOEFL — ты выбрал(а) статус «есть результат».' };
        }
        if (value.toeflType === 'ibt' && value.toeflScale === 'ibt_120' && (value.toeflScore < 0 || value.toeflScore > 120)) {
          return { field: 'toeflScore', message: 'TOEFL iBT по шкале 0–120: укажи балл от 0 до 120.' };
        }
        if (value.toeflType === 'ibt' && value.toeflScale === 'ibt_16' && (value.toeflScore < 1 || value.toeflScore > 6)) {
          return { field: 'toeflScore', message: 'TOEFL iBT по шкале 1–6: укажи оценку от 1 до 6 с шагом 0.5.' };
        }
        if (value.toeflType === 'pbt' && (value.toeflScore < 310 || value.toeflScore > 677)) {
          return { field: 'toeflScore', message: 'TOEFL PBT обычно оценивается от 310 до 677. Шкалу iBT с PBT не смешиваем.' };
        }
      }
    }
    if (current === 2) {
      if (!value.tuitionBudgetKzt || value.tuitionBudgetKzt < 100000) {
        return { field: 'budget', message: 'Укажи годовой бюджет не ниже 100 000 ₸.' };
      }
    }
    return null;
  }

  function next() {
    const message = validate(step);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    if (step >= STEPS.length - 1) {
      onSubmit();
      return;
    }
    onStep(step + 1);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)_240px]">
      <aside className="hidden lg:block">
        <nav aria-label="Шаги анкеты" className="sticky top-28 space-y-2">
          {STEPS.map((label, index) => (
            <button
              key={label}
              type="button"
              className={`flex w-full items-center gap-3 rounded-[14px] border px-3 py-2.5 text-left text-sm ${
                index === step
                  ? 'border-accent-2 bg-card text-ink'
                  : index < step
                    ? 'border-line text-muted hover:border-accent'
                    : 'border-transparent text-muted'
              }`}
              onClick={() => {
                if (index < step) onStep(index);
              }}
              disabled={index > step}
            >
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  index === step ? 'bg-accent text-on-accent' : 'bg-section text-muted'
                }`}
              >
                {index + 1}
              </span>
              {label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="min-w-0">
        <HomeButton onClick={onBackHome} />
        <p className="mt-4 text-sm font-medium tracking-[0.08em] text-muted uppercase">
          Шаг {step + 1} из {STEPS.length} · {STEPS[step]}
        </p>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="mt-2 text-3xl font-bold tracking-tight text-ink outline-none sm:text-4xl"
        >
          {STEP_TITLES[step]}
        </h1>
        <div className="mt-4 flex gap-1 lg:hidden" aria-hidden="true">
          {STEPS.map((label, index) => (
            <div key={label} className={`h-1.5 flex-1 rounded-full ${index <= step ? 'bg-accent' : 'bg-line'}`} />
          ))}
        </div>
        <p className={`mt-3 text-xs ${saved ? 'text-accent' : 'text-muted'}`} aria-live="polite">
          {saved ? 'Ответы сохранены' : 'Ответы сохраняются после каждого изменения.'}
        </p>

        <div className="mt-8 space-y-10 rounded-[16px] border border-line bg-card p-5 sm:p-8 page-enter">
          {step === 0 && (
            <>
              <Field label="Класс" hint="Включая 12-й, если твоя школа так называет выпускной год.">
                <div className="grid grid-cols-4 gap-2">
                  {CLASS_YEARS.map((year) => {
                    const on = value.classYear === year;
                    return (
                      <button
                        key={year}
                        type="button"
                        aria-pressed={on}
                        className={`rounded-[14px] border px-3 py-2.5 text-sm ${
                          on ? 'border-accent bg-accent text-on-accent' : 'border-line'
                        }`}
                        onClick={() => set('classYear', year)}
                      >
                        {year}
                        {on ? <span className="sr-only">, выбрано</span> : null}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <Field label="Год поступления">
                <label className="sr-only" htmlFor="intakeYear">
                  Год поступления
                </label>
                <select
                  id="intakeYear"
                  className="quiz-input"
                  value={value.intakeYear}
                  onChange={(e) => set('intakeYear', Number(e.target.value))}
                >
                  {INTAKE_YEARS.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Направление" hint="Список собран по бакалаврским программам каталога.">
                <div className="grid gap-3 sm:grid-cols-2">
                  {FIELDS.map((field) => {
                    const on = value.field === field;
                    return (
                      <button
                        key={field}
                        type="button"
                        aria-pressed={on}
                        className={`rounded-[16px] border p-4 text-left ${
                          on ? 'border-accent bg-accent-soft' : 'border-line bg-section'
                        }`}
                        onClick={() => set('field', field)}
                      >
                        <span className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-ink">{fieldLabels[field]}</span>
                          <SelectedMark on={on} />
                        </span>
                        <span className="mt-2 block text-sm text-muted">{FIELD_HINTS[field]}</span>
                        {on ? <span className="mt-2 block text-xs font-semibold text-accent">Выбрано</span> : null}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <Field label="Интересы" hint="Необязательно. Можно выбрать готовые теги или добавить свой.">
                <div className="flex flex-wrap gap-2">
                  {INTEREST_CHIPS.map((chip) => {
                    const on = value.interests.includes(chip);
                    return (
                      <button
                        key={chip}
                        type="button"
                        aria-pressed={on}
                        className={`rounded-full border px-3 py-1.5 text-sm ${
                          on ? 'border-accent bg-accent text-on-accent' : 'border-line'
                        }`}
                        onClick={() => toggleInterest(chip)}
                      >
                        {on ? '✓ ' : ''}
                        {chip}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex gap-2">
                  <label className="sr-only" htmlFor="customInterest">
                    Свой интерес
                  </label>
                  <input
                    id="customInterest"
                    className="quiz-input"
                    value={interestDraft}
                    onChange={(e) => setInterestDraft(e.target.value)}
                    placeholder="Свой интерес"
                  />
                  <button
                    type="button"
                    className="rounded-[14px] border border-line px-4"
                    onClick={() => {
                      const item = interestDraft.trim();
                      if (item) toggleInterest(item);
                      setInterestDraft('');
                    }}
                  >
                    Добавить
                  </button>
                </div>
              </Field>
            </>
          )}

          {step === 1 && (
            <>
              <div className="grid gap-6 sm:grid-cols-2">
                <Field label="Шкала оценок аттестата">
                  <label className="sr-only" htmlFor="gradeScale">
                    Шкала оценок
                  </label>
                  <select
                    id="gradeScale"
                    className="quiz-input"
                    value={value.gradeScale}
                    onChange={(e) => set('gradeScale', e.target.value as Profile['gradeScale'])}
                  >
                    {GRADE_SCALES.map((scale) => (
                      <option key={scale} value={scale}>
                        {scaleLabels[scale]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  id="gradeValue"
                  label={`Средний балл (${scaleShort[value.gradeScale]})`}
                  hint="Пересчёт между шкалами — внутреннее правило Aurora, не официальный эквивалент вуза."
                  error={error?.field === 'gradeValue' ? error.message : undefined}
                >
                  <label className="sr-only" htmlFor="gradeValue">
                    Средний балл
                  </label>
                  <input
                    id="gradeValue"
                    className="quiz-input"
                    type="number"
                    min={bounds.min}
                    max={bounds.max}
                    step={bounds.step}
                    value={value.gradeValue}
                    onChange={(e) => set('gradeValue', Number(e.target.value))}
                  />
                </Field>
              </div>

              <div className="space-y-4 rounded-[16px] border border-line bg-section p-4">
                <Field label="ЕНТ" hint="Оценки из разных шкал мы не сравниваем напрямую.">
                  <ChoiceRow
                    options={EXAM_CHOICES}
                    value={value.untStatus}
                    labels={examStatusLabels}
                    onPick={(v) => persist({ ...value, untStatus: v, untScore: v === 'taken' ? value.untScore : null })}
                  />
                </Field>
                {value.untStatus === 'taken' && (
                  <Field
                    id="untScore"
                    label="Балл ЕНТ (0–140)"
                    error={error?.field === 'untScore' ? error.message : undefined}
                  >
                    <label className="sr-only" htmlFor="untScore">
                      Балл ЕНТ
                    </label>
                    <input
                      id="untScore"
                      className="quiz-input"
                      type="number"
                      min={0}
                      max={140}
                      value={value.untScore ?? ''}
                      onChange={(e) => set('untScore', e.target.value === '' ? null : Number(e.target.value))}
                    />
                  </Field>
                )}
                <Field label="Профильные предметы ЕНТ" hint="Выбери до двух. Необязательно, если пока не решил(а).">
                  <div className="flex flex-wrap gap-2">
                    {UNT_SUBJECTS.map((subject) => {
                      const on = value.untSubjects.includes(subject);
                      return (
                        <button
                          key={subject}
                          type="button"
                          aria-pressed={on}
                          className={`rounded-full border px-3 py-1.5 text-sm ${
                            on ? 'border-accent bg-accent text-on-accent' : 'border-line'
                          }`}
                          onClick={() => toggleSubject(subject)}
                        >
                          {on ? '✓ ' : ''}
                          {subject}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              </div>

              <div className="space-y-4 rounded-[16px] border border-line bg-section p-4">
                <Field label="Уровень английского" hint="Это самооценка, не сертификат.">
                  <label className="sr-only" htmlFor="englishLevel">
                    Уровень английского
                  </label>
                  <select
                    id="englishLevel"
                    className="quiz-input"
                    value={value.englishLevel}
                    onChange={(e) => set('englishLevel', e.target.value as Profile['englishLevel'])}
                  >
                    {ENGLISH_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {englishLabels[level]}
                      </option>
                    ))}
                    <option value="unsure">{englishLabels.unsure}</option>
                  </select>
                </Field>
                <Field label="IELTS" hint="Отдельно от самооценки уровня.">
                  <ChoiceRow
                    options={EXAM_CHOICES}
                    value={value.ieltsStatus}
                    labels={examStatusLabels}
                    onPick={(v) => persist({ ...value, ieltsStatus: v, ieltsScore: v === 'taken' ? value.ieltsScore : null })}
                  />
                </Field>
                {value.ieltsStatus === 'taken' && (
                  <Field
                    id="ieltsScore"
                    label="Балл IELTS (0–9)"
                    error={error?.field === 'ieltsScore' ? error.message : undefined}
                  >
                    <label className="sr-only" htmlFor="ieltsScore">
                      Балл IELTS
                    </label>
                    <input
                      id="ieltsScore"
                      className="quiz-input"
                      type="number"
                      min={0}
                      max={9}
                      step={0.5}
                      value={value.ieltsScore ?? ''}
                      onChange={(e) => set('ieltsScore', e.target.value === '' ? null : Number(e.target.value))}
                    />
                  </Field>
                )}
              </div>

              <div className="space-y-4 rounded-[16px] border border-line bg-section p-4">
                <Field
                  label="SAT"
                  hint="Необязательно для всех программ. Для части вузов SAT относится к отдельному пути поступления."
                >
                  <ChoiceRow
                    options={EXAM_CHOICES}
                    value={value.satStatus}
                    labels={examStatusLabels}
                    onPick={(v) =>
                      persist({
                        ...value,
                        satStatus: v,
                        satTotal: v === 'taken' ? value.satTotal : null,
                        satReadingWriting: v === 'taken' ? value.satReadingWriting : null,
                        satMath: v === 'taken' ? value.satMath : null,
                        satDate: v === 'taken' ? value.satDate : null,
                      })
                    }
                  />
                </Field>
                {value.satStatus === 'taken' && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field
                      id="satTotal"
                      label="Общий балл SAT (400–1600)"
                      error={error?.field === 'satTotal' ? error.message : undefined}
                    >
                      <input
                        id="satTotal"
                        className="quiz-input"
                        type="number"
                        min={400}
                        max={1600}
                        value={value.satTotal ?? ''}
                        onChange={(e) => set('satTotal', e.target.value === '' ? null : Number(e.target.value))}
                      />
                    </Field>
                    <Field id="satDate" label="Дата сдачи, если известна">
                      <input
                        id="satDate"
                        className="quiz-input"
                        type="date"
                        value={value.satDate ?? ''}
                        onChange={(e) => set('satDate', e.target.value || null)}
                      />
                    </Field>
                    <Field
                      id="satReadingWriting"
                      label="Reading and Writing (необязательно, 200–800)"
                      error={error?.field === 'satReadingWriting' ? error.message : undefined}
                    >
                      <input
                        id="satReadingWriting"
                        className="quiz-input"
                        type="number"
                        min={200}
                        max={800}
                        value={value.satReadingWriting ?? ''}
                        onChange={(e) => set('satReadingWriting', e.target.value === '' ? null : Number(e.target.value))}
                      />
                    </Field>
                    <Field
                      id="satMath"
                      label="Math (необязательно, 200–800)"
                      error={error?.field === 'satMath' ? error.message : undefined}
                    >
                      <input
                        id="satMath"
                        className="quiz-input"
                        type="number"
                        min={200}
                        max={800}
                        value={value.satMath ?? ''}
                        onChange={(e) => set('satMath', e.target.value === '' ? null : Number(e.target.value))}
                      />
                    </Field>
                  </div>
                )}
              </div>

              <div className="space-y-4 rounded-[16px] border border-line bg-section p-4">
                <Field
                  label="TOEFL"
                  hint="Можно указать вместе с IELTS. Форматы не смешиваем: iBT — не то же самое, что PBT. Самооценка английского сертификат не заменяет."
                >
                  <ChoiceRow
                    options={EXAM_CHOICES}
                    value={value.toeflStatus}
                    labels={examStatusLabels}
                    onPick={(v) =>
                      persist({
                        ...value,
                        toeflStatus: v,
                        toeflScore: v === 'taken' ? value.toeflScore : null,
                        toeflDate: v === 'taken' ? value.toeflDate : null,
                      })
                    }
                  />
                </Field>
                {value.toeflStatus === 'taken' && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Вид теста">
                      <select
                        className="quiz-input"
                        value={value.toeflType}
                        onChange={(e) => set('toeflType', e.target.value as ToeflType)}
                      >
                        {TOEFL_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {toeflTypeLabels[type]}
                          </option>
                        ))}
                      </select>
                    </Field>
                    {value.toeflType === 'ibt' ? (
                      <Field label="Шкала результата ETS">
                        <select
                          className="quiz-input"
                          value={value.toeflScale}
                          onChange={(e) => set('toeflScale', e.target.value as ToeflScale)}
                        >
                          {TOEFL_SCALES.map((scale) => (
                            <option key={scale} value={scale}>
                              {toeflScaleLabels[scale]}
                            </option>
                          ))}
                        </select>
                      </Field>
                    ) : (
                      <p className="self-end text-sm text-muted">
                        Для этого формата Aurora не пересчитывает результат в шкалу iBT.
                      </p>
                    )}
                    <Field
                      id="toeflScore"
                      label={
                        value.toeflType === 'ibt' && value.toeflScale === 'ibt_16'
                          ? 'Оценка iBT (1–6)'
                          : value.toeflType === 'ibt'
                            ? 'Балл iBT (0–120)'
                            : 'Результат по шкале выбранного формата'
                      }
                      error={error?.field === 'toeflScore' ? error.message : undefined}
                    >
                      <input
                        id="toeflScore"
                        className="quiz-input"
                        type="number"
                        min={value.toeflType === 'ibt' && value.toeflScale === 'ibt_16' ? 1 : value.toeflType === 'pbt' ? 310 : 0}
                        max={value.toeflType === 'ibt' && value.toeflScale === 'ibt_16' ? 6 : value.toeflType === 'ibt' ? 120 : 677}
                        step={value.toeflType === 'ibt' && value.toeflScale === 'ibt_16' ? 0.5 : 1}
                        value={value.toeflScore ?? ''}
                        onChange={(e) => set('toeflScore', e.target.value === '' ? null : Number(e.target.value))}
                      />
                    </Field>
                    <Field id="toeflDate" label="Дата сдачи, если известна">
                      <input
                        id="toeflDate"
                        className="quiz-input"
                        type="date"
                        value={value.toeflDate ?? ''}
                        onChange={(e) => set('toeflDate', e.target.value || null)}
                      />
                    </Field>
                  </div>
                )}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <Field
                id="budget"
                label="Годовой бюджет на обучение"
                hint="Только стоимость обучения, без проживания."
                error={error?.field === 'budget' ? error.message : undefined}
              >
                <label className="sr-only" htmlFor="budget">
                  Годовой бюджет в тенге
                </label>
                <input
                  id="budget"
                  className="quiz-input"
                  type="number"
                  min={100000}
                  step={10000}
                  value={value.tuitionBudgetKzt}
                  onChange={(e) => set('tuitionBudgetKzt', Number(e.target.value))}
                />
                <p className="mt-2 text-sm text-ink">
                  {value.tuitionBudgetKzt.toLocaleString('ru-RU')} ₸ в год
                </p>
              </Field>
              <Field label="Страна обучения" hint="В каталоге сейчас Казахстан, Венгрия и Нидерланды.">
                <ChoiceRow
                  options={[...COUNTRY_PREFERENCES]}
                  value={value.countryPreference}
                  labels={countryPreferenceLabels}
                  onPick={(v) => set('countryPreference', v as CountryPreference)}
                />
              </Field>
              <Field label="Предпочтительный язык обучения" hint="Это предпочтение, а не жёсткое требование.">
                <ChoiceRow
                  options={LANGUAGE_PREF_CHOICES}
                  value={value.languagePreference}
                  labels={languagePreferenceLabels}
                  onPick={(v) => set('languagePreference', v)}
                />
              </Field>
              <Field label="Нужна финансовая помощь?" hint="Грант, скидка или стипендия.">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    aria-pressed={!value.needsFinancialAid}
                    className={`rounded-[14px] border px-3 py-2.5 text-sm ${
                      !value.needsFinancialAid ? 'border-accent bg-accent text-on-accent' : 'border-line'
                    }`}
                    onClick={() => set('needsFinancialAid', false)}
                  >
                    Нет
                    {!value.needsFinancialAid ? ' · выбрано' : ''}
                  </button>
                  <button
                    type="button"
                    aria-pressed={value.needsFinancialAid}
                    className={`rounded-[14px] border px-3 py-2.5 text-sm ${
                      value.needsFinancialAid ? 'border-accent bg-accent text-on-accent' : 'border-line'
                    }`}
                    onClick={() => set('needsFinancialAid', true)}
                  >
                    Да
                    {value.needsFinancialAid ? ' · выбрано' : ''}
                  </button>
                </div>
              </Field>
            </>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <ReviewBlock title="О тебе" onEdit={() => onStep(0)}>
                <Row label="Класс" value={`${value.classYear} класс, набор ${value.intakeYear}`} />
                <Row label="Направление" value={fieldLabels[value.field]} />
                <Row label="Страна" value={countryPreferenceLabels[value.countryPreference]} />
                <Row label="Интересы" value={value.interests.join(', ') || 'не указаны'} />
              </ReviewBlock>
              <ReviewBlock title="Подготовка" onEdit={() => onStep(1)}>
                <Row label="Средний балл" value={`${value.gradeValue} (${scaleLabels[value.gradeScale]})`} />
                <Row
                  label="ЕНТ"
                  value={
                    value.untStatus === 'taken'
                      ? `есть результат, ${value.untScore ?? '—'} из 140`
                      : examStatusLabels[value.untStatus]
                  }
                />
                <Row label="Английский" value={englishLabels[value.englishLevel]} />
                <Row
                  label="IELTS"
                  value={
                    value.ieltsStatus === 'taken'
                      ? `есть результат, ${value.ieltsScore ?? '—'}`
                      : examStatusLabels[value.ieltsStatus]
                  }
                />
                <Row
                  label="SAT"
                  value={
                    value.satStatus === 'taken'
                      ? `есть результат, ${value.satTotal ?? '—'} из 1600${
                          value.satReadingWriting != null && value.satMath != null
                            ? ` (RW ${value.satReadingWriting}, Math ${value.satMath})`
                            : ''
                        }`
                      : examStatusLabels[value.satStatus]
                  }
                />
                <Row
                  label="TOEFL"
                  value={
                    value.toeflStatus === 'taken'
                      ? `${toeflTypeLabels[value.toeflType]}, ${value.toeflScore ?? '—'} (${
                          value.toeflType === 'ibt' ? toeflScaleLabels[value.toeflScale] : 'своя шкала формата'
                        })`
                      : examStatusLabels[value.toeflStatus]
                  }
                />
              </ReviewBlock>
              <ReviewBlock title="Пожелания" onEdit={() => onStep(2)}>
                <Row label="Бюджет" value={`${value.tuitionBudgetKzt.toLocaleString('ru-RU')} ₸ в год`} />
                <Row label="Язык обучения" value={languagePreferenceLabels[value.languagePreference]} />
                <Row label="Финансовая помощь" value={value.needsFinancialAid ? 'нужна' : 'не нужна'} />
              </ReviewBlock>
            </div>
          )}

          {error && step !== 1 && step !== 2 ? (
            <p className="rounded-[14px] bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
              {error.message}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              className="rounded-[14px] border border-line px-5 py-2.5 disabled:opacity-40"
              disabled={step === 0}
              onClick={() => {
                setError(null);
                onStep(Math.max(0, step - 1));
              }}
            >
              Назад
            </button>
            <button
              type="button"
              className="btn-primary px-5 py-2.5"
              onClick={next}
            >
              {step === STEPS.length - 1 ? 'Показать мой маршрут' : 'Далее'}
            </button>
          </div>
        </div>
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-28 rounded-[20px] border border-line bg-card p-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Уже известно</p>
          <ul className="mt-3 space-y-2 text-muted">
            <li>{value.classYear} класс · {value.intakeYear}</li>
            <li>{fieldLabels[value.field]}</li>
            <li>{countryPreferenceLabels[value.countryPreference]}</li>
            <li>{value.tuitionBudgetKzt.toLocaleString('ru-RU')} ₸ в год</li>
            <li>{languagePreferenceLabels[value.languagePreference]}</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

function ChoiceRow<T extends string>({
  options,
  value,
  labels,
  onPick,
}: {
  options: T[];
  value: T;
  labels: Record<T, string>;
  onPick: (v: T) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((opt) => {
        const on = value === opt;
        return (
          <button
            key={opt}
            type="button"
            aria-pressed={on}
            className={`flex items-center justify-between rounded-[14px] border px-3 py-2.5 text-left text-sm ${
              on ? 'border-accent bg-accent text-on-accent' : 'border-line'
            }`}
            onClick={() => onPick(opt)}
          >
            <span>{labels[opt]}</span>
            <SelectedMark on={on} />
          </button>
        );
      })}
    </div>
  );
}

function ReviewBlock({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[20px] border border-line bg-section p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        <button type="button" className="text-sm font-semibold text-accent underline" onClick={onEdit}>
          Изменить
        </button>
      </div>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 text-ink">{value}</dd>
    </div>
  );
}
