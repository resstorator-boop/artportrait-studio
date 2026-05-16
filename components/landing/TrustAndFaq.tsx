import LandingFaq from "@/components/landing/LandingFaq";

const TRUST = [
  {
    title: "Твои фото — твои",
    body: "Удаляем через 30 дней. Не используем для обучения.",
    icon: "🔒",
  },
  {
    title: "Бесплатная перегенерация",
    body: "Пока не получится «то самое».",
    icon: "↻",
  },
  {
    title: "Возврат без вопросов",
    body: "Не зашло — вернём.",
    icon: "←",
  },
  {
    title: "Без подписки",
    body: "Кредиты живут вечно.",
    icon: "✦",
  },
] as const;

export default function TrustAndFaq() {
  return (
    <section id="faq" className="border-b border-hairline bg-page py-20 md:py-[120px]">
      <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {TRUST.map((cell) => (
            <div key={cell.title} className="min-w-0">
              <div className="flex items-start gap-3">
                <span className="text-2xl leading-none" aria-hidden>
                  {cell.icon}
                </span>
                <div>
                  <p className="font-heading text-lg font-medium text-ink">
                    {cell.title}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {cell.body}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <LandingFaq />
      </div>
    </section>
  );
}
