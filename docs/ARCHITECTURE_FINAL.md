# NUMERO — Финал архитектурного слоя

> **Назначение.** Сводный документ архитектурного слоя проекта NUMERO. Все решения от Claude + ответы Дениса, собранные в один источник правды. Используется как вход в разработку.
>
> **Версия:** v1.0 (16 мая 2026)
> **Статус:** ЗАМОРОЖЕНО — открытых архитектурных вопросов нет.

---

## 1. Стек (зафиксирован)

| Слой | Технология |
|------|-----------|
| Хостинг | Vercel |
| Фреймворк | Next.js 14 (App Router) + TypeScript |
| Auth | Clerk (magic link через Sign-in tokens) |
| ORM | Drizzle |
| База | Neon Postgres |
| Бэкграунд-джобы | Inngest (free tier: 50k step runs/мес) |
| Хранилище файлов | Cloudflare R2 |
| Биллинг | Robokassa (ИП на УСН 6%, 54-ФЗ Receipt → ОФД) |
| Email | Unisender Go (fallback NotiSend) |
| AI: анализ лица | Claude Sonnet Vision |
| AI: генерация | Flux через fal.ai |
| Чат-продавец (Phase 1.5) | Vercel AI SDK + Claude/GPT API |

---

## 2. Структура папок (репозиторий)

```
app/
├── (marketing)/
│   ├── page.tsx                       # numero.art главная
│   ├── premiere/[slug]/page.tsx       # страница автора недели
│   └── pricing/page.tsx
├── (app)/
│   ├── upload/page.tsx                # загрузка селфи
│   ├── results/[orderId]/page.tsx     # просмотр результатов
│   └── account/page.tsx               # личный кабинет
├── (admin)/
│   ├── dashboard/page.tsx             # дашборд капитана
│   └── fulfillment/page.tsx           # ручная печать
├── api/
│   ├── webhooks/
│   │   ├── robokassa/result/route.ts
│   │   └── robokassa/success/route.ts
│   ├── auth/
│   │   ├── magic-link/route.ts
│   │   └── magic-link/verify/route.ts
│   ├── orders/
│   │   ├── create/route.ts
│   │   └── [id]/route.ts
│   ├── admin/
│   │   └── metrics/overview/route.ts
│   └── inngest/route.ts
db/
├── schema/
│   ├── enums.ts
│   ├── users.ts
│   ├── orders.ts
│   ├── order_items.ts
│   ├── generations.ts
│   ├── referrals.ts
│   ├── referral_uses.ts
│   ├── events.ts
│   ├── fingerprints.ts
│   ├── fulfillment_log.ts
│   ├── email_campaigns.ts
│   └── index.ts
├── client.ts
└── migrations/
inngest/
├── functions/
│   ├── generation/
│   │   ├── analyze-face.ts
│   │   ├── generate-pack.ts
│   │   └── deliver-results.ts
│   ├── auth/
│   │   ├── create-magic-link.ts
│   │   └── unverified-user-followup.ts  # 3-step retry
│   ├── billing/
│   │   ├── process-payment.ts
│   │   └── send-receipt.ts
│   └── marketing/
│       ├── email-series.ts
│       └── referral-credit.ts
└── client.ts
lib/
├── billing/
│   ├── robokassa.ts
│   └── receipt-mapping.ts             # 54-ФЗ маппинг
├── email/
│   ├── unisender.ts
│   └── templates/
│       ├── magic-link-initial.tsx
│       ├── magic-link-reminder.tsx
│       ├── magic-link-final.tsx
│       └── ...
├── ai/
│   ├── claude-vision.ts
│   └── flux-fal.ts
└── pricing.ts
```

---

## 3. Schema (заморожена)

**Принципы:**
- `users.clerk_id` — NULLABLE (юзер появляется после оплаты, до magic link clerk_id отсутствует)
- `users.pending_registration` — boolean, true до клика по magic link
- `users.email_verified_at` — timestamp клика
- Две таблицы рефералов (`referrals` + `referral_uses`), без объединения
- Своей таблицы `magic_links` НЕТ — токены живут в Clerk
- `order_status` enum: `pending`, `paid`, `processing`, `awaiting_fulfillment`, `fulfilled`, `failed`, `refunded`
- `fingerprints` — для антифрода рефералки
- `fulfillment_log` — ручная печать (постер/паззл/открытка/картина)

