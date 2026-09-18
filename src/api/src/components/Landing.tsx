import { useState, type ReactNode } from 'react';
import catalog from '../data/catalog.json';
import { demoProfiles } from '../data/demoProfiles';
import { SCOPE_NOTE } from '../data/labels';
import type { Profile } from '../types';

type Props = {
  groqMode: string;
  hasProfile: boolean;
  hasRoute: boolean;
  onStart: () => void;
  onContinue: () => void;
  onOpenRoute: () => void;
  onRestart: () => void;
  onDemo: (profile: Profile) => void;
};

const previewProgram = catalog.programs.find((program) => program.id === 2) ?? catalog.programs[0];

const VALUE_CARDS = [
  {
    title: 'Варианты с объяснением',
    text: 'Посмотри, какие программы соответствуют выбранному направлению и бюджету, а какие требования ещё предстоит выполнить.',
    big: true,
  },
  {
    title: 'Сравнение по важному',
    text: 'Сопоставь стоимость, язык обучения, экзамены и доступные сведения о поступлении.',
  },
  {
    title: 'План подготовки',
    text: 'Собери экзамены, документы и другие задачи в последовательный маршрут.',
  },
  {
    title: 'Следующий шаг',
    text: 'Выбери конкретное действие, отметь выполнение и продолжай двигаться к цели.',
  },
];

const HOW_IT_WORKS = [
  { title: 'Расскажи о себе', text: 'Укажи интересы, результаты, сроки и бюджет.' },
  { title: 'Изучи варианты', text: 'Посмотри рекомендации и объяснение для каждой программы.' },
  { title: 'Сравни и выбери', text: 'Определи, какие условия важнее именно тебе.' },
  { title: 'Двигайся по плану', text: 'Выполняй задачи и отслеживай свой прогресс.' },
];

const DATA_POINTS = [
  'Объясняем связь рекомендаций с твоими ответами.',
  'Отмечаем сведения, которые нужно уточнить.',
  'Разделяем требования вузов и рекомендации по подготовке.',
];

const FAQ = [
  { q: 'Для кого Aurora?', a: 'Для школьников, которые планируют бакалавриат в Казахстане, Венгрии или Нидерландах.' },
  {
    q: 'Можно начать, если я ещё не сдавал экзамены?',
    a: 'Да. Укажи текущий статус экзаменов, чтобы сервис учитывал, какие результаты ещё предстоит получить.',
  },
  { q: 'Можно изменить ответы?', a: 'Да. Обнови профиль, чтобы пересмотреть рекомендации и план.' },
  {
    q: 'Aurora гарантирует поступление?',
    a: 'Нет. Сервис помогает сравнить варианты и спланировать подготовку. Решение о зачислении принимает университет.',
  },
];

function GlassCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`hero-glass rounded-2xl px-4 py-3.5 ${className}`}>{children}</div>;
}

