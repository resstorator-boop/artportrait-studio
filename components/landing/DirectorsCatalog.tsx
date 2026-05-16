import Image from "next/image";
import Link from "next/link";

const DIRECTORS = [
  {
    slug: "coppola",
    name: "Coppola",
    tag: "Розовая, мягкая, мечтательная.",
    seed: "coppola",
  },
  {
    slug: "anderson",
    name: "Anderson",
    tag: "Симметрия и пастель.",
    seed: "anderson",
  },
  {
    slug: "leibovitz",
    name: "Leibovitz",
    tag: "Журнальная обложка с твоим лицом.",
    seed: "leibovitz",
  },
  {
    slug: "collins",
    name: "Collins",
    tag: "Розовый туман и мягкий фокус.",
    seed: "collins",
  },
  {
    slug: "wong-kar-wai",
    name: "Wong Kar-wai",
    tag: "Цвет, который ты чувствуешь.",
    seed: "wong-kar-wai",
  },
] as const;

export default function DirectorsCatalog() {
  return (
    <section
      id="catalog"
      className="border-b border-hairline bg-page py-20 md:py-[120px]"
    >
      <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-burgundy">
          Каталог · Май 2026
        </p>
        <h2 className="mt-3 font-heading text-[clamp(1.75rem,3.5vw,2.75rem)] font-normal leading-tight text-ink">
          Пять настроений. Выбираешь под себя.
        </h2>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {DIRECTORS.map((d) => (
            <Link
              key={d.slug}
              href={`/sign-up?style=${d.slug}`}
              className="group flex min-w-0 flex-col overflow-hidden rounded-lg border border-hairline bg-card/40 transition-transform hover:-translate-y-1 hover:border-dusty"
            >
              <div className="relative aspect-[3/4] w-full bg-hairline">
                {/* TODO: replace with real director sample portrait when beta-photoshoot is done */}
                <Image
                  src={`https://picsum.photos/seed/${d.seed}/600/800`}
                  alt={`Настроение «${d.name}» (заглушка)`}
                  fill
                  className="object-cover transition-opacity group-hover:opacity-95"
                  sizes="(min-width: 1024px) 220px, (min-width: 640px) 45vw, 90vw"
                />
              </div>
              <div className="flex flex-1 flex-col p-4">
                <p className="font-heading text-lg font-medium text-ink">
                  {d.name}
                </p>
                <p className="mt-2 flex-1 text-sm leading-snug text-muted">
                  «{d.tag}»
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-[15px] font-medium text-burgundy">
                  Попробовать
                  <span aria-hidden>→</span>
                </span>
              </div>
            </Link>
          ))}
        </div>

        <p className="mt-10 max-w-2xl text-sm text-muted">
          Каждый месяц добавляем нового режиссёра — только на две недели.
        </p>
      </div>
    </section>
  );
}
