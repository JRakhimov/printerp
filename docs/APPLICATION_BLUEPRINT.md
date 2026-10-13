# Основа для новых Telegram Mini Apps

Этот документ описывает техническую основу PrintERP, которую можно использовать для следующих приложений: frontend, backend, общие контракты, PostgreSQL, Prisma, миграции, Telegram-авторизацию, локальную разработку и Docker-деплой.

Описание сверено с исходниками и `package-lock.json` проекта 8 октября 2026 года. Версии ниже фиксируют этот проект; при создании нового приложения совместимость выбранных версий нужно проверять отдельно. Разделы «Для нового приложения» описывают целевое устройство, которое может отличаться от текущей реализации.

## 1. Архитектура и стек

Приложение — npm workspaces монорепозиторий. Backend представляет собой модульный монолит: один процесс NestJS, внутри которого функциональность разделена на модули. Frontend — клиентское SPA, открываемое внутри Telegram или в браузере во время разработки.

```text
Telegram / браузер
    │
    ├── HTTPS → frontend: React SPA, в production раздаётся Nginx
    │                  │
    │                  └── REST/JSON + Bearer JWT → NestJS API
    │                                                 │
    │                                                 └── Prisma → PostgreSQL
    │
    └── Telegram Bot API ← backend: команды и уведомления

packages/shared → общие Zod-схемы, DTO, enum и типы для web и api
```

| Слой | Технологии в этом проекте | Назначение |
| --- | --- | --- |
| Runtime | Node.js 20 в Docker, npm workspaces | Запуск API, установка и сборка монорепозитория |
| Язык | TypeScript 5.9.3 в lockfile | Типизация frontend, backend и общих контрактов |
| Frontend | React 18.3.1, Vite 5.4.21 | Компоненты, dev-сервер, сборка SPA |
| UI | Tailwind CSS 3.4.19, Lucide React, clsx, tailwind-merge | Стили, иконки, условные классы |
| Серверные данные | TanStack Query 5.101.4, Axios 1.19.0 | Запросы, кеш, мутации и HTTP-клиент |
| Формы | React Hook Form 7.85.0, @hookform/resolvers, Zod 3.25.76 | Состояние и проверка форм |
| Telegram на frontend | `telegram-web-app.js`, `window.Telegram.WebApp` | `initData`, разворачивание Mini App, цвета Telegram |
| Backend | NestJS 10.4.22, Express | REST API, модули, dependency injection |
| Конфигурация и auth | @nestjs/config, @nestjs/jwt, Passport, passport-jwt | Переменные окружения, JWT, guards |
| База | PostgreSQL 16, Prisma / @prisma/client 5.22.0 | Схема, типизированный доступ, транзакции и миграции |
| Проверки | TypeScript, Jest, ts-jest; Supertest как зависимость | Проверка типов и backend-тесты |
| Инфраструктура | Docker, Docker Compose, Nginx | Контейнеры API, web и базы |
| Специфика PrintERP | MQTT, FFmpeg | Телеметрия и камеры 3D-принтеров; переносить только при необходимости |

Точные зависимости воспроизводятся через `npm ci` и `package-lock.json`. Диапазоны в `package.json` могут отличаться от фактически зафиксированных версий.

## 2. Структура репозитория

```text
apps/
  api/
    src/
      main.ts                  # Bootstrap, CORS, глобальные pipes и filters
      app.module.ts            # Подключение функциональных модулей
      database/                # Глобальный PrismaService
      common/                  # ZodValidationPipe, HttpExceptionFilter
      modules/
        auth/                  # Telegram initData, JWT, guards
        users/                 # Пользователи и allowlist
        health/                # Проверка доступности БД
        <feature>/             # Controller, service, module
    test/                      # Backend-тесты
    Dockerfile
  web/
    src/
      components/              # Общие компоненты и модальные окна
      pages/                   # Экраны приложения
      hooks/                   # TanStack Query hooks и UI hooks
      contexts/                # AuthProvider, ThemeProvider
      lib/api-client.ts        # Axios и JWT
      types/telegram.d.ts      # Типы Telegram WebApp
      App.tsx
    Dockerfile
packages/
  shared/
    src/
      dto/                     # Zod-схемы запросов и типы DTO
      enums/
      types/
      constants/
      index.ts                 # Публичные экспорты
prisma/
  schema.prisma
  migrations/<timestamp_name>/migration.sql
  migrations/migration_lock.toml
  seed.ts
.env.example
docker-compose.yml
package.json
package-lock.json
```

В новом приложении оставить эту структуру, заменить названия workspace-пакетов и предметные модули. `auth`, `users`, `health`, `database` и общие контракты могут составить базовый каркас.

## 3. Frontend

### Состояние и запросы

- Компонентное UI-состояние хранится в React hooks; авторизация и тема — в Context.
- Серверные данные загружаются через TanStack Query hooks в `src/hooks/`.
- Все HTTP-запросы используют один `apiClient`; API URL берётся из `VITE_API_BASE_URL`, fallback — `http://localhost:3011`.
- В `queryKey` включаются параметры, влияющие на результат: например, `['orders', filters]`.
- Создание, обновление и удаление оформляются как `useMutation`; после успеха инвалидируются связанные запросы.
- Для телеметрии принтеров используется polling раз в 4–5 секунд. WebSocket для этого потока в текущем приложении не используется.
- Формы используют React Hook Form и общие Zod-схемы. Сервер повторно валидирует входные данные.

