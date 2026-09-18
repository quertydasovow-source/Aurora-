import type { ReactNode } from 'react';

export function HomeButton({ onClick, className = '' }: { onClick: () => void; className?: string }) {
  return (
    <button type="button" className={`btn-secondary inline-flex items-center gap-2 px-3 py-2 text-sm ${className}`} onClick={onClick}>
      <HomeIcon />
      На главную
    </button>
  );
}

export function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

export function DemoBanner({ onOpen }: { onOpen?: () => void }) {
  return (
    <p className="text-sm text-muted">
      Некоторые условия требуют уточнения.{' '}
      {onOpen ? (
        <button type="button" className="text-accent underline" onClick={onOpen}>
          Подробнее
        </button>
      ) : null}
    </p>
  );
}

type ShellProps = {
  children: ReactNode;
  onHome: () => void;
  showHome?: boolean;
  aurora?: boolean;
};

export function Shell({ children, onHome, showHome = false, aurora = false }: ShellProps) {
  return (
    <div className="relative min-h-screen bg-paper text-ink">
      <div className="page-glow" aria-hidden="true" />
      {aurora ? (
        <div className="landing-sky" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span className="landing-sky-band" />
        </div>
      ) : null}
      <header className="site-header">
        <div className="relative z-10 mx-auto flex h-full max-w-[1160px] items-center justify-between gap-3 px-4 sm:px-6">
          <button type="button" className="flex min-w-0 items-center gap-3 text-left" onClick={onHome} aria-label="На главную">
            <img src="/aurora-logo.jpg" alt="" className="site-brand-mark h-10 w-10 rounded-full object-cover" />
            <span>
              <span className="block text-[17px] font-semibold tracking-tight text-ink">Aurora</span>
              <span className="block text-[11px] tracking-wide text-muted">Персональный маршрут</span>
            </span>
          </button>
          {showHome ? <HomeButton onClick={onHome} /> : <p className="hidden text-xs tracking-wide text-muted sm:block">Казахстан · Венгрия · Нидерланды</p>}
        </div>
      </header>
      <main className="page-enter relative z-10 mx-auto max-w-[1160px] px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
