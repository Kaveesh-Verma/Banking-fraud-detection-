# FinShield AI — Local Setup Guide

AI-powered banking fraud detection app with real-time risk scoring, biometric auth, Leaflet maps, and live payment fraud simulation.

## Prerequisites

- Node.js 18+ (https://nodejs.org)
- npm or pnpm
- PostgreSQL database (local or cloud like Neon / Supabase)

---

## Project Structure

```
finshield-standalone/
├── schema.sql          ← Run this first to set up the database
├── server/             ← Express + TypeScript backend (port 8080)
│   ├── .env.example
│   └── src/
│       ├── index.ts
│       ├── app.ts
│       ├── db.ts
│       └── routes/
│           ├── sessions.ts
│           ├── risk.ts
│           ├── location.ts
│           ├── admin.ts
│           └── health.ts
└── client/             ← React + Vite frontend (port 5173)
    └── src/
        ├── api/index.ts        ← All API hooks (TanStack Query)
        ├── components/
        │   ├── LiveMap.tsx     ← Leaflet interactive map
        │   └── ui/             ← Input + Form components
        ├── hooks/use-toast.ts
        ├── lib/biometric.ts    ← WebAuthn fingerprint/FaceID
        └── pages/
            ├── login.tsx       ← 3-step: Details → OTP → Biometric
            ├── dashboard.tsx   ← Live dashboard with fraud feed
            └── admin.tsx       ← Admin command center
```

---

## Step 1 — Set up the database

```bash
# Option A: Create a free cloud DB at https://neon.tech or https://supabase.com
# Option B: Use local PostgreSQL
psql -U postgres -f schema.sql
```

---

## Step 2 — Configure the backend

```bash
cd server
cp .env.example .env
```

Edit `.env`:
```
PORT=8080
DATABASE_URL=postgresql://username:password@localhost:5432/finshield
```

Install and run the server:
```bash
npm install
npm run dev
```

The API will be at: http://localhost:8080/api/healthz

---

## Step 3 — Run the frontend

Open a new terminal:
```bash
cd client
npm install
npm run dev
```

The app will open at: http://localhost:5173

---

## Quick Local Run Commands

Use these exact commands from PowerShell to start the app locally:

```powershell
cd "c:\Users\Kaveesh Verma\Downloads\finshield-ai-standalone\finshield-standalone\server"
npm install
npm run dev
```

Open a second terminal:

```powershell
cd "c:\Users\Kaveesh Verma\Downloads\finshield-ai-standalone\finshield-standalone\client"
npm install
npm run dev
```

Then open the app in your browser:

```powershell
Start-Process "http://localhost:5174"
```

If port `5173` is already in use, Vite will automatically try another port like `5174`.

---

## Routes

| Page | URL |
|------|-----|
| Login | http://localhost:5173/ |
| Dashboard | http://localhost:5173/dashboard |
| Admin | http://localhost:5173/admin |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/healthz | Health check |
| GET | /api/location | Caller's IP-based location |
| POST | /api/session/start | Create new session |
| GET | /api/session/:id | Get session by ID |
| PATCH | /api/session/:id/interactions | Update interaction counts |
| POST | /api/risk | Calculate fraud risk score |
| GET | /api/admin/sessions | All sessions with risk data |
| GET | /api/admin/stats | Aggregate fraud statistics |

---

## Risk Score Logic

| Signal | Score |
|--------|-------|
| Location permission denied | +20 |
| Low interactions (< 10 events) | +15 |
| New session | +25 |

**Levels:** Low (< 30) · Medium (30–60) · High (> 60)

---

## Key Features

- OTP login (demo mode — OTP shown in toast notification)
- WebAuthn biometric (fingerprint / Face ID via browser)
- Real GPS location + Nominatim reverse geocoding (free, no API key)
- Leaflet interactive maps (OpenStreetMap tiles, no API key)
- Real-time interaction tracking (mouse, clicks, keys) — synced every 5s
- Live payment fraud simulation feed per session
- Genuine User Trust Score (100 − risk score) to reduce false alarms
- Fraud alert banner when risk > 60
- Admin command center with per-user maps and AI insights

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS v4 |
| Animations | Framer Motion |
| Maps | Leaflet.js + OpenStreetMap |
| Data fetching | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| Toast | Sonner |
| Router | Wouter |
| Backend | Express + TypeScript |
| ORM | Drizzle ORM |
| Database | PostgreSQL |
| Auth | OTP (demo) + WebAuthn biometric |
