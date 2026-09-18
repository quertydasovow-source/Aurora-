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
};

export function Shell({ children, onHome, showHome = false }: ShellProps) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="site-header">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button type="button" className="flex min-w-0 items-center gap-3 text-left" onClick={onHome} aria-label="На главную">
            <img src="/aurora-logo.jpg" alt="" className="h-9 w-9 rounded-full object-cover" />
            <span>
              <span className="block text-base font-semibold tracking-tight">Aurora</span>
              <span className="block text-xs text-muted">Маршрут поступления</span>
            </span>
          </button>
          {showHome ? <HomeButton onClick={onHome} /> : <p className="hidden text-xs text-muted sm:block">Казахстан · Венгрия · Нидерланды</p>}
        </div>
      </header>
      <main className="page-enter relative mx-auto max-w-[1100px] px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
