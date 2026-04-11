# Echo — Анонимная поддержка для подростков

<div align="center">
  <strong>🔒 Зашифрованный · 💛 Анонимный · ⚡ Реальное время</strong>
</div>

---

## О проекте

Echo — это платформа анонимной психологической поддержки, где подростки могут получить помощь от обученных волонтёров через зашифрованный чат в реальном времени.

### Ключевые особенности

- **Полная анонимность** — никаких персональных данных
- **AES-256-GCM шифрование** — каждое сообщение зашифровано уникальным ключом
- **Авто-удаление** — все чаты автоматически удаляются через 24 часа
- **Реальное время** — мгновенная доставка через WebSocket (Socket.IO)

---

## Технологии

| Компонент | Стек |
|-----------|------|
| **Frontend** | React 18 · Vite · Tailwind CSS v4 · Framer Motion |
| **Backend** | NestJS · Socket.IO · Prisma ORM |
| **Database** | PostgreSQL (prod) / SQLite (dev) |
| **Security** | AES-256-GCM · bcrypt · JWT · Rate Limiting |

---

## Быстрый старт

### Требования

- Node.js 18+
- PostgreSQL (для продакшена) или SQLite (для разработки)

### 1. Клонировать

```bash
git clone https://github.com/your-repo/echo.git
cd echo
```

### 2. Backend

```bash
cd server
cp .env.example .env    # Настроить переменные
npm install
npx prisma generate
npx prisma db push
npm run start:dev        # → http://localhost:3001
```

### 3. Frontend

```bash
cd client
cp .env.example .env
npm install
npm run dev              # → http://localhost:5173
```

---

## Переменные окружения

### Server (`server/.env`)

| Переменная | Описание |
|------------|----------|
| `DATABASE_URL` | Connection string PostgreSQL |
| `JWT_SECRET` | Секрет для подписи JWT токенов |
| `ENCRYPTION_MASTER_KEY` | 64-символьный hex ключ для AES-256 |
| `PORT` | Порт сервера (по умолчанию: 3001) |
| `CORS_ORIGINS` | Разрешённые origin через запятую |

### Client (`client/.env`)

| Переменная | Описание |
|------------|----------|
| `VITE_API_URL` | URL бэкенда (по умолчанию: http://localhost:3001) |

---

## Деплой

### Frontend → Vercel

1. Импортируйте `client/` директорию в Vercel
2. Установите `VITE_API_URL` в настройках окружения → URL вашего бэкенда
3. Vercel автоматически определит Vite

### Backend → Railway / Render

> ⚠️ Vercel НЕ поддерживает WebSocket. Бэкенд нужно деплоить на Railway, Render или VPS.

1. Подключите PostgreSQL
2. Установите переменные окружения
3. Deploy command: `npm run build && npm run start:prod`

---

## Структура проекта

```
ECHO-FINAL/
├── client/               # React Frontend
│   ├── src/
│   │   ├── pages/        # HomePage, ChatPage, VolunteerPage
│   │   ├── services/     # socket.js, api.js
│   │   └── App.jsx       # Routing + Toaster
│   └── vercel.json
├── server/               # NestJS Backend
│   ├── src/
│   │   ├── auth/         # JWT, Registration, Login
│   │   ├── chat/         # Gateway, Service, Cleanup
│   │   ├── common/       # Encryption, Exception Filter
│   │   └── prisma/       # DB Service
│   └── prisma/
│       └── schema.prisma # PostgreSQL schema
└── README.md
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Регистрация волонтёра |
| POST | `/api/auth/login` | Вход волонтёра |
| GET | `/api/auth/me` | Профиль (JWT) |
| GET | `/api/chat/health` | Health check |
| GET | `/api/chat/stats` | Статистика платформы |

### WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `chat:request` | Client → Server | Подросток запрашивает чат |
| `chat:accept` | Client → Server | Волонтёр принимает чат |
| `message:send` | Client → Server | Отправка сообщения |
| `queue:updated` | Server → Client | Обновление очереди |
| `chat:started` | Server → Client | Чат начат |
| `message:new` | Server → Client | Новое сообщение |

---

## Лицензия

MIT