**Таблицы:**
1. `users`
2. `orders` (с `receipt_payload` JSONB)
3. `order_items`
4. `generations`
5. `referrals` — один код на одного владельца (`UNIQUE referrer_user_id`)
6. `referral_uses` — каждое использование (`UNIQUE (referral_id, referred_user_id)`)
7. `events` — трекинг
8. `fingerprints`
9. `fulfillment_log`
10. `email_campaigns` (seed)

---

## 4. Contracts

### 4.1 Inngest events

| Имя события | Эмитент | Подписчик | Что делает |
|------------|---------|-----------|-----------|
| `order.paid` | `/api/webhooks/robokassa/result` | `process-payment`, `create-magic-link` | После успешной оплаты |
| `generation.requested` | `/api/orders/create` после загрузки селфи | `analyze-face` | Старт двухступенчатой генерации |
| `generation.face_analyzed` | `analyze-face` | `generate-pack` | Передача meta в Flux |
| `generation.completed` | `generate-pack` | `deliver-results` | Финал — email + R2 ссылки |
| `auth.magic_link.followup` | `create-magic-link` (сразу после первой отправки) | `unverified-user-followup` | Запуск 3-step retry |
| `referral.used` | `/api/orders/create` (если есть code) | `referral-credit` | Начисление скидки + кредита рефереру |

### 4.2 Inngest functions

| Функция | Логика |
|---------|--------|
| `analyze-face` | Claude Sonnet Vision → meta JSON |
| `generate-pack` | Flux/fal.ai → 1/10/50 изображений в R2 |
| `deliver-results` | email через Unisender Go + ссылка в личный кабинет |
| `create-magic-link` | `clerkClient.signInTokens.createSignInToken` → email с ссылкой |
| `unverified-user-followup` | **3-step retry:** sleep 24h → reminder, sleep 48h → final, sleep 11d → admin alert (итого 14 дней). Все шаги идемпотентны по `(user_id, step_name)`. |
| `process-payment` | Перевод заказа в `paid`, запись `paid_at` |
| `send-receipt` | Receipt payload → Robokassa → ОФД |
| `email-series` | 3 письма серии при отказе |
| `referral-credit` | Скидка 30% покупателю + 1 фото рефереру |

### 4.3 Email-кампании

| key | Триггер | Назначение |
|-----|---------|-----------|
| `magic_link_initial` | сразу после `order.paid` | Первое письмо со ссылкой автологина |
| `magic_link_reminder` | через 24ч если `pending_registration = true` | «Не пропусти своё фото» — FOMO премьеры недели |
| `magic_link_final` | через 72ч (24+48) | Третий контакт + ссылка на форму поддержки |
| `welcome_quiz` | подписка на квиз | Серия из 3 писем-«трёх попыток» |
| `referral_share` | после получения результатов | «Подари 1 фото другу» |

### 4.4 Дашборд капитана

`GET /api/admin/metrics/overview` возвращает:
- `revenueToday`, `revenue7d`, `revenue30d`
- `ordersByStatus` (paid/processing/awaiting_fulfillment/fulfilled)
- `unverifiedAfter24h` — **% юзеров с `orders.paid_at < NOW() - INTERVAL '24h'` и `pending_registration = true`**. Целевой ориентир **<5%**. Красная карточка при ≥5%.
- `cacByChannel`, `LTV30d`, `kFactor`
- `fulfillmentBacklog` (физика, ждёт ручной печати)

### 4.5 Trackable events (events.type)

Базовые + `magic_link.email_sent`, `magic_link.email_opened`, `magic_link.clicked`, `magic_link.admin_alert` — для сквозной воронки «оплата → активация».

---

## 5. Tech decisions log

