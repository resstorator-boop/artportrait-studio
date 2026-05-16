# NUMERO — План миграции существующего репозитория

> **Контекст.** Уже есть репозиторий `C:\Users\79200\artportrait-studio` на GitHub. Он был сделан под предыдущую версию проекта (ArtPortrait Studio, личный брендинг для инфлюенсеров, Stripe). Сейчас задача — **переделать его под актуальную архитектуру NUMERO** (эстет 25–45, премьеры авторов, Robokassa, без подписки), сохранив историю Git.

---

## Стратегия: «Чистый перезапуск с сохранением истории»

Что делаем:
1. **Сохраняем старый код в ветке `legacy`** — на случай если что-то полезное оттуда понадобится (тексты, ассеты, идеи).
2. **На `main` всё пересобираем заново по `ARCHITECTURE_FINAL.md`** — старый код не «допиливаем», а делаем чистый старт.
3. **Имя репозитория оставляем `artportrait-studio`** — переименование не нужно, ребрендинг произошёл внутри (проект называется NUMERO, но это не критично для имени папки).

**Почему не переименовываем:**
- Уже настроены деплои Vercel, webhooks, возможно интеграции
- Имя репо не влияет ни на код, ни на пользователей
- При желании переименуем потом одной командой в GitHub Settings

---

## Часть 1 — Подготовка (15 минут)

### Шаг 1.1 — Открой репозиторий

```powershell
cd C:\Users\79200\artportrait-studio
git status
git log --oneline -10
```

Посмотри, в каком состоянии репозиторий: есть ли несохранённые изменения, какие последние коммиты.

### Шаг 1.2 — Закоммить всё что не закоммичено

Если `git status` показывает изменения:

```powershell
git add .
git commit -m "chore: snapshot before NUMERO migration"
git push
```

### Шаг 1.3 — Создай ветку legacy с текущим состоянием

```powershell
git checkout -b legacy
git push -u origin legacy
git checkout main
```

Теперь весь старый код сохранён в `legacy`. Если что-то понадобится — можно посмотреть через `git checkout legacy -- path/to/file` или просто в GitHub UI.

---

## Часть 2 — Очистка main (30 минут)

### Шаг 2.1 — Что удалить с main

На ветке `main` оставляем только:
- `.git/` (история сохраняется)
- `.gitignore` (если хороший — Claude его обновит)
- `README.md` (Claude перепишет)
- `LICENSE` (если есть)

**Удаляем всё остальное:**
- Старый код приложения
- `node_modules/` (если есть в git — точно удалить)
- Старые конфиги (`next.config.js`, `package.json`, `tsconfig.json` — Claude создаст заново)
- Старые папки `app/`, `pages/`, `components/`, `lib/`, `prisma/`, и т.д.

### Шаг 2.2 — Команды очистки

В PowerShell в папке `artportrait-studio`:

```powershell
# Удаляем всё кроме .git, .gitignore, README.md, LICENSE
Get-ChildItem -Force | Where-Object { 
    $_.Name -notin @('.git', '.gitignore', 'README.md', 'LICENSE') 
} | Remove-Item -Recurse -Force
```

Проверь что осталось:
```powershell
Get-ChildItem -Force
```

Должно быть пусто кроме `.git` (и опционально `.gitignore`, `README.md`).

### Шаг 2.3 — Положи документы

Создай папку `docs/` и положи туда 5 файлов из Space:

```powershell
mkdir docs
```

Скачай из Space и помести в `docs/`:
- `ARCHITECTURE_FINAL.md`
- `PRD_v2.md`
- `IDEA_v3.6.md`
- `PROJECT_MAP.md`

Скачай из Space `PROMPT_FOR_CLAUDE_CODE.md`, переименуй в `CLAUDE.md` и положи в **корень** (не в docs/):

```powershell
# После того как файл скачан в корень репо
Rename-Item -Path "PROMPT_FOR_CLAUDE_CODE.md" -NewName "CLAUDE.md"
```

### Шаг 2.4 — Коммит очистки

```powershell
git add .
git commit -m "chore: reset to clean state for NUMERO migration, docs added"
git push
```

Теперь `main` пустой кроме `.git/`, `docs/`, `CLAUDE.md`.

---

## Часть 3 — Старт Claude Code