export function Landing({ groqMode, hasProfile, hasRoute, onStart, onContinue, onOpenRoute, onRestart, onDemo }: Props) {
  return (
    <div className="landing-page space-y-16 pb-10 sm:space-y-24">
      <nav aria-label="Разделы главной страницы" className="landing-nav flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-line/80 py-2 text-[13px]">
        <div className="flex min-w-0 gap-4 overflow-x-auto sm:gap-5">
          <a href="#how" className="shrink-0">Как это работает</a>
          <a href="#value" className="shrink-0">Что ты получишь</a>
          <a href="#faq" className="shrink-0">Вопросы</a>
        </div>
        <button type="button" className="btn-secondary hidden shrink-0 px-3 py-1.5 text-sm sm:inline-flex" onClick={hasRoute ? onOpenRoute : hasProfile ? onContinue : onStart}>
          {hasRoute ? 'Открыть маршрут' : hasProfile ? 'Продолжить' : 'Построить маршрут'}
        </button>
      </nav>

      <section className="landing-hero relative px-1 pt-6 pb-12 sm:pt-10 sm:pb-20">
        <div className="relative z-10 grid gap-12 lg:grid-cols-[1.12fr_0.88fr] lg:items-center">
          <div>
            <p className="mb-4 text-xs font-semibold tracking-[0.18em] text-accent/90 uppercase">Твой следующий шаг</p>
            <h1 className="max-w-xl text-[2.45rem] leading-[1.08] font-extrabold tracking-tight text-ink sm:max-w-2xl sm:text-5xl lg:text-[3.55rem] lg:leading-[1.06]">
              Будущее становится ближе,
              <br />
              когда понятен маршрут
            </h1>
            <p className="mt-5 max-w-[38rem] text-lg leading-8 text-muted">
              Aurora помогает выбрать бакалавриат, сравнить программы и собрать персональный план подготовки.
            </p>
            <p className="mt-2 max-w-[38rem] text-sm leading-6 text-muted/80">
              Магистратура и докторантура в школьный подбор не входят.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {hasRoute ? (
                <button type="button" className="btn-primary px-5 py-3" onClick={onOpenRoute}>
                  Открыть маршрут
                </button>
              ) : hasProfile ? (
                <button type="button" className="btn-primary px-5 py-3" onClick={onContinue}>
                  Продолжить заполнение
                </button>
              ) : (
                <button type="button" className="btn-primary px-5 py-3" onClick={onStart}>
                  Открыть маршрут
                </button>
              )}
              <a href="#how" className="btn-secondary px-5 py-3 font-semibold">
                Как это работает
              </a>
            </div>
            <div className="mt-6 space-y-1 text-sm text-muted">
              <p>Казахстан · Венгрия · Нидерланды</p>
              <p className="text-xs tracking-wide text-muted/80">Подбор программ · сравнение · roadmap</p>
            </div>
            {hasProfile ? (
              <button type="button" className="mt-4 text-sm text-muted underline" onClick={onRestart}>
                Начать заново
              </button>
            ) : (
              <p className="mt-4 text-sm text-muted">Твой профиль. Подходящие варианты. Понятный следующий шаг.</p>
            )}
            <p className="mt-3 max-w-xl text-xs leading-5 text-muted/70">
              Прогресс сохраняется в этом браузере: анкета, сравнение, план и галочки. Можно закрыть сайт и продолжить
              позже. Это не облачный аккаунт — на другом устройстве ответы не появятся.
            </p>
          </div>

          <div className="relative">
            <div className="hero-card-glow" aria-hidden="true" />
            <div className="relative space-y-4">
              <GlassCard>
                <p className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">Твои интересы</p>
                <p className="mt-1.5 text-sm font-medium text-ink">{previewProgram.field}, интересы из анкеты</p>
              </GlassCard>
              <GlassCard className="sm:ml-7">
                <p className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">Программы для сравнения</p>
                <p className="mt-1.5 text-sm font-medium text-ink">{previewProgram.program}</p>
                <p className="mt-1 text-xs text-muted">
                  {previewProgram.university} · {previewProgram.city}
                </p>
              </GlassCard>
              <GlassCard className="sm:ml-14">
                <p className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">Следующий шаг</p>
                <p className="mt-1.5 text-sm font-medium text-ink">Уточнить требования выбранной программы</p>
              </GlassCard>
            </div>
            <p className="mt-5 text-xs leading-5 text-muted/75">
              Пример маршрута — иллюстрация интерфейса, не персональная рекомендация.
              <br />
              Сведения о программах берутся из каталога Aurora. Ссылки ведут на указанные источники, страницы при этом отдельно не проверялись.
            </p>
          </div>
        </div>
        <div className="landing-divider relative z-10 mt-10 sm:mt-14" aria-hidden="true" />
      </section>

      {/* О продукте */}
      <section className="mx-auto max-w-2xl text-center">
        <h2 className="text-2xl font-bold text-ink sm:text-3xl">От «куда поступать?» к понятному плану</h2>
        <p className="mt-4 text-base leading-7 text-muted">
          Aurora — навигатор поступления для школьников. Мы помогаем связать твои интересы и возможности с
          образовательными программами, разобраться в требованиях и определить, с чего начать подготовку.
        </p>
      </section>

      {/* Что ты получишь */}
      <section id="value" className="scroll-mt-32">
        <h2 className="text-2xl font-bold text-ink sm:text-3xl">Что ты получишь</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {VALUE_CARDS.map((card) => (
            <div
              key={card.title}
              className={`landing-surface rounded-[16px] p-6 ${card.big ? 'sm:col-span-2 sm:p-8' : ''}`}
            >
              <h3 className={`font-semibold text-ink ${card.big ? 'text-xl' : 'text-lg'}`}>{card.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{card.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Как это работает */}
      <section id="how" className="scroll-mt-32">
        <h2 className="text-2xl font-bold text-ink sm:text-3xl">Как это работает</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-4">
          {HOW_IT_WORKS.map((step, i) => (
            <li key={step.title} className="landing-surface rounded-[16px] p-5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line bg-section text-sm font-semibold text-ink">
                {i + 1}
              </span>
              <h3 className="mt-3 text-sm font-semibold text-ink">{step.title}</h3>
              <p className="mt-1 text-sm leading-6 text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* О данных */}
      <section className="landing-surface rounded-[16px] p-6 sm:p-10">
        <h2 className="text-2xl font-bold text-ink sm:text-3xl">Понятно, на чём основан выбор</h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-3">
          {DATA_POINTS.map((p) => (
            <li key={p} className="rounded-2xl border border-line bg-card p-4 text-sm leading-6 text-muted">
              {p}
            </li>
          ))}
        </ul>
        <p className="mt-5 text-sm text-muted">
          Aurora помогает подготовиться к выбору. Окончательные условия поступления проверяй на официальном сайте
          университета. {SCOPE_NOTE}
        </p>
        <p className="mt-2 text-xs text-muted">{groqMode}</p>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-32">
        <h2 className="text-2xl font-bold text-ink sm:text-3xl">Вопросы</h2>
        <div className="landing-surface mt-6 divide-y divide-line rounded-[16px]">
          {FAQ.map((item) => (
            <FaqRow key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </section>

      {/* Быстрый способ попробовать (демопрофили) */}
      <section className="landing-surface rounded-[16px] p-6">
        <h2 className="text-lg font-semibold text-ink">Быстрый способ попробовать</h2>
        <p className="mt-1 text-sm text-muted">
          Готовые профили — сразу увидеть пример подбора по реальному каталогу, без заполнения анкеты.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {demoProfiles.map((demo) => (
            <button
              key={demo.id}
              type="button"
              className="rounded-2xl border border-line bg-section/70 px-4 py-3 text-left transition-[border-color,box-shadow] duration-200 hover:border-accent hover:shadow-[0_0_24px_rgba(126,227,196,0.08)]"
              onClick={() => onDemo(demo.profile)}
            >
              <span className="block text-sm font-semibold text-ink">{demo.title}</span>
              <span className="mt-1 block text-xs text-muted">{demo.hint}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Финальный блок */}
      <section className="landing-surface p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-ink sm:text-3xl">Начни с одного понятного шага</h2>
        <p className="mt-4 max-w-xl text-base leading-7 text-muted">
          Расскажи о себе, чтобы увидеть варианты поступления и собрать свой маршрут.
        </p>
        <button type="button" className="btn-primary mt-6 px-6 py-3" onClick={onStart}>
          Создать мой маршрут
        </button>
      </section>

      <footer className="border-t border-line pt-6 text-sm text-muted">
        <p className="font-semibold text-ink">Aurora</p>
        <p className="mt-1">Персональный маршрут поступления.</p>
        <p className="mt-1">{SCOPE_NOTE}</p>
      </footer>
    </div>
  );
}

function FaqRow({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="p-5">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="font-semibold text-ink">{q}</span>
        <span className="text-muted" aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      {open ? <p className="mt-2 text-sm leading-6 text-muted">{a}</p> : null}
    </div>
  );
}
