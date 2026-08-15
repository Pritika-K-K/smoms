# SMOMS (Smart Maintenance & Operations Management System)

SMOMS is a full-stack factory maintenance ticketing and predictive maintenance platform designed for smart manufacturing plants.

## Architecture & Tech Stack

- **Frontend**: React (Vite + TypeScript), Tailwind CSS, React Router, React Query (`@tanstack/react-query`), Axios, Recharts, Lucide Icons.
- **Backend**: Node.js + Express, JWT authentication, bcryptjs password hashing, `node-cron` background simulator.
- **Database**: PostgreSQL accessed via Prisma ORM.

---

## Folder Structure

```
smoms/
├── smoms-backend/               # Node.js + Express REST API
│   ├── prisma/
│   │   ├── schema.prisma        # Complete Prisma Relational Data Model
│   │   └── seed.js              # Seed script with realistic demo data
│   ├── src/
│   │   ├── config/db.js         # Prisma Client singleton
│   │   ├── middleware/          # JWT Auth, Role Authorization, Audit Logger, Error Handler
│   │   ├── jobs/simulator.js    # Node-cron background predictive telemetry simulator
│   │   ├── modules/             # Auth, Users, Departments, Machines, Tickets, WorkOrders, Predictive, Dashboard, Reports, Notifications, AuditLogs
│   │   └── server.js            # Express server entry point
│   ├── .env.example
│   └── package.json
│
└── smoms-frontend/              # React + Vite + TypeScript Application
    ├── src/
    │   ├── api/                 # Axios API service modules
    │   ├── auth/                # AuthContext, ProtectedRoute, LoginPage
    │   ├── components/          # Status badges, stat cards, charts, notification drawer, modal
    │   ├── portals/             # Role-specific portals (Operator, Engineer, Manager, Admin)
    │   ├── router/              # AppRouter with role-based routing guards
    │   └── types/               # TypeScript interfaces
    ├── .env.example
    └── package.json
```

---

## Quick Setup Instructions

### Prerequisites
- **Node.js**: v18+ and `npm`
- **PostgreSQL Database**: Cloud instance (Neon / Supabase) or local PostgreSQL server (`postgresql://postgres:postgres@localhost:5432/smoms_db`)

---

### Step 1: Backend Setup (`smoms-backend`)

1. Open a terminal and navigate to `smoms-backend`:
   ```bash
   cd smoms-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables (`.env`):
   ```bash
   cp .env.example .env
   ```
   Update `DATABASE_URL` in `.env` to point to your PostgreSQL database:
   ```env
   PORT=5000
   JWT_SECRET=smoms_super_secret_jwt_key_2026_production_ready
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/smoms_db?schema=public"
   ```

4. Push Prisma schema & generate client:
   ```bash
   npm run prisma:push
   npm run prisma:generate
   ```

5. Seed database with realistic demo data:
   ```bash
   npm run seed
   ```

6. Start backend development server:
   ```bash
   npm run dev
   ```
   Backend will start on `http://localhost:5000`.

---

### Step 2: Frontend Setup (`smoms-frontend`)

1. Open a second terminal and navigate to `smoms-frontend`:
   ```bash
   cd smoms-frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables (`.env`):
   ```bash
   cp .env.example .env
   ```
   Verify `VITE_API_URL`:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

4. Start frontend development server:
   ```bash
   npm run dev
   ```
   Frontend will run on `http://localhost:5173`.

---

## Demo Accounts & Role Portals

| Role | Email | Password | Main Features |
| border | --- | --- | --- |
| **Operator** | `operator@smoms.com` | `operator123` | View assigned department machines, raise tickets, track ticket status. |
| **Maintenance Engineer** | `engineer@smoms.com` | `engineer123` | View assigned tickets, update repair progress, submit resolution notes. |
| **Production Manager** | `manager@smoms.com` | `manager123` | Machine health dashboard, approve/reject resolved tickets, downtime reports, export CSV. |
| **System Admin** | `admin@smoms.com` | `admin123` | Manage users & role permissions, CRUD machines & departments, view audit logs. |

---

## Core Features & Workflow

1. **Ticket Lifecycle**:
   - `Health Warning / Manual Issue` -> `Ticket Created` -> `Engineer Assigned` -> `In Progress` -> `Resolved` -> `Manager Sign-Off Approval` -> `Closed (WorkOrder Created)`
   - If Manager **Rejects**, ticket returns to engineer with feedback notes.

2. **Predictive Maintenance Simulator**:
   - Background `node-cron` job runs every 30 seconds to generate machine telemetry.
   - **Rule**: `IF temperature > 80°C AND vibration > 6 mm/s` -> auto-create `CRITICAL` ticket, notify assigned engineer, and mark machine status `DOWN`.

3. **Analytics & CSV Export**:
   - Production Manager can view department health score trends, status distributions, and export full CSV ticket reports.
