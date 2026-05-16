import Link from "next/link";

export default function FinalCTA() {
  return (
    <section className="bg-page py-24 md:py-32">
      <div className="mx-auto max-w-container px-4 text-center sm:px-6 lg:px-8">
        <h2 className="mx-auto max-w-3xl font-heading text-[clamp(2rem,4vw,4.5rem)] font-normal leading-tight text-ink">
          Один портрет — 100 ₽.
          <br />
          Не похоже — переснимем.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted">
          Без подписки. Без формы возврата на трёх страницах. Просто попробуй.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4">
          <Link
            href="/sign-up"
            className="inline-flex h-12 min-w-[min(100%,320px)] items-center justify-center gap-2 rounded-full bg-burgundy px-8 text-[16px] font-medium text-inverse transition-opacity hover:opacity-90"
          >
            Попробовать за 100 ₽
            <span aria-hidden>→</span>
          </Link>
          <p className="font-mono text-[11px] text-muted">
            15 минут до результата · Похожесть гарантирована
          </p>
        </div>
      </div>
    </section>
  );
}
