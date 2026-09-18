# Техническая справка — Aurora

LOCUS Startup Hackathon 2026, кейс 02, код `LOCUSCASE2`.

Краткая справка для жюри: модели, API, библиотеки, данные и методы проверки. Расширенное описание — в корневом `README.md`.

## Модели и API

Провайдер: **Groq Chat Completions**. Ключ только на сервере (`GROQ_API_KEY`). В клиентском бандле ключа нет, префикс `VITE_` не используется.

| Endpoint | Модель | Роль |
| --- | --- | --- |
| `GET /api/health` | — | статус сервера, `groqConfigured`, число программ |
| `POST /api/recommendations` | `openai/gpt-oss-20b` (`GROQ_MODEL`) | пояснения к уже отфильтрованному списку |
| `POST /api/profile-advice` | `openai/gpt-oss-120b` (`GROQ_ADVICE_MODEL`) | советы «как усилить профиль» |

Формат ответа: JSON Schema / `json_object`.  
Опциональный Cloudflare Pages Function: `functions/api/profile-advice.js` (тот же ключ из `context.env.GROQ_API_KEY`).

LLM **не** определяет eligibility, дедлайны, tuition и официальные требования. Это делает `src/lib/recommendations/filterPrograms.ts` по `src/data/catalog.json`.

Без ключа или при ошибке Groq сервер отвечает `mode: "rules"`. UI не ломается.

## Библиотеки и сервисы

Из `package.json`:

- React 19, react-dom
- Vite 8, TypeScript, Tailwind CSS v4 (`@tailwindcss/vite`)
- Express 5, cors, dotenv, groq-sdk
- concurrently, oxlint (dev)

Шрифт: Manrope (Google Fonts).  
Внешний UI-kit не подключён. Облачной БД нет.

## Данные

- `src/data/catalog.json` — 15 программ бакалавриата; source URLs в записях.
- `src/data/opportunities.json` — внешние курсы; пустые ссылки не выдумываются.
- Состояние пользователя — `localStorage` (`aurora-admission-state-v3`).
- Кеш AI-советов — `sessionStorage`.

## Как проверяем результат

- Фильтрация каталога выполняется до вызова модели.
- `server/recommendations/validateRecsJson.mjs` отбрасывает чужие `programId`.
- Тесты: `npm test` (`server/recommendations.test.mjs`) — каталог, статусы, бюджет, экзамены.
- Сборка: `npm run build` (`tsc -b && vite build`).
- Lint: `npm run lint` (oxlint).

## Безопасность

- `GROQ_API_KEY` только в gitignored `server/.env` / `.env.local` или в секрете хостинга.
- Нет ключа в README, исходниках React и `VITE_*`.
- Лимит частоты запросов на IP для `/api/recommendations`.
- Текст анкеты передаётся как данные, не как инструкции менять правила подбора.

## Ограничения

Не подтверждаем дедлайны и цены вне каталога. Не считаем вероятность поступления. Не конвертируем валюту. Финальные условия пользователь сверяет на сайте университета.
