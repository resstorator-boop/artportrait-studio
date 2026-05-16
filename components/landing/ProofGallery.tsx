import Image from "next/image";
import Link from "next/link";

const PAIRS = [
  { before: "before1", after: "after1", director: "Coppola" },
  { before: "before2", after: "after2", director: "Anderson" },
  { before: "before3", after: "after3", director: "Leibovitz" },
  { before: "before4", after: "after4", director: "Collins" },
  { before: "before5", after: "after5", director: "Wong Kar-wai" },
] as const;

export default function ProofGallery() {
  return (
    <section
      id="proof-gallery"
      className="border-b border-hairline bg-page py-20 md:py-[120px]"
    >
      <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-burgundy">
          Реальные клиенты
        </p>
        <h2 className="mt-3 font-heading text-[clamp(1.75rem,3.5vw,2.75rem)] font-normal leading-tight text-ink">
          Это не stock-фото. Это пять девушек и их серии.
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          Каждая пара — селфи + один кадр из её серии. Узнай в результатах те же
          лица.
        </p>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {PAIRS.map(({ before, after, director }) => (
            <div
              key={before}
              className="group relative grid min-w-0 grid-cols-2 gap-2 rounded-lg border border-hairline bg-card/50 p-2 transition-transform hover:-translate-y-1 hover:border-dusty"
            >
              {/* TODO: replace with real before/after pair when beta-photoshoot is done */}
              <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-hairline">
                <Image
                  src={`https://picsum.photos/seed/${before}/400/500`}
                  alt="Исходное селфи (заглушка)"
                  fill
                  className="object-cover"
                  sizes="(min-width: 1024px) 200px, 45vw"
                />
              </div>
              <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-hairline">
                <Image
                  src={`https://picsum.photos/seed/${after}/400/500`}
                  alt="Портрет из серии (заглушка)"
                  fill
                  className="object-cover"
                  sizes="(min-width: 1024px) 200px, 45vw"
                />
              </div>
              <p className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-ink/0 text-center text-sm font-medium text-inverse opacity-0 transition-opacity group-hover:bg-ink/40 group-hover:opacity-100">
                {director}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-1 text-[15px] font-medium text-burgundy underline-offset-4 hover:underline"
          >
            Видишь свою серию здесь? Начать за 100 ₽
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
