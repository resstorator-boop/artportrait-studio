import Link from "next/link";

export default function Pricing() {
  return (
    <section
      id="pricing"
      className="border-b border-hairline bg-page py-20 md:py-[120px]"
    >
      <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-burgundy">
          Сколько стоит
        </p>
        <h2 className="mt-3 font-heading text-[clamp(1.75rem,3.5vw,2.75rem)] font-normal leading-tight text-ink">
          Кредиты не сгорают. Без подписки.
        </h2>

        <div className="mt-12 grid gap-6 lg:grid-cols-3 lg:gap-6">
          {/* SAMPLE */}
          <article className="flex min-h-[380px] min-w-0 flex-col rounded-lg border border-hairline bg-page p-6 md:p-8">
            <p className="font-mono text-[11px] font-medium uppercase tracking-wider text-muted">
              Sample
            </p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="font-heading text-[64px] font-normal leading-none text-ink">
                100
              </span>
              <span className="font-heading text-2xl italic text-burgundy">
                ₽
              </span>
            </div>
            <p className="mt-2 font-mono text-[11px] font-medium text-burgundy">
              1 портрет
            </p>
            <p className="mt-4 flex-1 text-muted">
              попробовать без риска
            </p>
            <Link
              href="/sign-up"
              className="mt-8 inline-flex h-11 w-full items-center justify-center rounded-full border-2 border-burgundy bg-transparent text-[15px] font-medium text-burgundy transition-colors hover:bg-burgundy hover:text-inverse"
            >
              Попробовать
            </Link>
          </article>

          {/* FEATURED — Популярный */}
          <article className="relative flex min-h-[380px] min-w-0 flex-col rounded-lg border-2 border-burgundy bg-card p-6 shadow-sm md:p-8">
            <span className="absolute right-6 top-6 rounded-full bg-burgundy px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-wider text-inverse">
              Популярный
            </span>
            <p className="font-mono text-[11px] font-medium uppercase tracking-wider text-burgundy">
              Сессия
            </p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="font-heading text-[64px] font-normal leading-none text-ink">
                700
              </span>
              <span className="font-heading text-2xl italic text-burgundy">
                ₽
              </span>
            </div>
            <p className="mt-2 font-mono text-[11px] font-medium text-burgundy">
              +1 в подарок · 8 портретов
            </p>
            <p className="mt-4 flex-1 text-muted">
              попробовать всех пятерых
            </p>
            <Link
              href="/sign-up"
              className="mt-8 inline-flex h-11 w-full items-center justify-center rounded-full bg-burgundy text-[15px] font-medium text-inverse transition-opacity hover:opacity-90"
            >
              Купить — 700 ₽
            </Link>
          </article>

          {/* СЕРИЯ */}
          <article className="flex min-h-[380px] min-w-0 flex-col rounded-lg border border-hairline bg-page p-6 md:p-8">
            <p className="font-mono text-[11px] font-medium uppercase tracking-wider text-muted">
              Серия
            </p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="font-heading text-[64px] font-normal leading-none text-ink">
                1 990
              </span>
              <span className="font-heading text-2xl italic text-burgundy">
                ₽
              </span>
            </div>
            <p className="mt-2 font-mono text-[11px] font-medium text-burgundy">
              +5 в подарок · 30 портретов
            </p>
            <p className="mt-4 flex-1 text-muted">
              для регулярного контента
            </p>
            <Link
              href="/sign-up"
              className="mt-8 inline-flex h-11 w-full items-center justify-center rounded-full border-2 border-burgundy bg-transparent text-[15px] font-medium text-burgundy transition-colors hover:bg-burgundy hover:text-inverse"
            >
              Купить — 1 990 ₽
            </Link>
          </article>
        </div>

        <p className="mt-10 text-center font-mono text-[11px] text-muted">
          1 портрет = 100 кредитов · Картой или СБП · Кредиты не сгорают
        </p>
      </div>
    </section>
  );
}
