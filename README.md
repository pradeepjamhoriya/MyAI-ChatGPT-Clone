# MyAI — Full-Stack ChatGPT Clone

A complete, production-ready AI conversational web application inspired by the ChatGPT user experience, powered by Google Gemini and Node.js Express with MySQL database persistence and user authentication.

---

## 1. Project Overview & Architecture

- **Frontend**: React 19, Tailwind CSS, Lucide Icons, responsive dark layout (#212121, #171717, #2F2F2F, #10A37F).
- **Backend**: Node.js & Express (`server.ts`, `server/routes.ts`, `server/auth.ts`).
- **AI Engine**: Google Gemini API via official `@google/genai` (v2.4.0) with model `gemini-3.8-flash`.
- **Database**: Dual-engine persistence:
  - **MySQL 8.0+** support with connection pooling via `mysql2/promise`.
  - **Persistent JSON Store** (`.data/myai_database.json`) fallback for zero-setup execution.
- **Security & Auth**: Bcrypt password hashing, session tokens via HTTP-only cookies and Authorization headers, authorization checks preventing cross-user conversation access.

---

## 2. Root Cause of the Previous 502 Bad Gateway Error

When sending a message to `POST /api/chat` previously returned `502 Bad Gateway`, the cause was diagnosed as:

1. **Role Mismatch**: The frontend sent messages formatted as `{ role: "assistant", content: "..." }`. The Google Gemini API strictly requires `{ role: "model", parts: [{ text: "..." }] }`. Supplying `role: "assistant"` caused Gemini to reject the call with an immediate 400 Bad Request error.
2. **Unhandled Promise Rejections**: The original route lacked an async try/catch boundary around the Gemini SDK invocation. The unhandled error caused the Node Express request handler to terminate abnormally or crash, causing the upstream reverse proxy to return `502 Bad Gateway`.
3. **SDK and Model Versioning**: Older implementations attempted to use deprecated models like `gemini-pro` or `gemini-1.5-flash` or deprecated methods (`ai.models.getModel()`).
4. **Resolution in MyAI**:
   - Implemented `formatMessagesForGemini()` in `server/gemini.ts` which automatically transforms incoming ChatGPT message roles to Gemini-compliant turns (`user` and `model`), merges consecutive turns, and validates non-empty text.
   - Guarded the chat endpoint with rate limiting, input validation, and upstream error translation.
   - Initialized `@google/genai` using the recommended `gemini-3.8-flash` model.

---

## 3. Database Schema (`server/schema.sql`)

The application includes a complete MySQL schema file (`server/schema.sql`):

- `users`: ID (UUID), email (unique), password_hash (bcrypt), name, timestamps.
- `conversations`: ID (UUID), user_id (foreign key), title, timestamps, indexes.
- `messages`: ID (UUID), conversation_id (foreign key, cascade delete), role (`user`, `assistant`, `system`), content, model, timestamps.
- `sessions`: Token (unique), user_id (foreign key), expires_at, created_at.

### Importing Schema into MySQL:

```bash
# In MySQL command line or PowerShell:
mysql -u root -p < server/schema.sql
```

---

## 4. Windows Development & Setup Instructions

Path on Windows: `C:\Users\LENOVO\OneDrive\Desktop\MyAI`

### Step 1: Install Dependencies
Open PowerShell or Command Prompt in the project folder:
```powershell
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```env
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here

# MySQL Configuration (Optional — if omitted, uses built-in persistent store)
USE_MYSQL=true
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=myai_db
```

### Step 3: Run Automated Tests
```powershell
npm test
```

### Step 4: Start Development Server
```powershell
npm run dev
```
Open **http://localhost:3000** in your browser.

---

## 5. API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health status, model info, and DB connection status |
| `GET` | `/api/diagnostics/gemini-test` | Live Gemini model ping and latency report |
| `POST` | `/api/auth/signup` | Register new user with email and password |
| `POST` | `/api/auth/login` | Authenticate existing user |
| `POST` | `/api/auth/demo` | Instant 1-click test login |
| `POST` | `/api/auth/logout` | Terminate active session |
| `GET` | `/api/auth/me` | Fetch authenticated user profile |
| `GET` | `/api/conversations` | List user's conversations |
| `GET` | `/api/conversations/:id` | Get conversation and full message history |
| `PATCH` | `/api/conversations/:id` | Rename conversation title |
| `DELETE` | `/api/conversations/:id` | Delete conversation and cascade delete messages |
| `POST` | `/api/chat` | Send message and receive Gemini response |
| `POST` | `/api/system/run-tests` | Run live automated integration test suite |
