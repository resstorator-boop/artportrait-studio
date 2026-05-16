# NUMERO

AI-платформа арт-фотосессий. Пользователь загружает селфи и получает портреты в стиле культовых фотографов и режиссёров.

## Стек

Next.js 16 · TypeScript · Drizzle + Neon · Clerk · Inngest · Cloudflare R2 · Robokassa · Unisender Go · Claude Vision · Flux/fal.ai

## Быстрый старт

```bash
# 1. Установить зависимости
pnpm install

# 2. Скопировать переменные окружения
cp .env.example .env.local
# Заполнить .env.local реальными значениями

# 3. Применить схему БД (dev)
pnpm db:push

# 4. Запустить dev-сервер
pnpm dev

# 5. В отдельном терминале — Inngest dev-сервер
pnpm inngest:dev
```

## Команды

```bash
pnpm dev          # Next.js dev-сервер
pnpm typecheck    # tsc --noEmit
pnpm lint         # ESLint
pnpm format       # Prettier
pnpm test         # Vitest (unit)
pnpm test:e2e     # Playwright (e2e)

pnpm db:generate  # Drizzle: сгенерировать миграции
pnpm db:push      # Drizzle: применить схему (dev only)
pnpm db:migrate   # Drizzle: применить миграции (prod)
pnpm db:studio    # Drizzle Studio (GUI)

pnpm inngest:dev  # Inngest local dev server
```

## Документация

- [`docs/ARCHITECTURE_FINAL.md`](docs/ARCHITECTURE_FINAL.md) — финальная архитектура
- [`docs/PRD_v2.md`](docs/PRD_v2.md) — продуктовые требования
- [`docs/IDEA_v3.6.md`](docs/IDEA_v3.6.md) — идея и позиционирование
- [`docs/PROJECT_MAP.md`](docs/PROJECT_MAP.md) — карта слоёв проекта
- [`CLAUDE.md`](CLAUDE.md) — инструкции для Claude Code
