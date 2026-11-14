# Chat Backend (Node.js + TypeScript + PostgreSQL + Firebase Firestore)

A scalable chat backend service built with clean modular architecture for the Codes For Tomorrow assessment.

## Tech Stack
- **Node.js** with **TypeScript** (Strict mode)
- **PostgreSQL** (`pg` connection pool with raw parameterized SQL queries)
- **Firebase Firestore** (`firebase-admin` SDK for real-time messages, read receipts, and last seen tracking)
- **Express.js** + **Zod** for schema validation and request sanitization
- **Jest** + **Supertest** for automated integration testing
- **Interactive Web UI** (`public/index.html`) for instant browser-based live testing

---

## Architecture Overview
The system follows a clean modular service-controller pattern with clear separation of concerns:

- **Relational DB (PostgreSQL)** stores persistent identity, chat metadata, and membership integrity:
  - `users`: User profiles (id, name, email)
  - `chats`: Direct (1:1) and Group chat metadata
  - `chat_members`: Chat participant mappings with roles (`MEMBER` / `ADMIN`)
  - Uniqueness constraint ensures at most one direct 1:1 chat can exist between any two users.

- **Firebase Firestore** handles high-throughput, append-only messaging operations:
  - `chats/{chatId}/messages/{messageId}`: Message payload, ISO timestamp, readBy array.
  - `chats/{chatId}/lastSeen/{userId}`: Per-user last seen message pointer and update timestamp.

---

## Project Structure
```
├── public/
│   └── index.html       # Interactive live testing dashboard (web interface)
├── src/
│   ├── config/
│   │   ├── db.ts            # PostgreSQL connection pool (Neon / Local / Docker)
│   │   └── firebase.ts      # Firebase Admin SDK initialization
│   ├── controllers/
│   │   ├── chatController.ts# HTTP handlers for chat endpoints
│   │   └── userController.ts# HTTP handlers for user endpoints
│   ├── db/
│   │   ├── schema.sql       # PostgreSQL DDL table creation script
│   │   ├── migrate.ts       # Database migration runner
│   │   └── seed.ts          # Seed script for realistic users & initial chat data
│   ├── middlewares/
│   │   ├── errorHandler.ts  # Centralized error handler
│   │   └── validate.ts      # Zod schema validation middleware
│   ├── routes/
│   │   ├── chatRoutes.ts    # Chat API routes
│   │   ├── userRoutes.ts    # User API routes
│   │   └── index.ts         # Root router
│   ├── services/
│   │   ├── chatService.ts   # Chat business logic & relational SQL operations
│   │   └── messageService.ts# Firestore message & read receipt operations
│   ├── types/
│   │   └── index.ts         # TypeScript domain models and DTO interfaces
│   ├── utils/
│   │   ├── asyncHandler.ts  # Express async wrapper (clean error propagation)
│   │   └── errors.ts        # Custom HTTP error classes (400, 403, 404)
│   ├── validators/
│   │   ├── chatSchemas.ts   # Zod request validation schemas for chat
│   │   └── userSchemas.ts   # Zod schemas for user
│   ├── app.ts               # Express app configuration & static assets
│   └── server.ts            # Server bootstrap & graceful shutdown
├── tests/
│   └── api.test.ts          # Comprehensive integration test suite (Supertest + Jest)
├── docker-compose.yml       # One-command local PostgreSQL container
├── postman_collection.json  # Ready-to-import Postman API collection
├── .env.example             # Environment variable documentation
└── tsconfig.json            # Strict TypeScript compiler options
```

---

## Setup & Running

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Copy the sample environment file:
```bash
cp .env.example .env
```

Configure your database and Firebase in `.env`:
```env
PORT=3000
NODE_ENV=development

# Option A: Cloud PostgreSQL (Neon / Supabase / Railway)
DATABASE_URL=postgresql://user:password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require

# Option B: Local / Docker PostgreSQL
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=chat_backend
PG_USER=postgres
PG_PASSWORD=postgrespassword

# Firebase Configuration
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
FIREBASE_PROJECT_ID=your-firebase-project-id
```

> **Note for Evaluators:** If external PostgreSQL or Firebase credentials are not configured, the application includes a **transparent in-memory fallback**. The backend, automated tests, and APIs will run out of the box with zero external dependencies.

### 3. Database Migration & Seeding
Run schema migrations and seed initial test data:
```bash
npm run migrate
npm run seed
```

