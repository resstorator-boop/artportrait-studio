"use client";

import { useState } from "react";

const FAQ_ITEMS = [
  {
    q: "Похоже ли фото на меня?",
    a: "Да. AI сохраняет черты лица. В <5% случаев — бесплатная перегенерация.",
  },
  {
    q: "Что с моими фото? Не используете их?",
    a: "Селфи удаляются через 30 дней. Не используем для обучения моделей. Готовые портреты — у тебя в личном кабинете.",
  },
  {
    q: "Сколько занимает съёмка?",
    a: "10–15 минут от загрузки. Email и push, когда готово.",
  },
  {
    q: "Какие селфи лучше всего работают?",
    a: "Анфас или в три четверти, при дневном свете, без сильных фильтров. Макияж не обязателен.",
  },
  {
    q: "Что если хочу попробовать несколько режиссёров?",
    a: "Бери «Сессию» — 8 портретов хватит на всех пятерых.",
  },
  {
    q: "Кредиты сгорают?",
    a: "Нет. Никогда. Живут, пока ты ими не воспользуешься.",
  },
] as const;

export default function LandingFaq() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="mt-16 border-t border-hairline pt-16">
      <h3 className="font-heading text-2xl font-medium text-ink">Вопросы</h3>
      <ul className="mt-6 divide-y divide-hairline border-y border-hairline">
        {FAQ_ITEMS.map((item, i) => {
          const isOpen = open === i;
          return (
            <li key={item.q}>
              <button
                type="button"
                className="flex w-full items-start gap-3 py-5 text-left"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
              >
                <span
                  className={`mt-0.5 inline-block shrink-0 select-none text-burgundy transition-transform duration-200 ${
                    isOpen ? "rotate-90" : "rotate-0"
                  }`}
                  aria-hidden
                >
                  ▸
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-heading text-lg font-medium leading-snug text-ink">
                    {item.q}
                  </span>
                  {isOpen ? (
                    <span className="mt-3 block text-base leading-relaxed text-muted">
                      {item.a}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
