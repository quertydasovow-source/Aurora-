# Техническая справка — Aurora

LOCUS Startup Hackathon 2026, кейс 02, код `LOCUSCASE2`.

## Модели и API

- Groq Chat Completions, модель `openai/gpt-oss-20b`.
- Вызов только с сервера (`server/index.mjs`), endpoint `POST /api/recommendations`.
- Формат ответа: JSON Schema. Поле `reasoning_effort: low`.
- Без ключа сервис отдаёт rule-based маршрут и пишет, что AI-пояснения недоступны.

## Библиотеки

React 19, React DOM, Vite, TypeScript, Tailwind CSS v4, Express 5, groq-sdk, dotenv, cors, concurrently. Полный список — `package.json`.

## Данные

- `src/data/catalog.json` — 15 программ бакалавриата, источники URL в полях записи.
- `src/data/opportunities.json` — пустой каталог курсов (не выдумываем ссылки).
- Состояние пользователя — `localStorage`, без облачной БД.

## Как проверяем результат

- Код фильтрует каталог до вызова модели.
- `validateRecsJson.mjs` отбрасывает чужие `programId`.
- Тесты: `npm test` (каталог, статусы, бюджет, экзамены, пустые курсы).
- Сборка: `npm run build`.

## Безопасность

- `GROQ_API_KEY` только в `server/.env`, файл в `.gitignore`.
- Нет `VITE_`-ключа в клиенте.
- Лимит частоты запросов на IP.
- Текст анкеты передаётся как данные, не как инструкции модели.

## Ограничения

Не подтверждаем дедлайны и цены вне каталога. Не считаем вероятность поступления. Не конвертируем валюту. Не копируем интерфейс LOCUS.