| Решение | Альтернатива | Почему |
|--------|-------------|--------|
| Vercel вместо Netlify | Netlify | Edge Functions, Inngest интеграция, ru-доступ через CDN |
| Robokassa | YooKassa, ЮMoney, CloudPayments | ИП на УСН, корректная 54-ФЗ интеграция, опыт Дениса |
| Unisender Go | SendPulse (ушли из РФ), Resend (нет ru-сертификата ОФД) | Работает в РФ, есть API, цена |
| Clerk + magic link через Sign-in tokens | Своя таблица magic_links | Не дублируем то, что Clerk и так делает идемпотентно |
| Две таблицы для рефералов | Одна таблица referrals со счётчиком | Каждое использование — отдельное событие со статусом, нужно для антифрода |
| Inngest free tier | Платная BullMQ + Redis на старте | 50k step runs/мес = ~2500 генераций — хватает на MVP. Алерт на 80% использования. |
| Двухступенчатая генерация (Claude Vision → Flux) | Один прогон Flux с селфи | Качество выше на 30–40%, стоимость +$0.005/генерация — окупается LTV |
| Magic link retry 3-step (24h → 72h → 14d) | Одно письмо без повторов | Оплаченный, но неактивированный заказ — прямая потеря LTV. 3 angles покрывают часовые пояса, выходные, забытые письма |
| Антифрод рефералки — минимум в MVP (fingerprint + email blocklist), полный в Phase 2 | Сразу полный антифрод | На малом объёме нет смысла переинженерить |
| Print-on-demand — ручная отправка email админу | API-интеграция с типографией | Первые заказы единичны, не нужно автоматизировать раньше времени |
| Чат-продавец отложен в Phase 1.5 | На старте MVP | Можно запускать MVP без него, добавить когда будут первые продажи и пул вопросов |

---

## 6. Receipt mapping (54-ФЗ, файл `lib/billing/receipt-mapping.ts`)

```typescript
import type { ProductType } from '@/db/schema/enums';

export type PaymentObject = 'service' | 'commodity';
export type PaymentMethod = 'full_payment';
export type Tax = 'none';

export const PAYMENT_OBJECT_BY_PRODUCT: Record<ProductType, PaymentObject> = {
  // Цифровые услуги — AI-генерация
  pack_1:      'service',
  pack_10:     'service',
  pack_50:     'service',
  animation:   'service',
  voiceover:   'service',
  // Физические товары
  poster:      'commodity',
  painting:    'commodity',
  postcard:    'commodity',
  puzzle:      'commodity',
};

export const PAYMENT_METHOD: PaymentMethod = 'full_payment';
export const TAX: Tax = 'none';  // УСН 6% — НДС не выделяется
```

**Важно:** маппинг будет валидирован бухгалтером Дениса перед запуском продакшна. Правка одной строки без миграций БД.

---

## 7. KPI и бюджеты

- **CAC:** < 700 ₽
- **LTV (за 4 недели):** > 1200 ₽
- **K-factor (вирусность):** 0.4–0.6
- **`unverifiedAfter24h`:** < 5%
- **Тестовый бюджет на трафик:** 50–100 тыс. ₽ × 3 недели (Яндекс.Директ + VK Ads)
- **MVP-готовность:** 5–7 недель от старта разработки

---

## 8. Следующие шаги после архитектуры

1. Создать репозиторий по структуре из раздела 2.
2. Завести `db/schema/*` по разделу 3.
3. Запустить `drizzle-kit generate` → `drizzle-kit push`.
4. **Параллельно (не блокирует разработку):** собрать Оффер по 5 рычагам (Слой 2 карты).
5. Стартовать неделю 1 по rollout-плану PRD (лендинг + двухступенчатая генерация на dev).

---

## 9. Источники

- `IDEA_v3.6.md` — кристаллизованная идея
- `PRD_v2.md` — PRD по шаблону
- `PROMPT_FOR_CLAUDE_ARCHITECTURE.md` — архитектурный промпт
- `ANSWERS_FOR_CLAUDE_ARCHITECTURE.md` — ответы на первые 7 вопросов Claude
- `ANSWERS_FOR_CLAUDE_ARCHITECTURE_v2.md` — ответы на 4 финальных вопроса Claude
- Финальное сообщение Claude от 16 мая 2026 (унаследовано в этот файл)
