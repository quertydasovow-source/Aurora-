# Как залить Aurora на GitHub

Жюри нужно видеть **исходный код**. Ключ Groq в репозиторий не кладём.

Готовый набор файлов без `node_modules` и секретов лежит на рабочем столе:

`C:\Users\malik\Desktop\aurora-github`

Если папки нет — возьмите проект `C:\Users\malik\aurora`, но **не** загружайте `node_modules`, `dist` и `server/.env`.

## Вариант А. Сайт GitHub, без установки Git

1. Войдите на https://github.com → **New repository**.
2. Имя: `aurora`. Описание: `Персональный маршрут поступления — LOCUS Case 2`.
3. Public (или Private + доступ жюри). **Не** ставьте галочку «Add a README» — README уже в папке.
4. После создания: **uploading an existing file** → перетащите **содержимое** папки `aurora-github` (файлы `README.md`, `src`, `server`, `package.json` и т.д.).
5. Commit message: `Aurora: маршрут поступления для LOCUS Case 2`.
6. Проверьте на GitHub, что **нет** файла `server/.env` и папки `node_modules`.
7. Скопируйте URL репозитория в форму AIstartify.

Если GitHub пишет, что файлов слишком много — вы случайно схватили `node_modules`. Загружайте только папку с рабочего стола.

## Вариант Б. Git в терминале (лучше: будет история коммитов)

История коммитов для хакатона желательна. Если Git ещё не установлен: https://git-scm.com/download/win — затем новый терминал.

```powershell
cd C:\Users\malik\aurora
git init -b main
git add .
git status
```

В списке **не должно быть** `server/.env`, `.env`, `node_modules`.

```powershell
git commit -m "Aurora: маршрут поступления для LOCUS Case 2"
git remote add origin https://github.com/ВАШ_ЛОГИН/aurora.git
git push -u origin main
```

## После загрузки

Вставьте ссылку в README (блок «Рабочий сайт») и в `docs/SUBMIT.md`.  
До дедлайна 19 сентября 12:00 (Астана) фиксируйте финальную версию в ветке `main`.
