# Как выложить Aurora на GitHub

Жюри нужен **исходный код с историей**. Ключ Groq в репозиторий не кладём.

**Сейчас в этой папке Git ещё не инициализирован, а `git` может быть не установлен.** Не делайте `git init`, пока не установите [Git for Windows](https://git-scm.com/download/win) и не проверите список файлов.

## Перед любым commit

```powershell
cd C:\Users\malik\aurora
git status
```

В индексе **не должно быть**:

- `server/.env`
- `.env`, `.env.local`
- `node_modules/`
- `dist/`

Если `server/.env` виден в `git status` — **остановитесь** и проверьте `.gitignore`.

Рекомендуемое сообщение:

```text
chore: prepare Aurora for LOCUS hackathon submission
```

Не делайте `git rebase`, squash всей истории и `push --force`. После первого commit:

```powershell
git remote add origin https://github.com/ВАШ_ЛОГИН/aurora.git
git push -u origin main
```

Push только когда remote и доступ к GitHub подтверждены.

## Если Git ставить нельзя: загрузка через сайт

1. https://github.com → **New repository**, имя `aurora`.
2. **Не** включайте «Add a README» — файл уже в проекте.
3. Загрузите содержимое проекта **без** `node_modules`, `dist` и `server/.env`.
4. Проверьте на GitHub, что секретов нет.
5. Вставьте URL репозитория в README (блок Deployment) и в форму AIstartify.

Пустой репозиторий для жюри не засчитывается: нужен исходный код.

## После загрузки

Подставьте Live demo и GitHub URL в `README.md`.  
Тестовый логин не нужен.