### Шаг 3.1 — Запусти Claude в папке репо

```powershell
cd C:\Users\79200\artportrait-studio
claude
```

### Шаг 3.2 — Стартовое сообщение для Claude

Скопируй это сообщение целиком:

```
Прочитай CLAUDE.md и docs/ARCHITECTURE_FINAL.md полностью.

Контекст:
- Это существующий репозиторий, который раньше был "ArtPortrait Studio" 
  (личный брендинг для инфлюенсеров, Stripe).
- Сейчас он переделывается под NUMERO (эстет 25-45, премьеры авторов, Robokassa).
- Старый код уже сохранён в ветке legacy и удалён с main. main сейчас почти пустой.
- Имя папки artportrait-studio оставляем, переименование не нужно.

Задача:
1. Прочитай CLAUDE.md и docs/ARCHITECTURE_FINAL.md
2. Расскажи кратко: что ты понял про проект, какой стек, в каком порядке будешь делать
3. Спроси у меня разрешение на старт Этапа 0 — Bootstrap
4. НЕ начинай писать код, пока я не скажу "поехали"
```

### Шаг 3.3 — Если Claude хочет посмотреть в legacy

Если Claude спросит «можно я посмотрю что было раньше в legacy?» — ответь:

```
Нет. В legacy лежит код от другого позиционирования продукта (Stripe, инфлюенсеры).
Он тебе не нужен и собьёт с актуального стека.
Делай чистый старт по docs/ARCHITECTURE_FINAL.md.
Если в legacy будет что-то полезное (например, текст для лендинга) — я сам тебе это передам.
```

---

## Часть 4 — Что будет дальше

После того как Claude прочитает документы и подтвердит план:

1. Скажи: **«поехали Этап 0 Bootstrap»**
2. Claude предложит `pnpm create next-app .` (точка = в текущей папке, не подпапку)
3. Подтверди по одной команде
4. После Этапа 0 — `git push`, потом `/clear`, потом «делай Этап 1 — DB Schema»
5. И так по всем этапам из CLAUDE.md раздел 5

---

## Часть 5 — Что важно про `pnpm create next-app` в непустой папке

Когда Claude запустит `pnpm create next-app .` в папке с уже существующим `docs/` и `CLAUDE.md` — он может спросить «папка не пустая, перезаписать?». 

**Правильный ответ — продолжить без перезаписи существующих файлов.** У Next.js CLI обычно есть опция `--yes` или интерактивный диалог. Если Claude не уверен — скажи:

```
pnpm create next-app . не должен удалять docs/ и CLAUDE.md.
Если CLI пытается их перезаписать — используй флаги или скопируй их в /tmp,
поставь next-app, потом верни на место.
```

---

## Часть 6 — Если что-то пошло не так

### Случай 1: Удалил не то

```powershell
git checkout main -- <путь к удалённому файлу>
# или полный откат
git reset --hard HEAD~1
```

### Случай 2: Нужно вернуться к legacy полностью

```powershell
git checkout legacy
# работаешь со старым кодом
git checkout main
# возвращаешься к новому
```

### Случай 3: Claude начал тащить старый код или старый стек

Останови (`Esc`):

```
Стоп. Прочитай ещё раз docs/ARCHITECTURE_FINAL.md разделы 1-3.
Ты используешь технологии не из стека — переделай.
Старый код в legacy игнорируй полностью.
```

---

## Чек-лист готовности к старту

- [ ] Открыта папка `C:\Users\79200\artportrait-studio` в PowerShell
- [ ] `git status` чистый, всё закоммичено
- [ ] Ветка `legacy` создана и запушена
- [ ] На `main` оставлены только `.git/`, `.gitignore`, `README.md`, `docs/`, `CLAUDE.md`
- [ ] В `docs/` лежат 4 файла: ARCHITECTURE_FINAL, PRD_v2, IDEA_v3.6, PROJECT_MAP
- [ ] В корне лежит `CLAUDE.md` (содержимое из PROMPT_FOR_CLAUDE_CODE.md)
- [ ] Очистка закоммичена и запушена
- [ ] Claude Code установлен и работает (`claude --version`)
- [ ] API-ключ Anthropic привязан

Если все галочки — запускай `claude` и кидай стартовое сообщение из части 3.2.
