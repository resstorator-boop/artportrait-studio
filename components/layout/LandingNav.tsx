import Link from "next/link";

const navLinkClass =
  "text-[15px] font-medium text-muted transition-colors hover:text-ink";

export default function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-page/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-container items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="font-heading text-lg font-medium tracking-tight text-ink"
        >
          ArtPortrait
        </Link>
        <nav
          className="hidden items-center gap-8 md:flex"
          aria-label="Основная навигация"
        >
          <a href="#proof-gallery" className={navLinkClass}>
            Примеры
          </a>
          <a href="#how-it-works" className={navLinkClass}>
            Как это работает
          </a>
          <a href="#catalog" className={navLinkClass}>
            Настроения
          </a>
          <a href="#pricing" className={navLinkClass}>
            Цены
          </a>
          <a href="#faq" className={navLinkClass}>
            Вопросы
          </a>
        </nav>
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/sign-in"
            className="hidden text-[15px] text-muted hover:text-ink sm:inline"
          >
            Войти
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex h-10 items-center justify-center rounded-full bg-burgundy px-4 text-[15px] font-medium text-inverse transition-opacity hover:opacity-90"
          >
            Первый портрет за 100 ₽
          </Link>
        </div>
      </div>
    </header>
  );
}
