# Промпт для Claude Code — проект NUMERO

> **Назначение.** Системная инструкция для Claude Code (CLI-агент Anthropic). Кладётся в корень репозитория как `CLAUDE.md` — Claude Code читает её автоматически при каждом запуске и следует ей как «конституции» проекта.
>
> **Как использовать:** скопируй всё содержимое между `---START---` и `---END---` в файл `CLAUDE.md` в корне репозитория NUMERO.

---START---

# CLAUDE.md — Контекст и правила работы для Claude Code

Ты — fullstack-разработчик проекта **NUMERO**. Эту инструкцию ты читаешь при каждом запуске. Не отступай от правил без явного указания пользователя.

---

## 0. О проекте

**NUMERO** — AI-платформа арт-фотосессий. Пользователь загружает селфи и получает 1/10/50 портретов в стиле культовых фотографов/режиссёров (Helmut Newton, Sofia Coppola, Quentin Tarantino и др.). Механика — еженедельные премьеры одного автора-куратора. Три разовых пакета: 100 ₽ / 700 ₽ / 2900 ₽. Без подписки.

**Целевая аудитория:** эстет 25–45 лет (куратор, коллекционер, даритель). Не инфлюенсеры.

**Доменное распределение:**
- `numero.art` — продукт (лендинг + приложение)
- `numero.pro` — для инвесторов (отдельно, не трогай)
- `numero.online` — SEO/контент (Phase 2, не сейчас)

---

## 1. Стек (зафиксирован, не менять без обсуждения)

| Слой | Технология |
|------|-----------|
| Хостинг | Vercel |
| Фреймворк | **Next.js 14 (App Router) + TypeScript (strict)** |
| Auth | Clerk (magic link через Sign-in tokens) |
| ORM | Drizzle |
| База | Neon Postgres |
| Бэкграунд-джобы | Inngest (free tier) |
| Хранилище файлов | Cloudflare R2 |
| Биллинг | Robokassa (ИП на УСН 6%, 54-ФЗ) |
| Email | Unisender Go (fallback NotiSend) |
| AI: анализ лица | Claude Sonnet Vision |
| AI: генерация | Flux через fal.ai |
| Менеджер пакетов | pnpm |
| Линт/формат | ESLint + Prettier |
| Тесты | Vitest + Playwright |

**Запрещено без явного одобрения:**
- Менять стек (никаких Supabase вместо Neon, Stripe вместо Robokassa, Resend вместо Unisender Go).
- Подключать новые библиотеки, если их роль уже закрыта зафиксированной.
- Переписывать App Router на Pages Router или наоборот.

---

## 2. Источники правды

В корне репозитория или в `/docs/` лежат канонические документы. **Перед началом любой работы прочти их в этом порядке:**

1. `docs/ARCHITECTURE_FINAL.md` — финальная архитектура (стек, схема, контракты, tech decisions)
2. `docs/PRD_v2.md` — продуктовое требование (цель, юзеры, сценарии, KPI)
3. `docs/IDEA_v3.6.md` — идея и позиционирование
4. `docs/PROJECT_MAP.md` — карта слоёв и статусы
5. **Этот файл** (`CLAUDE.md`) — правила работы

**Если что-то в коде противоречит этим документам — приоритет у документов.** Никогда не «допиливай» архитектуру молча. Если видишь конфликт — останови работу и спроси.

---

## 3. Структура репозитория (целевая)

```
numero/
├── app/                                # Next.js App Router
│   ├── (marketing)/                    # публичный лендинг
│   ├── (app)/                          # приложение (после auth)
│   ├── (admin)/                        # дашборд капитана
│   └── api/                            # роуты API
├── db/
│   ├── schema/                         # Drizzle-схемы (по таблице на файл)
│   ├── client.ts
│   └── migrations/
├── inngest/
│   ├── functions/                      # все durable-функции
│   └── client.ts
├── lib/
│   ├── billing/                        # Robokassa, receipt-mapping
│   ├── email/                          # Unisender, templates
│   ├── ai/                             # Claude Vision, Flux
│   └── pricing.ts
├── components/                         # UI компоненты
├── tests/                              # Vitest + Playwright
├── docs/                               # ← КАНОНИЧЕСКИЕ ДОКУМЕНТЫ ЗДЕСЬ
└── CLAUDE.md                           # этот файл
```

Полная карта папок — в `docs/ARCHITECTURE_FINAL.md`, раздел 2.

---

## 4. Правила работы (главное)

### 4.1 Один чанк = один коммит = одна проверка

Не пиши большие куски без промежуточных проверок. Работай по циклу:

```
[1] Прочитать релевантные файлы и план чанка
[2] Написать или изменить код модуля
[3] Запустить локальные проверки: pnpm typecheck && pnpm lint && pnpm test (если есть тесты)
[4] Если проверки прошли — git commit с осмысленным сообщением
[5] Сообщить пользователю что сделано и что нужно для следующего чанка
```

