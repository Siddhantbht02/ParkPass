# ParkPass — Visitor Parking Management System

> **Visitor Parking. Simplified.**
> A modern, QR-based visitor parking reservation, verification, and slot allocation platform for gated residential communities in India.

---

## 🌟 Key Capabilities

1. **Resident Self-Service Web Portal (`/resident`)**
   - Live parking slot availability calculator for requested dates and durations (1h, 3h, 6h, 12h, 24h, custom).
   - Atomic parking slot allocation with vehicle compatibility matching (Car, SUV, Two-Wheeler) and preferred slot support.
   - Generation of secure digital parking tickets with QR codes and instant WhatsApp sharing links.
   - Self-service reservation extensions and cancellations with immediate slot release.

2. **Security Guard Mobile Terminal (`/guard`)**
   - High-contrast, mobile-first design for smartphones and tablets at society gates.
   - Real-time QR scanner using the device camera (`html5-qrcode`) with fallback manual code entry.
   - Server-side pass verification: checks expiration, grace periods, society tenancy, and duplicate entry prevention.
   - Walk-in visitor registration for guests arriving without an advance pass.
   - Active parking monitor with overstay alerts and one-tap departure checkout that frees the parking slot.

3. **Society Administrator Console (`/admin`)**
   - Live KPI dashboard: flats, slots, current occupancy, today's entry/exit counts, and overstays.
   - 20-Slot Interactive Visual Grid (V-01 to V-20) with live status (Available, Reserved, Occupied, Blocked).
   - Administrative slot override and emergency force release with mandatory reason logging.
   - Searchable visitor records with real CSV export.
   - Comprehensive audit trail and society configuration.

4. **Public Digital Visitor Pass (`/pass/[token]`)**
   - Boarding-pass access ticket interface accessible without requiring a visitor account or app installation.
   - Displays visitor name, vehicle registration number, destination flat, assigned slot, validity window, and QR code.
   - WhatsApp share, link copying, and printable ticket layout.

---

## 🏗️ Architecture & Technology Stack

- **Monorepo**: Clean workspace structure (`apps/web`, `apps/api`, `packages/shared`, `prisma/`)
- **Web Frontend**: Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Lucide Icons, `html5-qrcode`, `qrcode`
- **Backend API**: Fastify, Node.js v22, REST API (`/api/v1/...`), Zod schema validation, `@fastify/jwt`, `@fastify/cookie`, `@fastify/cors`
- **Database**: SQLite (Zero-Docker local dev default) / PostgreSQL ready, Prisma ORM with relational foreign keys, transactions, and unique constraints
- **Security**: Cryptographically secure pass tokens, server-side RBAC, society tenant isolation, audit logging

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js v18+ (tested on Node v22.15.0)
- npm v10+

### 2. Environment Setup
The repository includes pre-configured environment files:
```bash
# .env is located at the repository root
DATABASE_URL="file:./dev.db"
JWT_SECRET="parkpass_super_secret_jwt_key_2026_production_grade"
PORT=4000
CORS_ORIGIN="http://localhost:3000"
NEXT_PUBLIC_API_URL="http://localhost:4000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Database Initialization & Seeding
```bash
# Push schema to SQLite database (dev.db)
npx prisma generate
npx prisma db push

# Seed sample society, flats, users, slots, and test passes
node prisma/seed.js
```

### 4. Running the Development Servers
In separate terminals:

**Terminal 1 — Backend API (Fastify on port 4000):**
```bash
npm run dev:api
```

**Terminal 2 — Web Frontend (Next.js on port 3000):**
```bash
npm run dev:web
```

Open your browser at **[http://localhost:3000](http://localhost:3000)**.

---

## 👥 Demo Accounts & One-Click Switcher

A **Demo One-Click Role Switcher** is pinned to the top header in the web application for instant evaluation. You can also sign in manually using:

| Role | Name | Phone / Login | Password | Location / Gate |
| :--- | :--- | :--- | :--- | :--- |
| **Resident** | Siddhant | `+919876543210` | `password123` | Tower A, Flat A-804 |
| **Resident** | Aarav Sharma | `+919876543211` | `password123` | Tower A, Flat A-805 |
| **Resident** | Priya Patel | `+919876543212` | `password123` | Tower B, Flat B-402 |
| **Security Guard** | Rajesh Kumar | `+919876543220` | `password123` | Main Gate |
| **Security Guard** | Vikram Singh | `+919876543221` | `password123` | Service Gate |
| **Society Admin** | Admin Secretary | `+919876543200` | `adminpassword123` | Society Office |

---

## 🧪 Automated Testing

Automated integration tests verify all core business rules:
- Atomic slot allocation & overlap prevention
- Expired and cancelled pass rejection
- Duplicate entry scan blocking
- Checkout slot release
- Tenant and role authorization isolation
- CSV export

Run the test suite:
```bash
npx tsx apps/api/test/api.test.ts
```

---

## 📋 End-to-End Acceptance Workflow Walkthrough

1. **Log in as Resident Siddhant**: Click "Resident: Siddhant (A-804)" in the top demo bar.
2. **Book Visitor Parking**: Enter visitor name "Siddhant", vehicle "MH 12 AB 1122", 7:00 PM arrival, 24h duration. Click "Confirm & Generate Pass".
3. **Inspect Pass**: View assigned slot (e.g. `V-12`), open the digital ticket, or copy the pass URL.
4. **Switch to Guard Terminal**: Click "Guard: Main Gate" in the top demo bar.
5. **Verify QR Pass**: Enter pass code (e.g. `PP-XXXXX`) or scan the QR code. View the verified green card with visitor, plate, and flat details.
6. **Confirm Entry**: Click "Confirm Vehicle & Allow Entry". The session becomes ACTIVE and the slot is occupied.
7. **Switch to Admin Dashboard**: Click "Admin: Secretary". Check the visual slot grid; slot V-12 shows occupied with live occupant details.
8. **Check Out Vehicle**: Return to Guard Terminal (`/guard`), go to "Active Parking", and click "Check Out". Slot is immediately released and visit history is recorded.
