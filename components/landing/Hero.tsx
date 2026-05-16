import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="border-b border-hairline bg-page py-16 md:py-[120px]">
      <div className="mx-auto grid max-w-container gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:gap-6 lg:px-8">
        <div className="flex min-w-0 flex-col justify-center lg:col-span-6">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.12em] text-burgundy">
            Digital fashion editorial
          </p>
          <h1 className="font-heading text-[clamp(2.25rem,5vw,5rem)] font-normal leading-[1.05] tracking-tight text-ink">
            Editorial-фотосессия
            <br />
            из одного селфи.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted md:text-xl">
            Загружаешь одно фото — выбираешь настроение — получаешь серию из 5
            портретов через 15 минут. Похожесть гарантирована: не получилось —
            переснимаем бесплатно.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link
              href="/sign-up"
              className="inline-flex h-11 min-w-[min(100%,280px)] items-center justify-center gap-2 rounded-full bg-burgundy px-6 text-[15px] font-medium text-inverse transition-opacity hover:opacity-90"
            >
              Первый портрет за 100 ₽
              <span aria-hidden>→</span>
            </Link>
            <a
              href="#proof-gallery"
              className="text-center text-[15px] font-medium text-muted underline-offset-4 hover:text-ink hover:underline sm:text-left"
            >
              Посмотреть примеры
            </a>
          </div>
          <p className="mt-6 font-mono text-[11px] leading-relaxed text-muted">
            15 минут до результата · Без подписки · Возврат без вопросов
          </p>
        </div>
        <div className="relative min-w-0 lg:col-span-5 lg:col-start-8">
          <figure className="mx-auto w-full max-w-md lg:max-w-none">
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg border border-hairline bg-card shadow-sm">
              {/* TODO: replace with real before/after pair when beta-photoshoot is done */}
              <Image
                src="https://picsum.photos/seed/hero-editorial/800/1000"
                alt="Пример портрета (временная заглушка)"
                width={800}
                height={1000}
                className="h-full w-full object-cover"
                sizes="(min-width: 1024px) 480px, 90vw"
                priority
              />
            </div>
            <figcaption className="mt-3 text-center text-sm text-muted">
              Coppola · реальный клиент
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