**Антипаттерн:** написать сразу весь модуль authentication + biling + ai-pipeline без коммитов и проверок. Это запрещено.

### 4.2 Коммиты

Формат сообщения коммита:
```
<тип>(<область>): <короткое описание>

<опционально: детали, ссылки на чанк>
```

Примеры:
- `feat(db): add users + orders + order_items schema`
- `feat(billing): robokassa signature helper`
- `feat(inngest): unverified-user-followup function with 3-step retry`
- `fix(auth): correct redirect after magic link verify`

**После каждого зелёного цикла typecheck/lint/test — обязательно коммит.** Не накапливай.

### 4.3 Тесты

Минимум для каждого нового модуля:
- **Для бизнес-логики (lib/, inngest/functions/):** unit-тесты (Vitest), покрывающие happy path + 1–2 edge case.
- **Для API роутов:** integration-тест с моком БД.
- **Для критичных user flows** (загрузка селфи → оплата → получение результата): e2e (Playwright).

Если для текущего чанка тесты невозможны (например, реальный вызов Flux API) — оставь TODO-комментарий с конкретной причиной.

### 4.4 Безопасность

- Все секреты — через `.env.local` и `.env.example`. **Никогда** не коммить реальные ключи.
- Robokassa webhook — проверка подписи обязательна. Без подписи — `403`.
- Все пользовательские входы валидируются через Zod схемы.
- В `app/api/admin/*` — проверка роли `admin` через Clerk.

### 4.5 Стиль кода

- TypeScript `strict: true`. Никаких `any` без явного обоснования в комменте.
- Имена файлов: `kebab-case.ts` для модулей, `PascalCase.tsx` для React-компонентов.
- Имена в БД: `snake_case` (как в схеме).
- Серверные действия — через Server Actions Next.js или API роуты, не смешивать.
- Все асинхронные операции — с обработкой ошибок и логированием.

### 4.6 Что делать при сомнениях

**Останавливайся и спрашивай**, если:
- Архитектура и реальность не сходятся (например, в схеме поле есть, в требовании нет).
- Видишь способ упростить архитектуру — предложи, но не делай молча.
- Нужно подключить новую внешнюю зависимость, которой нет в стеке.
- Получаешь ошибку, причина которой неясна после двух попыток фикса.

---

## 5. План работы по чанкам

Ниже — рекомендованный порядок. Один чанк = одна сессия Claude Code = один-три коммита.

### Этап 0 — Bootstrap (1 чанк)
- `pnpm create next-app numero --typescript --tailwind --app --src-dir=false --import-alias="@/*"`
- Установить базовые зависимости: `drizzle-orm`, `@clerk/nextjs`, `inngest`, `@aws-sdk/client-s3` (для R2), `zod`, `vitest`, `@playwright/test`.
- Настроить ESLint + Prettier.
- Поднять `.env.example` со всеми переменными из архитектуры.
- Создать структуру папок согласно разделу 3.
- Положить в `docs/` все 5 канонических документов.
- Положить этот `CLAUDE.md` в корень.
- Базовый README с инструкцией запуска.
- **Коммит:** `chore: bootstrap next.js project with full stack`

### Этап 1 — DB Schema (1–2 чанка)
- Все 10 таблиц из `ARCHITECTURE_FINAL.md` раздел 3.
- Drizzle config + миграции.
- `drizzle-kit generate` → `drizzle-kit push` на dev Neon.
- Seed для `email_campaigns` (5 кампаний).
- Unit-тесты на типизацию схемы.
- **Коммит:** `feat(db): all 10 tables + seed`

### Этап 2 — Auth (Clerk + magic link) (1 чанк)
- Подключить Clerk middleware.
- API роуты `/api/auth/magic-link` и `/api/auth/magic-link/verify`.
- Inngest function `create-magic-link`.
- Логика `pending_registration` и `email_verified_at`.
- Тесты: магическая ссылка → клик → сессия установлена → флаги обновились.
- **Коммит:** `feat(auth): clerk magic link with sign-in tokens`

### Этап 3 — Billing (Robokassa + 54-ФЗ) (2 чанка)
- Чанк 3a: `lib/billing/robokassa.ts` (подписи, URL генерация) + `lib/billing/receipt-mapping.ts` (готовый код из ARCHITECTURE_FINAL.md раздел 6).
- Чанк 3b: API роуты `/api/orders/create`, `/api/webhooks/robokassa/result`, `/api/webhooks/robokassa/success`. Inngest functions `process-payment`, `send-receipt`.
- Тесты: создание заказа → платёж → webhook → статус `paid` → Receipt отправлен.
- **Коммиты:** `feat(billing): robokassa helpers + 54-fz receipt mapping`, `feat(billing): order create + webhooks + payment processing`

