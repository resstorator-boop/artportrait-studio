/**
 * HARD DECISION: единственная тёмная секция — фон risk #3c2a26 (Docs/landing-spec.md §4).
 */
export default function RiskReversal() {
  return (
    <section className="bg-risk py-20 text-inverse md:py-[120px]">
      <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-dusty">
          Главный вопрос
        </p>
        <h2 className="mt-4 font-heading text-[clamp(1.75rem,3.5vw,3.5rem)] font-normal italic leading-tight text-inverse">
          «А если получится не я?»
        </h2>
        <div className="mt-8 max-w-[640px] space-y-6 text-lg leading-relaxed text-inverse/95">
          <p>
            Главное правило ArtPortrait: твои черты лица не меняются. Меняется
            только стиль вокруг тебя — палитра, свет, настроение.
          </p>
          <p>
            Если кажется, что вышло «не ты» — нажимаешь «Переснять», и мы
            пересоздаём серию бесплатно. Сколько нужно раз — пока результат не
            станет тем, ради которого ты пришла.
          </p>
          <p>
            Если совсем не зашло — возвращаем 100 ₽ за первый портрет без формы
            возврата на трёх страницах. Без вопросов.
          </p>
        </div>
      </div>
    </section>
  );
}
