import { useEffect, useRef, useState, type ReactNode } from 'react';
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
    text: 'Посмотри, какие программы соответствуют твоим интересам и бюджету, а какие требования ещё предстоит выполнить.',
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
  return <div className={`rounded-[16px] border border-line bg-card px-4 py-4 ${className}`}>{children}</div>;
}

export function Landing({ groqMode, hasProfile, hasRoute, onStart, onContinue, onOpenRoute, onRestart, onDemo }: Props) {
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        el.classList.toggle('hero-aurora-paused', !entry.isIntersecting);
      },
      { threshold: 0.08 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="space-y-16 pb-10 sm:space-y-24">
      <nav aria-label="Разделы главной страницы" className="flex items-center justify-between gap-3 border-b border-line py-2 text-sm">
        <div className="flex min-w-0 gap-4 overflow-x-auto">
          <a href="#how" className="shrink-0 text-muted hover:text-ink">Как это работает</a>
          <a href="#value" className="shrink-0 text-muted hover:text-ink">Что ты получишь</a>
          <a href="#faq" className="shrink-0 text-muted hover:text-ink">Вопросы</a>
        </div>
        <button type="button" className="btn-primary shrink-0 px-3 py-1.5 text-sm" onClick={hasRoute ? onOpenRoute : hasProfile ? onContinue : onStart}>
          {hasRoute ? 'Открыть маршрут' : hasProfile ? 'Продолжить' : 'Построить маршрут'}
        </button>
      </nav>

      <section ref={heroRef} className="relative overflow-hidden px-1 py-10 sm:py-16">
        <div className="hero-aurora" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="relative z-10 grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="mb-4 text-sm font-medium tracking-[0.12em] text-muted uppercase">Твой следующий шаг</p>
            <h1 className="text-4xl leading-[1.12] font-bold tracking-tight text-ink sm:text-5xl lg:text-6xl">
              Будущее становится ближе,
              <br />
              когда понятен маршрут
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted">
              Aurora помогает выбрать бакалавриат в Казахстане, Венгрии и Нидерландах и собрать план подготовки.
              Магистратура и докторантура в школьный подбор не входят.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {hasRoute ? (
                <button type="button" className="btn-primary px-5 py-3" onClick={onOpenRoute}>
                  Открыть мой маршрут
                </button>
              ) : null}
              {hasProfile ? (
                <button type="button" className="btn-primary px-5 py-3" onClick={onContinue}>
                  Продолжить заполнение
                </button>
              ) : (
                <button type="button" className="btn-primary px-5 py-3" onClick={onStart}>
                  Построить мой маршрут
                </button>
              )}
              <a href="#how" className="btn-secondary px-5 py-3 font-semibold">
                Как это работает
              </a>
            </div>
            {hasProfile ? (
              <button type="button" className="mt-4 text-sm text-muted underline" onClick={onRestart}>
                Начать заново
              </button>
            ) : (
              <p className="mt-4 text-sm text-muted">Твой профиль. Подходящие варианты. Понятный следующий шаг.</p>
            )}
            <p className="mt-3 max-w-xl text-xs text-muted">
              Прогресс сохраняется в этом браузере: анкета, сравнение, план и галочки. Можно закрыть сайт и продолжить
              позже. Это не облачный аккаунт — на другом устройстве ответы не появятся.
            </p>
          </div>

          <div className="relative">
            <div className="space-y-3">
              <GlassCard>
                <p className="text-xs font-medium tracking-wide text-muted">Твои интересы</p>
                <p className="mt-1 text-sm text-ink">{previewProgram.field}, интересы из анкеты</p>
              </GlassCard>
              <GlassCard className="ml-4 sm:ml-8">
                <p className="text-xs font-medium tracking-wide text-muted">Программы для сравнения</p>
                <p className="mt-1 text-sm text-ink">{previewProgram.program}</p>
                <p className="mt-1 text-xs text-muted">
                  {previewProgram.university} · {previewProgram.city}
                </p>
              </GlassCard>
              <GlassCard className="ml-8 sm:ml-16">
                <p className="text-xs font-medium tracking-wide text-muted">Следующий шаг</p>
                <p className="mt-1 text-sm text-ink">Уточнить требования выбранной программы</p>
              </GlassCard>
            </div>
            <p className="mt-4 text-xs text-muted">
              Пример маршрута — иллюстрация интерфейса, не персональная рекомендация.
              <br />
              Сведения о программах берутся из каталога Aurora. Ссылки ведут на указанные источники, страницы при этом отдельно не проверялись.
            </p>
          </div>
        </div>
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
              className={`rounded-[16px] border border-line bg-card p-6 ${card.big ? 'sm:col-span-2 sm:p-8' : ''}`}
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
            <li key={step.title} className="rounded-[16px] border border-line bg-card p-5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line bg-card text-sm font-semibold text-ink">
                {i + 1}
              </span>
              <h3 className="mt-3 text-sm font-semibold text-ink">{step.title}</h3>
              <p className="mt-1 text-sm leading-6 text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* О данных */}
      <section className="rounded-[16px] border border-line bg-section p-6 sm:p-10">
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
        <div className="mt-6 divide-y divide-line rounded-[16px] border border-line bg-card">
          {FAQ.map((item) => (
            <FaqRow key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </section>

      {/* Быстрый способ попробовать (демопрофили) */}
      <section className="rounded-[16px] border border-line bg-card p-6">
        <h2 className="text-lg font-semibold text-ink">Быстрый способ попробовать</h2>
        <p className="mt-1 text-sm text-muted">
          Готовые профили — сразу увидеть пример подбора по реальному каталогу, без заполнения анкеты.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {demoProfiles.map((demo) => (
            <button
              key={demo.id}
              type="button"
              className="rounded-2xl border border-line px-4 py-3 text-left hover:border-accent"
              onClick={() => onDemo(demo.profile)}
            >
              <span className="block text-sm font-semibold text-ink">{demo.title}</span>
              <span className="mt-1 block text-xs text-muted">{demo.hint}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Финальный блок */}
      <section className="border border-line bg-section p-6 sm:p-8">
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