В новом модуле цепочка обычно такая: страница → hook → `apiClient` → API; компоненты не должны знать устройство Prisma или пароль базы.

### Навигация и Telegram UI

В текущем `App.tsx` навигация устроена через состояние вкладок, без React Router. Основные экраны загружаются через `React.lazy` и `Suspense`. Для приложения с отдельными URL и deep links маршрутизацию нужно добавить явно.

Telegram SDK подключается в `apps/web/index.html`. При открытии вызываются `ready()` и `expand()`, на поддерживаемых клиентах отключаются вертикальные свайпы и задаются цвета. Дополнительные методы вызываются с проверкой доступности. Для мобильного интерфейса используются safe-area отступы; выбранная тема сохраняется в `localStorage`.

JWT хранится в `localStorage` под ключом `printerp_jwt_token` и добавляется в `Authorization`. После ответа `401` HTTP-клиент удаляет токен. При запуске `AuthProvider` снова выполняет Telegram login; refresh-token flow и автоматическое обновление сессии сейчас отсутствуют.

При переносе переименовать ключи `localStorage`, бренд, заголовки, Telegram-цвета и домены в `vite.config.ts`. Vite в этом проекте разрешает дополнительные hosts явно.

### Telegram SDK: раскрытие окна, свайпы и цвета

Начальная настройка выполняется прямо в `index.html`, после подключения SDK и до загрузки React. Затем те же вызовы повторяются в `AuthContext.tsx` при авторизации. Так настройки применяются уже во время первого открытия страницы, а не только после загрузки экранов.

Сокращённый вариант **существующей** инициализации:

```js
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  if (typeof tg.disableVerticalSwipes === 'function') {
    tg.disableVerticalSwipes();
  }
  if (typeof tg.setHeaderColor === 'function') {
    tg.setHeaderColor('#0f172a');
  }
  if (typeof tg.setBackgroundColor === 'function') {
    tg.setBackgroundColor('#020617');
  }
}
```

