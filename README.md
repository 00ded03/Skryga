# Skryga

Семейный финансовый планировщик на React, Vite, Dexie и Supabase Auth.

## Локальный запуск

1. Установите зависимости: `pnpm install`.
2. Скопируйте `.env.example` в `.env.local`.
3. Заполните переменные Supabase и OpenAI.
4. Запустите приложение: `pnpm dev`.

## Авторизация

Клиент использует Supabase Auth с email и паролем. Все страницы требуют активную сессию. API распознавания чеков принимает Bearer access token и проверяет пользователя через Supabase перед обращением к OpenAI.

Необходимые переменные:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

Переменные с префиксом `VITE_` доступны браузеру и должны содержать только публичный publishable key. Никогда не добавляйте в них Supabase secret key или service-role key.

Локальная IndexedDB привязывается к первому вошедшему пользователю. Другой аккаунт не сможет открыть данные предыдущего пользователя без их явного удаления.

## Облачная синхронизация

Миграция `supabase/migrations/20260829_initial_family_sync.sql` создаёт семейные пространства, участников, облачные записи, приглашения, Realtime и политики Row Level Security. После первого входа локальные данные автоматически получают UUID и синхронизируются с семейным пространством Supabase. Дальнейшие изменения передаются между устройствами через Realtime.

Владелец семьи может создать ссылку-приглашение в разделе «Настройки → Аккаунт». Ссылка действует семь дней и принимается только аккаунтом с email, указанным при создании приглашения.