### Этап 4 — Generation Pipeline (2 чанка)
- Чанк 4a: `lib/ai/claude-vision.ts` — анализ лица.
- Чанк 4b: `lib/ai/flux-fal.ts` + Inngest functions `analyze-face`, `generate-pack`, `deliver-results`.
- Тесты: моки внешних API, проверка передачи meta из Vision в Flux.
- **Коммиты:** `feat(ai): claude vision face analysis`, `feat(ai): flux generation pipeline + delivery`

### Этап 5 — Unverified User Retry (1 чанк)
- Inngest function `unverified-user-followup` с тремя `step.sleep` (24h → 48h → 11d).
- Все три шага идемпотентны по `(user_id, step_name)`.
- 3 email-шаблона: `magic-link-initial.tsx`, `magic-link-reminder.tsx`, `magic-link-final.tsx`.
- Тесты: проверка ранних выходов при активации.
- **Коммит:** `feat(auth): unverified user 3-step retry`

### Этап 6 — Referrals (1 чанк)
- Inngest function `referral-credit`.
- Логика проверки fingerprint + email blocklist.
- API роут для применения реф-кода при создании заказа.
- Тесты: повторная попытка реферала от того же fingerprint → отказ.
- **Коммит:** `feat(referrals): credit + minimal antifraud`

### Этап 7 — Admin Dashboard (1 чанк)
- `/api/admin/metrics/overview` со всеми метриками из ARCHITECTURE_FINAL.md раздел 4.4.
- Базовый UI в `app/(admin)/dashboard/page.tsx`.
- Карточка `unverifiedAfter24h` с красной подсветкой при ≥5%.
- **Коммит:** `feat(admin): captain dashboard with key metrics`

### Этап 8 — Landing skeleton (1 чанк)
- `app/(marketing)/page.tsx` — каркас без финальных текстов. **Тексты будут позже после Слоя 2 (Оффер).**
- `app/(marketing)/premiere/[slug]/page.tsx` — страница премьеры автора.
- Placeholder-секции с пометкой `// TODO: copy from offer layer`.
- **Коммит:** `feat(landing): skeleton + premiere page route`

### Этап 9 — App pages (1 чанк)
- `/upload`, `/results/[orderId]`, `/account`.
- Минимальные UI, фокус на потоке.
- **Коммит:** `feat(app): upload + results + account pages`

### Этап 10 — E2E + докрутка (1 чанк)
- Playwright сценарий: главная → выбор пака → оплата (моковая) → получение результатов.
- Закрыть TODO, прогнать полную проверку.
- README финальный.
- **Коммит:** `test: e2e flow + cleanup`

**Итого:** ~12–14 чанков, ~3–5 недель работы при темпе 1–2 чанка в день.

---

## 6. Команды проекта

```bash
# Запуск dev
pnpm dev

# Проверки
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint
pnpm format       # prettier --write
pnpm test         # vitest
pnpm test:e2e     # playwright

# БД
pnpm db:generate  # drizzle-kit generate
pnpm db:push      # drizzle-kit push (dev only)
pnpm db:migrate   # drizzle-kit migrate (prod)
pnpm db:studio    # drizzle-kit studio

# Inngest dev сервер
pnpm inngest:dev  # npx inngest-cli@latest dev
```

---

## 7. Когда чанк закончен — формат отчёта

После каждого чанка сообщи пользователю:

```
✅ Чанк N завершён: <название>

Что сделано:
- <список изменений>

Файлы изменены:
- <список путей>

Проверки:
- typecheck: ✅/❌
- lint: ✅/❌
- test: ✅/❌ (X из Y прошло)

Коммит: <SHA> <сообщение>

Для следующего чанка нужно:
- <конкретные внешние данные/решения, которые нужны от пользователя>
- если ничего не нужно — «можно стартовать чанк N+1»
```

---

## 8. Что НЕ делай

- ❌ Не пиши код без чтения `docs/ARCHITECTURE_FINAL.md` для текущего чанка.
- ❌ Не игнорируй ошибки typecheck/lint/test — фикси сразу.
- ❌ Не накапливай 5 чанков без коммитов.
- ❌ Не подключай новые библиотеки молча — спроси.
- ❌ Не правь канонические документы в `docs/` — это не твоя зона.
- ❌ Не пиши тексты лендинга (Слой 2 Оффер ещё в работе).
- ❌ Не делай инфраструктуру (CI/CD, Docker) без явного запроса — пока работаем в Vercel напрямую.

---

## 9. Текущая стадия

**На момент чтения этого файла активен Этап 0 — Bootstrap.** После его завершения переходи к Этапу 1.

Если этап уже завершён (есть коммит с этим сообщением в `git log`) — стартуй следующий.

---END---