`ready()` сообщает о готовности интерфейса; `expand()` раскрывает окно на максимальную доступную высоту. Полноэкранный режим запрашивается отдельно через `requestFullscreen()` (Bot API 8.0+). В PrintERP этот метод только объявлен в типах, но для Mini App не вызывается. Fullscreen камеры через DOM `element.requestFullscreen()` — отдельная функция. [Справочник Telegram WebApp](https://core.telegram.org/bots/webapps#initializing-mini-apps).

`disableVerticalSwipes()` отключает жест сворачивания/закрытия из области Mini App, сохраняя возможность свайпа по Telegram header. Это не CSS-блокировка прокрутки страницы. В текущем коде метод вызывается с проверкой наличия. [Поведение жестов в Telegram SDK](https://core.telegram.org/bots/webapps#initializing-mini-apps).

Цвета текущей реализации:

| Место настройки | Верхняя панель Telegram | Фон окна Telegram |
| --- | --- | --- |
| Ранний запуск и авторизация | `#0f172a` — slate-900 | `#020617` — slate-950 |
| Тёмная тема в `ThemeContext` | `#0f172a` | `#0f172a` |
| Светлая тема в `ThemeContext` | `#ffffff` | `#f8fafc` |

Собственный Header использует `bg-slate-900/95` и blur, основной экран — `bg-slate-950`. Благодаря близким цветам панель Telegram визуально продолжается в приложении. В светлой теме CSS меняет фон Header на полупрозрачный белый.

Сейчас цвета назначаются в трёх местах: `index.html`, `AuthContext`, `ThemeContext`. Последний выполненный вызов определяет цвет Telegram chrome; повторная авторизация может снова выставить тёмные цвета. Для нового приложения оставить раннюю инициализацию, а дальнейшее обновление цветов централизовать в одном theme-aware helper.

`setBottomBarColor()` не используется. `themeParams` и `colorScheme` описаны в типах SDK, но выбор темы приложения определяется собственным переключателем и `localStorage`, с тёмной темой по умолчанию.

### Viewport и отступы

В HTML задано:

```html
<meta name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
<meta name="theme-color" content="#0f172a" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```

Это текущая конфигурация мобильной страницы. Настройки Apple относятся к браузерному/standalone отображению и не заменяют вызовы Telegram SDK. При переносе ограничение пользовательского zoom пересмотреть с учётом доступности интерфейса.

Основная вёрстка:

- Корневой экран: `min-h-screen flex flex-col`.
- Header: `sticky top-0 z-30`, горизонтальные отступы `px-4`, вертикальные `py-2.5`.
- Контент: `flex-1 p-4 max-w-md mx-auto w-full` — ширина до 28rem с центрированием.
- Нижняя навигация: `fixed bottom-0 left-0 right-0 z-40`; её внутренний контент также ограничен `max-w-md`.
- Большинство модальных окон: `fixed inset-0 z-50` с карточкой `w-full max-w-md` или `max-w-lg`.

Чтобы последний элемент списка не оказался под фиксированной навигацией, в `App.tsx` предусмотрен запас снизу:

```css
/* Эквивалент Tailwind-класса main */
padding-bottom: calc(5rem + env(safe-area-inset-bottom, 0px));
```

Нижняя панель сама учитывает нижний inset:

```css
/* Эквивалент Tailwind-класса BottomNav */
padding-bottom: max(0.375rem, env(safe-area-inset-bottom, 0px));
```

Для большинства форм и detail-модалок задан верхний отступ:

```css
padding-top: max(
  1.5rem,
  var(--tg-content-safe-area-inset-top, 0px),
  calc(env(safe-area-inset-top, 0px) + 3.5rem)
);
```

Таким образом модалка использует наибольший из трёх отступов: минимальный, Telegram content inset или браузерный inset с дополнительным запасом. Это `max`, а не сложение всех трёх величин. Дополнительные `3.5rem` — выбранный проектом запас под верхние элементы, а не универсальная высота Telegram header. Модалки камеры и регистрации брака используют другую вёрстку; этот отступ применяется не ко всем диалогам.

В текущем основном Header нет отдельного верхнего safe-area padding; Telegram content inset используется в указанных модалках. Полноценный переход всего приложения в fullscreen требует адаптации общего Header и навигации, а не только вызова SDK.

Для нового fullscreen-каркаса учитывать device safe area (`--tg-safe-area-inset-*`) и Telegram content safe area (`--tg-content-safe-area-inset-*`) на всех краях. Для высоты можно использовать `--tg-viewport-stable-height` с browser fallback. В PrintERP эти viewport-переменные и обработчики `viewportChanged` пока не используются. [Safe area и viewport в Telegram](https://core.telegram.org/bots/webapps#initializing-mini-apps).

### Прокрутка и модальные окна

Основные формы и detail-модалки имеют `overflow-y-auto overflow-x-hidden touch-pan-y overscroll-y-contain`: вертикальная прокрутка разрешена внутри overlay, горизонтальное переполнение скрыто, цепочка overscroll ограничена этим контейнером. Карточки используют `min-w-0`, ограничения ширины и `overflow-hidden`; длинные списки внутри отдельных окон дополнительно ограничиваются по высоте.

`useBodyScrollLock()` добавляет класс `modal-open` на `body` и `html`, пока открыта модалка:

```css
body.modal-open,
html.modal-open {
  overflow: hidden !important;
  overscroll-behavior: none !important;
  touch-action: none;
}
```

Hook использует счётчик: закрытие одного вложенного окна не разблокирует фон, пока открыто другое. После закрытия всех окон класс и inline overflow удаляются. Это отдельный механизм от Telegram `disableVerticalSwipes()`. Сочетание блокировки touch на предках и прокрутки вложенного overlay следует проверить на целевых мобильных WebView.

В `body` также отключены tap highlight и выделение текста; в `input`/`textarea` выделение включено обратно. Header и BottomNav используют полупрозрачный фон с `backdrop-blur`, а overlay — затемнение и blur.

### Что ещё учесть в следующем Mini App

- Объединить настройку SDK и обновление цветов, чтобы авторизация не сбрасывала выбранную тему.
- Если нужен fullscreen, добавить отдельный запрос, проверку поддержки и адаптировать safe-area всего layout.
- Выделить общий компонент Modal с одинаковыми отступами и управлением scroll lock.
- Проверить длинные формы с открытой клавиатурой, вложенные модалки, landscape и нижнюю навигацию на iOS/Android.
- `BackButton`, `MainButton`, `HapticFeedback` и `enableClosingConfirmation` сейчас объявлены в типах, но не используются. Добавлять их в зависимости от сценариев интерфейса.
- В разделе «Ещё» закрытие приложения вызывает `Telegram.WebApp.close()`; кнопка «Назад» на внутренних экранах реализована собственными React-кнопками.

Исходники этих настроек: [HTML и ранний SDK init](../apps/web/index.html), [AuthContext](../apps/web/src/contexts/AuthContext.tsx), [ThemeContext](../apps/web/src/contexts/ThemeContext.tsx), [App layout](../apps/web/src/App.tsx), [Header](../apps/web/src/components/Header.tsx), [BottomNav](../apps/web/src/components/BottomNav.tsx), [CSS](../apps/web/src/index.css), [scroll lock](../apps/web/src/hooks/useBodyScrollLock.ts), [пример модального окна](../apps/web/src/components/CreateOrderModal.tsx).

## 4. Backend и общие контракты

### Организация модуля

Каждая предметная область получает NestJS-модуль:

- `*.controller.ts` — HTTP-маршруты, входные DTO, guards и параметры.
- `*.service.ts` — бизнес-правила, Prisma-запросы и транзакции.
- `*.module.ts` — providers, controllers, imports и exports.

Новый модуль подключается в `AppModule`. База предоставляется через глобальный `DatabaseModule`; создавать отдельный `PrismaClient` на каждый запрос не нужно.

### Контракты и валидация

`packages/shared` — место для Zod-схем запросов, типов ответов и общих enum. Тип DTO получается через `z.infer<typeof Schema>`. Контроллер применяет `ZodValidationPipe(Schema)`, а frontend может использовать ту же схему в форме.

Глобальный Nest `ValidationPipe` также включён, но проверка DTO, которые являются TypeScript-типами, обеспечивается явным Zod pipe. Наличие интерфейса само по себе не проверяет HTTP payload.

При расширении контракта нужно обновить схему, экспорт из `shared`, backend и frontend. API использует собранный `packages/shared/dist`; Vite настроен на alias к `packages/shared/src`. После изменения общих типов или схем при локальной работе пересобрать `shared`:

```bash
npm run build --workspace=packages/shared
```

Применять `ParseUUIDPipe` для UUID-параметров. Prisma-модели и клиент базы не импортировать во frontend; ответы с `BigInt`, Decimal и датами преобразовывать в согласованный JSON-контракт.

### HTTP и ошибки

API работает без глобального `/api` prefix: примеры маршрутов — `/auth/telegram`, `/me`, `/users`, `/orders`, `/health`. CORS настраивается через список `ALLOWED_ORIGINS`, разделённый запятыми.

`HttpExceptionFilter` приводит ошибки к виду:

```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Validation failed",
    "details": [{ "path": "name", "message": "Required", "code": "invalid_type" }]
  }
}
```

Backend определяет итоговые цены, права доступа и допустимость операций. Расчёты frontend служат предпросмотром.

## 5. PostgreSQL и Prisma

### Схема и подключение

`prisma/schema.prisma` задаёт datasource PostgreSQL через `DATABASE_URL` и генератор `prisma-client-js`. В генераторе перечислены binary targets для текущих платформ; при смене базового Docker-образа или архитектуры проверить их соответствие.

`PrismaService` подключается к БД в `onModuleInit`, выполняет heartbeat `SELECT 1` каждые пять минут и отключается в `onModuleDestroy`. Для полноценного graceful shutdown по сигналам контейнера в новом приложении также настроить Nest shutdown hooks; в текущем bootstrap `enableShutdownHooks()` не вызван.

Адрес БД зависит от того, где запущен API или Prisma CLI:

| Откуда подключаемся | Host в `DATABASE_URL` |
| --- | --- |
| API / Prisma CLI на компьютере, PostgreSQL опубликован на 5432 | `localhost:5432` |
| API в Docker, PostgreSQL в той же Docker-сети | `postgres:5432` |
| API в Docker, отдельная homelab-БД | DNS-имя или адрес БД, доступный из сети API |

`localhost` внутри API-контейнера обозначает этот контейнер. Browser URL для API, в свою очередь, должен быть доступен пользователю: браузер не использует внутреннее имя Docker-сервиса `api`.

### Правила моделирования

- Основные ID — UUID: `String @id @default(uuid()) @db.Uuid`.
- В Prisma используются camelCase-поля, в PostgreSQL — snake_case через `@map` и `@@map`.
- Telegram ID хранится как `BigInt @unique`, в JSON возвращается строкой.
- `createdAt` имеет `@default(now())`, `updatedAt` — `@updatedAt`.
- Для статусов используются enum; enum в Prisma и `shared` сейчас определены отдельно, их значения нужно синхронизировать.
- Связи и `onDelete` задаются явно. Например, позиции заказа удаляются каскадно, связь с удалённым проектом может обнуляться.
- У клиентов, материалов и проектов есть soft delete через `deletedAt`; запросы активного каталога фильтруют `deletedAt: null`.
- Индексы добавлены для используемых фильтров: статус, дата, клиент, принтер и другие поля.
- `Json` используется для дополнительных metadata, а ключевые поля и отношения представлены обычными колонками.

Предметные модели PrintERP: `User`, `Client`, `Filament`, `Project`, `ProjectFilament`, `Order`, `OrderItem`, `Payment`, `Transaction`, `Printer`, `PrintJob`, `ScrapRecord`, `OrderEvent`, `SystemSetting`. В другом приложении переносить только необходимые модели.

### Деньги и транзакции

Итоговые цены, суммы платежей и расходов хранятся как `Int`. В текущем seed это целые UZS. Для новой валюты зафиксировать единицу хранения: например, целые сумы либо копейки/центы, и использовать её одинаково в БД, API и UI.

Исключение — `Filament.costPerGram`, который хранится как `Decimal(10, 4)`. Сейчас некоторые расчёты преобразуют его в JS `Number` и округляют итог через `Math.round`. Поэтому наличие целочисленных итогов не означает, что все промежуточные вычисления выполняются без floating point. Если новому приложению нужна строгая десятичная арифметика, сохранить Decimal-арифметику до финального округления.

Связанные изменения выполнять через `prisma.$transaction(async (tx) => ...)`, передавая `tx` во вложенные сервисы. В PrintERP создание заказа, его позиций, первого платежа, события и списание материала выполняются в одной транзакции. Отмена заказа возвращает материал; повторная установка того же статуса не выполняет возврат снова.

Вызовы внешних сервисов размещать после успешной транзакции. В текущем создании заказа Telegram-уведомление отправляется после commit. При необходимости гарантированной доставки в новом приложении добавить outbox/очередь: сама транзакция PostgreSQL не гарантирует доставку Telegram-сообщения.

## 6. Prisma: генерация, миграции и seed

Все команды ниже выполняются из корня репозитория с `DATABASE_URL` нужной базы.

| Команда | Что делает | Когда использовать |
| --- | --- | --- |
| `npm run db:generate` | Генерирует Prisma Client по schema | После изменения schema; также во время сборки API |
| `npm run db:migrate -- --name add_feature` | Создаёт и применяет dev-миграцию | На локальной development-базе |
| `npm run db:migrate:deploy` | Применяет существующие pending-миграции | При деплое, без создания новых миграций |
| `npm run db:push` | Синхронизирует schema с БД без истории миграций | Для одноразовых прототипов, отдельно от рабочего migration flow |
| `npm run db:seed` | Запускает `prisma/seed.ts` | Для демоданных на подготовленной локальной БД |
| `npx prisma migrate status` | Показывает состояние истории миграций | Для диагностики |
| `npx prisma studio` | Открывает UI просмотра и редактирования БД | Для локальной работы |

### Изменение схемы

1. Изменить `schema.prisma`, общие DTO и бизнес-логику.
2. На development-базе выполнить `npm run db:migrate -- --name <описание>`.
3. Просмотреть созданный `migration.sql`: удаление колонок, обязательные поля и преобразование существующих данных требуют отдельного внимания.
4. Выполнить `npm run db:generate`, проверить типы и релевантные тесты.
5. Коммитить schema и каталог миграции вместе с кодом.
6. На сервере применять только готовые миграции через `migrate deploy`.

Для новой обязательной колонки в заполненной таблице обычно нужны этапы: добавить nullable/default, заполнить старые строки, затем ужесточить ограничение. Применённые миграции не переписывать; исправления оформлять следующей миграцией. Если `migrate dev` предлагает reset из-за drift, сначала выяснить причину: reset удаляет данные development-базы.

SQL миграций должен попадать в Git и Docker image. В текущем `.gitignore` общее исключение `*.sql` компенсируется правилом `!prisma/migrations/**/*.sql`. API Dockerfile отдельно проверяет наличие baseline-файла перед сборкой.

### Baseline существующей базы

Текущая начальная миграция — `20260917000000_init`. На пустой БД она применяется обычным `migrate deploy`. Для старой установки, где таблицы были созданы до появления миграций, после резервной копии и проверки соответствия существующей схемы baseline можно отметить как уже применённый:

```bash
npx prisma migrate resolve --applied 20260917000000_init
npm run db:migrate:deploy
```

В Docker тот же шаг выполняется в образе с миграциями:

```bash
docker compose build api
docker compose run --rm api npx prisma migrate resolve --applied 20260917000000_init
docker compose up -d api
```

`resolve --applied` записывает состояние миграции, а не создаёт таблицы. Его нельзя использовать для пропуска миграции на пустой или несовпадающей базе.

### Seed и первый пользователь

Миграции меняют структуру, seed заполняет данные. В текущем проекте seed создаёт OWNER, клиентов, материалы, проекты, принтеры и пример заказа. Если уже существуют клиенты или проекты, он завершает работу до создания OWNER. Это демо-seed с грубой проверкой заполненности, а не универсальный идемпотентный bootstrap.

`INITIAL_OWNER_TELEGRAM_ID` сам по себе не создаёт пользователя при запуске API. Docker CMD также не запускает seed. `npm run db:seed` — отдельный script; автоматический Prisma seed hook в root `package.json` не настроен. Перед seed явно передать нужный ID через окружение, как в примере локального запуска ниже.

Для нового приложения сделать отдельно:

- идемпотентный bootstrap OWNER и обязательных настроек через `upsert`;
- опциональный demo-seed только для development;
- документированный способ добавления остальных пользователей.

Production API image устанавливает зависимости с `--omit=dev`, поэтому `ts-node` для текущего TS seed там отсутствует. Для production bootstrap можно использовать JS с установленным Prisma Client. Например, для текущего проекта команда ниже создаёт первого владельца без демоданных; если пользователь уже существует, его запись сохраняется:

```bash
docker compose exec -T api node <<'NODE'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const id = process.env.INITIAL_OWNER_TELEGRAM_ID;
  if (!id || !/^\d+$/.test(id)) throw new Error('Set INITIAL_OWNER_TELEGRAM_ID');
  const user = await prisma.user.upsert({
    where: { telegramId: BigInt(id) },
    update: {},
    create: { telegramId: BigInt(id), role: 'OWNER', isActive: true },
  });
  console.log({ id: user.id, role: user.role, isActive: user.isActive });
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
NODE
```

## 7. Telegram-авторизация и права

### Основной login flow

1. Пользователь открывает Mini App; frontend получает сырую строку `window.Telegram.WebApp.initData`.
2. Frontend отправляет `POST /auth/telegram` с JSON `{ "initData": "..." }`. Текущий endpoint принимает её именно в body.
3. Backend разбирает query string, извлекает `hash`, сортирует оставшиеся ключи и соединяет `key=value` через `\n`.
4. Рассчитывает `secretKey = HMAC_SHA256(key="WebAppData", data=botToken)`, затем `HMAC_SHA256(key=secretKey, data=dataCheckString)`.
5. Сравнивает подписи через `crypto.timingSafeEqual` после проверки длины.
6. Проверяет пользователя в `users` по `telegramId` и `isActive`. Отсутствие доступа возвращает `403`.
7. Возвращает `{ accessToken, user }`. JWT содержит `sub`, строковый `telegramId`, `role`; срок задаётся через `JWT_EXPIRES_IN`, fallback — `7d`.
8. Последующие запросы проходят `JwtAuthGuard`. JWT strategy проверяет срок токена и перечитывает пользователя из БД; блокировка пользователя действует и для ранее выданного токена.

Непроверенный `initDataUnsafe` не является подтверждением личности. Bot token и JWT secret остаются только на backend.

Текущая проверка `auth_date` отклоняет данные старше 24 часов только при положительном значении даты. Отсутствующее/некорректное значение и дата из будущего отдельно не отклоняются. Для нового приложения сделать обязательную проверку формата, допустимого возраста и будущей даты.

### Allowlist и роли

В схеме есть `OWNER` и `USER`, реализованы `RolesGuard` и декоратор `@Roles`. Однако в текущих контроллерах они не подключены: например, `/users` защищён JWT, но ограничение управления пользователями только владельцем на сервере не установлено.

Для нового приложения задать матрицу прав и применять `@UseGuards(JwtAuthGuard, RolesGuard)` вместе с `@Roles(Role.OWNER)` на административных маршрутах. Скрытие кнопки на frontend не ограничивает доступ к API.

JWT strategy также принимает `?token=...` для потока камеры. Для обычных запросов использовать Bearer header; необходимость токена в URL пересмотреть при переносе, поскольку URL может попасть в логи.

### Telegram-бот

`TelegramBotService` работает через прямые HTTP-запросы к Bot API, без отдельной bot framework. При настоящем токене API запускает long polling `getUpdates`; при placeholder-токене бот отключён, при `NODE_ENV=test` polling не запускается.

Команда `/start` проверяет allowlist и возвращает кнопку Mini App. URL кнопки берётся из **первого** элемента `ALLOWED_ORIGINS`. Поэтому в текущем deployment первым должен стоять публичный HTTPS URL frontend. Для нового приложения лучше выделить отдельный `WEB_APP_URL`, независимо от CORS.

В PrintERP бот также обрабатывает `/camera`, `/photo`, callbacks и уведомляет о заказах/печати. Камерные команды и callbacks сейчас не повторяют allowlist-проверку из `/start`; при переносе таких команд добавить проверку доступа в общий обработчик. Пока используется polling, экземпляр обработчика обновлений для одного токена должен быть один; горизонтальное масштабирование API требует отдельной организации bot worker.

## 8. Dev mode и локальный запуск

### Как работает bypass сейчас

Если Telegram `initData` отсутствует, frontend всегда отправляет `dev_user_123456789`, независимо от режима Vite. Backend принимает `dev_user_<id>` при `DEV_BYPASS_AUTH=true`. Если переменная не равна `false`, пустой или placeholder bot token также включает bypass. При `NODE_ENV=production` bypass всегда выключен, независимо от `DEV_BYPASS_AUTH`.

Если dev-пользователь не найден, backend может взять первого активного пользователя из БД по дате создания. Это касается только `dev_user_*`: настоящий пользователь Telegram всегда должен быть в allowlist сам. Поэтому dev-вход требует хотя бы одного активного пользователя, но не обязательно владельца. Подстановка помогает локальной работе; в новом каркасе лучше явно выбирать отдельного dev-user.

Для production всегда задавать `DEV_BYPASS_AUTH=false`, настоящий bot token и собственный `JWT_SECRET`: без `JWT_SECRET` API не стартует, а Compose откажется запускаться. В новом приложении ограничить bypass одновременно явным флагом и development-окружением, а browser fallback frontend — `import.meta.env.DEV`.

### API и web на компьютере, PostgreSQL в Docker

Нужны Node/npm и Docker Compose. Использовать отдельную development-базу: команды ниже применяют миграции и добавляют демоданные.

```bash
cp .env.example .env
npm ci
docker compose up -d postgres
```

Дождаться готовности PostgreSQL. Если Compose требует отсутствующую внешнюю `homelab_net`, создать её командой `docker network create homelab_net` — это особенность текущего compose.

Для примера ниже предполагаются стандартные dev credentials из `.env.example`. Если они изменены, поменять URL. В терминале API переменные окружения переопределяют production-значения из `.env`:

```bash
export DATABASE_URL='postgresql://printerp:printerp_secret@localhost:5432/printerp_db?schema=public'
export NODE_ENV=development
export DEV_BYPASS_AUTH=true
export PORT=3011
export ALLOWED_ORIGINS='http://localhost:5173'
export INITIAL_OWNER_TELEGRAM_ID=123456789
export TELEGRAM_BOT_TOKEN='123456789:ABCdefGHIjklMNOpqrsTUVwxyZ'

npm run db:generate
npm run db:migrate:deploy
npm run db:seed
npm run build --workspace=packages/shared
npm run dev:api
```

Во втором терминале:

```bash
VITE_API_BASE_URL=http://localhost:3011 npm run dev:web
```

Frontend: `http://localhost:5173`; API: `http://localhost:3011`; проверка базы: `http://localhost:3011/health`. В `.env.example` стоят production-настройки — простое копирование файла не включает dev-вход.

Для настоящего Telegram-входа использовать настоящий bot token, выключить bypass, добавить реальный Telegram ID в allowlist и открыть приложение через настроенную HTTPS кнопку Mini App. При проверке с телефона URL `localhost` указывает на телефон: frontend и API должны быть доступны ему, а CORS — разрешать фактический frontend origin.

## 9. Переменные окружения

Nest `ConfigModule` читает `../../.env` и `.env` относительно рабочей директории. При workspace dev-запуске это позволяет читать корневой env; Docker получает параметры через `environment` в Compose. `.env` не входит в Docker build context.

Vite читает env относительно `apps/web`; для локального frontend можно использовать `apps/web/.env.local` или переменную в командной строке. Корневой `.env` не становится Vite env автоматически. Все `VITE_*` попадают в клиентский bundle и предназначены для публичных значений.

| Переменная | Для чего нужна |
| --- | --- |
| `DATABASE_URL` | Подключение API и Prisma CLI к нужной БД |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Инициализация контейнера PostgreSQL; согласовать с `DATABASE_URL` |
| `TELEGRAM_BOT_TOKEN` | Проверка initData и запросы Bot API |
| `INITIAL_OWNER_TELEGRAM_ID` | ID для seed/bootstrap и fallback dev-user; не автосоздание владельца |
| `JWT_SECRET` | Подпись и проверка JWT; обязателен, значения по умолчанию нет |
| `JWT_EXPIRES_IN` | Срок JWT, например `7d` |
| `DEV_BYPASS_AUTH` | Явное включение/выключение dev login |
| `NODE_ENV` | Окружение Node; `production` принудительно выключает dev login |
| `PORT` | Порт API; в env/Compose 3011, fallback bootstrap — 3000 |
| `WEB_PORT` | Публикуемый порт Nginx web-контейнера; 3012 |
| `ALLOWED_ORIGINS` | CORS allowlist; первый origin также используется ботом как Mini App URL |
| `VITE_API_BASE_URL` | Публичный API URL frontend; для Docker задаётся build argument |
| `TIMEZONE` / `TZ` | Часовой пояс форматирования сообщений бота; fallback `Asia/Tashkent` |
| `FFMPEG_PATH` | Путь к FFmpeg для камер; в API image `/usr/bin/ffmpeg` |

`TIMEZONE`/`TZ` не передаются текущим Compose автоматически: при использовании добавить их в `api.environment`. Изменение `POSTGRES_*` не перенастраивает уже инициализированный volume; пароль существующего пользователя базы меняется отдельно.

В Git хранить `.env.example` с примерами и `package-lock.json`; реальные секреты и дампы исключать. В новом каркасе добавить startup-валидацию обязательных переменных: сейчас JWT и Compose имеют fallback secrets, что может скрыть отсутствующую конфигурацию.

## 10. Docker и deployment

### Как устроены образы

**API:** multi-stage `node:20-slim`. Builder устанавливает зависимости, собирает `shared`, генерирует Prisma Client и собирает NestJS. Runner получает production dependencies, compiled JS, сгенерированный Prisma Client и каталог `prisma`. OpenSSL/CA нужны окружению; FFmpeg используется камерным модулем.

Запуск API выполняет:

```bash
npx prisma migrate deploy && node apps/api/dist/main.js
```

Если миграции завершаются ошибкой, Node не запускается. Seed в этой команде отсутствует. `EXPOSE 3000` в Dockerfile — декларация; фактический порт определяется `PORT`, и Compose публикует 3011 по умолчанию.

**Web:** builder `node:20-alpine` собирает SPA с `VITE_API_BASE_URL`; runner `nginx:alpine` раздаёт статические файлы на 80 с fallback на `index.html`. Изменение API URL требует пересборки web image, простой restart его не меняет.

Compose web-контейнер является production-сборкой даже при `NODE_ENV=development` у API. Hot reload настроен для локальных `dev:api` и `dev:web`, bind mounts с исходниками в текущем compose отсутствуют.

### Сети: обязательная адаптация текущего compose

В текущем `docker-compose.yml` API подключён только к внешней `homelab_net`, а PostgreSQL и web — к default-сети Compose. Поэтому `DATABASE_URL` с host `postgres` **не работает между этими контейнерами без изменения сетей**.

Для использования PostgreSQL из этого compose добавить API в default-сеть. Фрагмент конфигурации API для такого deployment:

```yaml
services:
  api:
    networks:
      - default
      - homelab_net
    depends_on:
      postgres:
        condition: service_healthy
```

Верхнеуровневую `homelab_net: { external: true }` сохранить, если она нужна для homelab-интеграций. Создать её один раз перед запуском. Если внешний доступ к локальной сети не требуется, новое приложение может использовать только общую default-сеть. При отдельной homelab-БД настроить доступный из API адрес вместо `postgres`.

У текущего API нет `depends_on: postgres`; готовность БД перед миграцией нужно обеспечить явно. `depends_on` у web сейчас задаёт порядок запуска API, а не проверяет его HTTP-готовность.

### Первый запуск и обновление

Перед командами ниже исправить сети по предыдущему разделу, настроить production env, HTTPS-домены и доступ к БД. Домены `printerp.y3110w.com` и `api-printerp.y3110w.com` — значения этого проекта, в новом приложении заменить их.

```bash
# Один раз, если используется внешняя сеть и она ещё не создана.
docker network create homelab_net

# Сборка и запуск.
docker compose up --build -d
docker compose ps
docker compose logs --tail=100 api
curl http://localhost:3011/health
```

После создания таблиц выполнить bootstrap OWNER из раздела 6, затем проверить вход внутри Telegram. `/health` возвращает JSON с `status: ok` и `database: connected`; при ошибке БД он может отвечать HTTP 200 с `status: degraded`, поэтому одного HTTP-кода для readiness недостаточно.

Обычное обновление: сделать backup, получить код с миграциями, пересобрать и запустить сервисы:

```bash
docker compose up --build -d api web
docker compose logs --tail=100 api
```

Для проверки или ручного применения миграций можно выполнить:

```bash
docker compose run --rm api npx prisma migrate status
docker compose run --rm api npx prisma migrate deploy
```

Reverse proxy и TLS не описаны сервисами текущего compose: их нужно настроить снаружи. В новом приложении также переименовать `container_name`, чтобы несколько проектов не конфликтовали, выбрать свободные host ports и отдельные БД/credentials.

## 11. Backup и восстановление

Данные PostgreSQL находятся в named volume `postgres_data`. Пересборка API/web их не удаляет. `docker compose down -v` удаляет volume этого проекта и его данные, поэтому не использовать эту команду как способ обычного обновления.

Пример custom-format backup из контейнера текущего проекта; при другом DB user/name заменить параметры:

```bash
docker compose exec -T postgres pg_dump -U printerp -d printerp_db -Fc > backup.dump
```

Восстановление проверять в отдельной **пустой** базе, например предварительно созданной `printerp_restore_test`, с остановленными приложениями, которые к ней пишут:

```bash
docker compose exec -T postgres pg_restore \
  -U printerp -d printerp_restore_test --no-owner --no-privileges < backup.dump
```

SQL/gzip dump из README восстанавливается через `psql`; custom-format dump — через `pg_restore`. После восстановления проверить таблицы, прикладные данные, миграции и login. Для нового deployment определить расписание backup, срок хранения и внешнее место копий; named volume сам по себе резервной копией не является.

## 12. Проверки и добавление функциональности

Root scripts:

```bash
npm run typecheck
npm run test
npm run build
```

Сборка идёт в порядке `shared → api → web`. Backend-тесты находятся в `apps/api/test` и используют Jest/ts-jest. Есть тесты Telegram HMAC, Zod pipe, расчётов, заказов, склада, финансов, настроек и принтеров. Отдельного frontend test script сейчас нет. `npm run lint` объявлен, но ESLint и его конфигурация не оформлены в репозитории как воспроизводимый инструмент; при переносе настроить их отдельно.

Порядок добавления новой области:

1. Описать Prisma-модель и создать миграцию.
2. Добавить Zod-схемы, DTO/response types и экспорты в `shared`.
3. Создать backend module/controller/service, подключить модуль, настроить auth и права.
4. Добавить API hooks, формы и экран на frontend; учесть инвалидирование связанных данных.
5. Проверить бизнес-правила, отрицательные сценарии, типы и сборку.
6. Включить миграцию в release и обновить `.env.example`, если добавлена конфигурация.

## 13. Что задать при создании следующего приложения

- Имя проекта и workspace-пакетов, branding, ключи `localStorage`.
- Предметные модели, модули, статусы и единицы измерения.
- Матрицу прав OWNER/USER или новые роли с серверной проверкой.
- Отдельные production и development базы, bot tokens и JWT secrets.
- Явный dev login, отключённый в production, и отдельный bootstrap OWNER.
- Домены web/API, Mini App URL, CORS origins и Vite allowed hosts.
- Docker-сети, имена контейнеров, свободные порты и persistent volumes.
- Политику миграций, backup/restore и доступность health/readiness.
- Нужные интеграции: MQTT/камеры/FFmpeg оставить только для подходящей предметной области.

Можно передать этот документ как контекст при постановке задачи на новое приложение:

> Создай Telegram Mini App на основе этой архитектуры: npm workspaces монорепозиторий с apps/web, apps/api и packages/shared; React + Vite + TypeScript + Tailwind; TanStack Query + Axios; формы React Hook Form + Zod; NestJS REST API; PostgreSQL + Prisma с версионируемыми SQL-миграциями. Проверяй Telegram initData на backend, используй JWT и серверные ограничения ролей. Сделай явный development login, отдельный идемпотентный bootstrap владельца, Docker multi-stage builds и общую сеть API/БД. Задай новые имена, домены и env для этого проекта. Учти описанные отличия текущей реализации от целевого каркаса. Предметная область нового приложения: …

## 14. Файлы, на которых основано описание

- [Root scripts и workspaces](../package.json), [lockfile](../package-lock.json).
- [Frontend dependencies](../apps/web/package.json), [API dependencies](../apps/api/package.json), [shared](../packages/shared/package.json).
- [Prisma schema](../prisma/schema.prisma), [миграции](../prisma/migrations/), [seed](../prisma/seed.ts), [PrismaService](../apps/api/src/database/prisma.service.ts).
- [Bootstrap API](../apps/api/src/main.ts), [AppModule](../apps/api/src/app.module.ts), [валидация](../apps/api/src/common/pipes/zod-validation.pipe.ts).
- [Telegram auth](../apps/api/src/modules/auth/telegram-auth.service.ts), [JWT strategy](../apps/api/src/modules/auth/jwt.strategy.ts), [users controller](../apps/api/src/modules/users/users.controller.ts).
- [AuthContext](../apps/web/src/contexts/AuthContext.tsx), [API client](../apps/web/src/lib/api-client.ts), [App](../apps/web/src/App.tsx), [Vite config](../apps/web/vite.config.ts).
- [Telegram bot](../apps/api/src/modules/telegram-bot/telegram-bot.service.ts), [health](../apps/api/src/modules/health/health.controller.ts).
- [Compose](../docker-compose.yml), [API Dockerfile](../apps/api/Dockerfile), [web Dockerfile](../apps/web/Dockerfile), [env example](../.env.example).
