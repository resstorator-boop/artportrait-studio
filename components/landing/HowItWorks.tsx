import Link from "next/link";

const STEPS = [
  {
    n: "01",
    title: "Загружаешь одно селфи",
    body: "Любое хорошее фото лица при дневном свете. Без фильтров и обработки — мы их добавим сами.",
  },
  {
    n: "02",
    title: "Выбираешь настроение",
    body: "Coppola, Anderson, Leibovitz и другие. Каждое — разная палитра, свет и атмосфера.",
  },
  {
    n: "03",
    title: "Получаешь серию",
    body: "Через 10–15 минут — пять кадров и подпись от автора стиля. На почту и в личный кабинет.",
  },
] as const;

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="border-b border-hairline bg-page py-20 md:py-[120px]"
    >
      <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-burgundy">
          Как это работает
        </p>
        <h2 className="mt-3 font-heading text-[clamp(1.75rem,3.5vw,2.75rem)] font-normal leading-tight text-ink">
          Три шага. 15 минут. Без настроек.
        </h2>

        <ol className="mt-14 grid gap-12 md:grid-cols-3 md:gap-6">
          {STEPS.map((step) => (
            <li key={step.n} className="min-w-0">
              <span className="font-heading text-5xl font-normal italic text-burgundy md:text-[48px]">
                {step.n}
              </span>
              <h3 className="mt-4 font-heading text-xl font-medium text-ink">
                {step.title}
              </h3>
              <p className="mt-3 text-base leading-relaxed text-muted">
                {step.body}
              </p>
            </li>
          ))}
        </ol>

        <div className="mt-14 flex justify-center">
          <Link
            href="/sign-up"
            className="inline-flex h-11 items-center justify-center rounded-full bg-burgundy px-8 text-[15px] font-medium text-inverse transition-opacity hover:opacity-90"
          >
            Начать за 100 ₽
          </Link>
        </div>
      </div>
    </section>
  );
}