**Pre-seeded Users:**
| User ID | Name | Email |
| :--- | :--- | :--- |
| `usr_veerendra` | Veerendra Raghuwanshi | `veerendra@gmail.com` |
| `usr_aayushi` | Aayushi Sharma | `aayushi@codesfortomorrow.com` |
| `usr_rahul` | Rahul Verma | `rahul.verma@gmail.com` |
| `usr_sneha` | Sneha Patel | `sneha.patel@gmail.com` |
| `usr_alex` | Alex Mercer | `alex.mercer@gmail.com` |

### 4. Start the Application
```bash
# Development mode with live reload
npm run dev

# Production build and start
npm run build
npm start
```
The server will start at: `http://localhost:3000`

---

## 🖥️ Live Interactive Testing Portal

When the server is running, open your browser at:
👉 **`http://localhost:3000`**

The web dashboard allows you to visually test all features:
- **Switch Active User:** Test as *Veerendra*, *Aayushi*, *Rahul*, etc.
- **Chats List:** View all direct and group chats for the active user.
- **Start 1:1 Chat:** Choose any user to create or open a direct chat.
- **Create Group Chat:** Enter a group title and select multiple members.
- **Send Messages:** Type messages and watch them sync live with Firestore.
- **Read Receipts:** Messages show a single check mark `✓` when sent, and a blue double check `✓✓` once read by the recipient.
- **Message Actions:** Hover on your sent messages to edit or delete them.

---

## 📡 API Reference

### 1. Create or Get Chat (1:1 Direct Chat)
Finds existing direct chat or creates a new one idempotently.
```bash
curl -X POST http://localhost:3000/chat/create \
  -H "Content-Type: application/json" \
  -d '{"userAId": "usr_veerendra", "userBId": "usr_aayushi"}'
```
Response:
```json
{
  "chatId": "chat_veerendra_aayushi",
  "isNew": false
}
```

### 2. Send Message
Stores message in Firestore with timestamp and sender ID.
```bash
curl -X POST http://localhost:3000/chat/chat_veerendra_aayushi/message/send \
  -H "Content-Type: application/json" \
  -d '{"senderId": "usr_veerendra", "text": "Hello Aayushi! Testing message sending."}'
```
Response:
```json
{
  "id": "msg_xxx",
  "chatId": "chat_veerendra_aayushi",
  "senderId": "usr_veerendra",
  "text": "Hello Aayushi! Testing message sending.",
  "createdAt": "2026-11-14T00:00:00.000Z",
  "isDeleted": false,
  "readBy": []
}
```

### 3. Get Messages
Retrieves messages ordered chronologically by timestamp.
```bash
curl http://localhost:3000/chat/chat_veerendra_aayushi/messages?limit=50
```
Response:
```json
{
  "count": 1,
  "messages": [
    {
      "id": "msg_xxx",
      "chatId": "chat_veerendra_aayushi",
      "senderId": "usr_veerendra",
      "text": "Hello Aayushi! Testing message sending.",
      "createdAt": "2026-11-14T00:00:00.000Z",
      "readBy": []
    }
  ]
}
```

### 4. Mark Message Read
Updates read receipts array in Firestore.
```bash
curl -X POST http://localhost:3000/chat/chat_veerendra_aayushi/message/msg_xxx/read \
  -H "Content-Type: application/json" \
  -d '{"userId": "usr_aayushi"}'
```
Response:
```json
{
  "userId": "usr_aayushi",
  "readAt": "2026-11-14T00:01:00.000Z"
}
```

### 5. Update Last Seen Message
Updates per-user last seen message pointer in Firestore.
```bash
curl -X POST http://localhost:3000/chat/chat_veerendra_aayushi/lastseen \
  -H "Content-Type: application/json" \
  -d '{"userId": "usr_aayushi", "messageId": "msg_xxx"}'
```
Response:
```json
{
  "userId": "usr_aayushi",
  "messageId": "msg_xxx",
  "chatId": "chat_veerendra_aayushi",
  "updatedAt": "2026-11-14T00:01:00.000Z"
}
```

### 6. List User Chats
Returns all chats a user belongs to with all participant IDs from relational DB.
```bash
curl http://localhost:3000/user/usr_veerendra/chats
```
Response:
```json
{
  "count": 1,
  "chats": [
    {
      "chatId": "chat_veerendra_aayushi",
      "type": "DIRECT",
      "name": null,
      "memberIds": ["usr_veerendra", "usr_aayushi"],
      "createdAt": "2026-11-14T00:00:00.000Z"
    }
  ]
}
```

### Bonus Endpoints
- **Create Group Chat:** `POST /chat/group/create` (`{ creatorId, name, memberIds }`)
- **Edit Message:** `PATCH /chat/:chatId/message/:messageId` (`{ senderId, text }`)
- **Delete Message:** `DELETE /chat/:chatId/message/:messageId` (`{ senderId }`)

---
