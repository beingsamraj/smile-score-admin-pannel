# Smile Score Admin Panel & FastAPI Backend

A modern biometrics and smile score management system built with Next.js 15 (React 19, TypeScript, Tailwind CSS) and FastAPI (Python, SQLAlchemy, JWT Authentication).

---

## Architecture Overview

```text
smile-score-admin-pannel/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application entry & middleware
│   │   ├── core/
│   │   │   ├── config.py        # Pydantic v2 application settings (.env)
│   │   │   ├── security.py      # Bcrypt password hashing & PyJWT token handling
│   │   │   └── logging.py       # Centralized application logging
│   │   ├── database/
│   │   │   ├── session.py       # SQLAlchemy engine & SessionLocal generator
│   │   │   └── init_db.py       # Auto-table migration & initial Superadmin seeding
│   │   ├── models/
│   │   │   ├── admin_user.py    # AdminUser model (roles, timestamps, auth)
│   │   │   └── system_models.py # Employee, FaceTemplate, Fingerprint, EmotionLog, AuditLog
│   │   ├── schemas/
│   │   │   └── admin.py         # Pydantic validation schemas (Login, Token, Admin, Employee)
│   │   ├── routers/
│   │   │   ├── deps.py          # JWT Bearer token dependency & Superadmin guard
│   │   │   ├── auth.py          # /api/v1/auth (login, me, logout, admin management)
│   │   │   ├── employees.py     # /api/v1/employees (CRUD, status, face enrollment)
│   │   │   ├── recognition.py   # /api/v1/recognition/logs (realtime emotion scan logs)
│   │   │   ├── dashboard.py     # /api/v1/dashboard (analytics summary)
│   │   │   └── reports.py       # /api/v1/reports (report exports placeholder)
│   │   ├── services/
│   │   │   └── auth_service.py  # Admin authentication & audit logging service
│   │   └── utils/
│   ├── requirements.txt         # Backend Python dependencies
│   ├── .env.example             # Backend environment template
│   └── .env                     # Local backend environment configuration
├── src/                         # Next.js 15 Frontend Application
│   ├── app/                     # Next.js App Router (login, dashboard, home)
│   ├── components/              # AdminLoginForm, FaceEnrollmentModal
│   ├── context/                 # AuthContext (JWT management & session handling)
│   ├── lib/                     # api.ts (backend API client)
│   └── types/                   # TypeScript API definitions
├── .env.example                 # Frontend environment template
├── .env.local                   # Frontend local environment
└── README.md
```

---

## 🎨 Global Design Theme

- **Background:** Pure White (`#FFFFFF`)
- **Primary:** Dark Navy Blue (`#142D52`)
- **Primary Hover / Dark:** Deep Navy (`#0E203B` / `#0F2341`)
- **Secondary:** Light Blue (`#EAF0F8`)
- **Secondary Border:** Soft Ice Blue (`#D2E1F1`)
- **Text:** Dark Navy / Slate Grey (`#142D52` / `#64748B`)
- **Borders:** Crisp Light Grey (`#E2E8F0`)

---

## 🚀 Getting Started

### 1. Backend Setup & Run (FastAPI)

1. Open a terminal in the root directory and navigate to `backend`:
   ```bash
   cd backend
   ```

2. (Optional but recommended) Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows PowerShell:
   .\venv\Scripts\Activate.ps1
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Verify your `.env` configuration (a default `.env` is initialized from `.env.example`):
   ```env
   DATABASE_URL=sqlite:///./smile_score.db
   SECRET_KEY=smilescore-admin-development-secret-key-32chars
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=1440
   FIRST_SUPERADMIN_EMAIL=admin@smilescore.internal
   FIRST_SUPERADMIN_USERNAME=admin
   FIRST_SUPERADMIN_PASSWORD=AdminSecurePassword123!
   FIRST_SUPERADMIN_NAME=Smile Score Administrator
   ```

5. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
   - Interactive API Docs (Swagger): [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)
   - Alternative ReDoc: [http://localhost:8000/api/v1/redoc](http://localhost:8000/api/v1/redoc)
   - Health Check: [http://localhost:8000/health](http://localhost:8000/health)

> **Initial Superadmin Credentials:**
> - **Username / Email:** `admin` or `admin@smilescore.internal`
> - **Password:** `AdminSecurePassword123!`

---

### 2. Frontend Setup & Run (Next.js)

1. In another terminal window in the root directory:
   ```bash
   npm install
   ```

2. Confirm frontend environment in `.env.local`:
   ```env
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
   ```

3. Start the Next.js development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) or navigate directly to the login portal at [http://localhost:3000/login](http://localhost:3000/login).

---

## 🔒 Security & Admin Features

- **No Public Registration:** Admins cannot register via public endpoints. New administrators can only be created by an authenticated `superadmin` via `/api/v1/auth/users`.
- **Password Security:** Salted hashing with `bcrypt` (12 rounds).
- **Authentication:** Standard OAuth2-compatible JWT Bearer token generation with expiry timestamps (`exp`, `iat`) and role verification.
- **Audit Logs:** All admin logins, logouts, employee creations, and face enrollment modifications are automatically recorded with timestamps and client IPs in the `audit_logs` table.

---

## 🧪 Verification & Build

- **Type Check & Lint:** `npm run lint`
- **Production Build:** `npm run build`
