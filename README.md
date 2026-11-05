# PGfy Sales CRM & Call Tracking System

> Production-grade, full-stack Sales CRM, Lead Management, Outbound Call Tracking, and Sales Telemetry Platform engineered for co-living property operations.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38bdf8.svg?logo=tailwind-css)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express-4.22-lightgrey.svg?logo=express)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15%2B-336791.svg?logo=postgresql)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748.svg?logo=prisma)](https://www.prisma.io/)
[![Tests](https://img.shields.io/badge/Tests-258%20Passed-success.svg)](#22-testing-instructions)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Business Problem](#2-business-problem)
3. [Key Features](#3-key-features)
4. [Admin Functionality](#4-admin-functionality)
5. [Sales Executive Functionality](#5-sales-executive-functionality)
6. [Technology Stack](#6-technology-stack)
7. [Architecture Overview](#7-architecture-overview)
8. [Database Schema Explanation](#8-database-schema-explanation)
9. [API Endpoint Documentation](#9-api-endpoint-documentation)
10. [Authentication and RBAC Explanation](#10-authentication-and-rbac-explanation)
11. [Dashboard Metric Formulas](#11-dashboard-metric-formulas)
12. [CSV Report Functionality](#12-csv-report-functionality)
13. [Project Folder Structure](#13-project-folder-structure)
14. [Prerequisites](#14-prerequisites)
15. [PostgreSQL Setup](#15-postgresql-setup)
16. [Environment Variable Setup](#16-environment-variable-setup)
17. [Prisma Migration Instructions](#17-prisma-migration-instructions)
18. [Database Seed Instructions](#18-database-seed-instructions)
19. [Backend Startup Instructions](#19-backend-startup-instructions)
20. [Frontend Startup Instructions](#20-frontend-startup-instructions)
21. [Demo Login Credentials](#21-demo-login-credentials)
22. [Testing Instructions](#22-testing-instructions)
23. [Screenshots Section](#23-screenshots-section)
24. [Known Limitations](#24-known-limitations)
25. [Deployment Instructions](#25-deployment-instructions)

---

## 1. Project Overview

**PGfy Sales CRM** is an internal customer relationship management and telephony tracking system built for PGfy, an urban co-living and property rental platform operating across Bangalore's major tech hubs (Whitefield, HSR Layout, Koramangala, Indiranagar, Bellandur, Electronic City, Sarjapur Road, Marathahalli, Hebbal, and Yelahanka).

The platform coordinates high-intent prospective tenant enquiries, automates sales executive lead allocation, provides an interactive outbound dialer logging interface with 9 standardized call outcomes, schedules calendar-aligned follow-up visits in Indian Standard Time (IST), computes real-time sales telemetry without external cron jobs, and delivers RFC 4180-compliant CSV exports with Excel UTF-8 BOM compatibility.

---

## 2. Business Problem

In residential real estate and student/working-professional PG housing:
- **Lead Leakage**: Enquiries arriving from web portals, referrals, and ads sit unattended without clear executive ownership.
- **Untracked Outbound Follow-Ups**: Sales executives dial prospects using private phones with no centralized interaction history, leading to repeated calls or forgotten prospects.
- **Inaccurate Conversion Telemetry**: Sales managers struggle to calculate call coverage, connection rate, and conversion efficiency per representative, frequently encountering zero-division errors on junior reps.
- **Data Insecurity & IDOR Vulnerabilities**: Executives could accidentally or maliciously access high-value prospects assigned to peers by altering URL identifiers.
- **Messy Spreadsheet Exports**: CSV exports from internal tools often break when prospect names contain commas or Unicode Indian characters, causing double-click errors in Microsoft Excel.

**PGfy Sales CRM** solves these operational bottlenecks with an authoritative PostgreSQL schema, server-enforced role-based access control (RBAC), and streamlined executive interfaces.

---

## 3. Key Features

- **Role-Based Workflows**: Separate, secure portals for **Administrators** (executive oversight, rebalancing, reporting) and **Sales Executives** (focused lead execution, outbound interaction logging).
- **Interactive Call Tracking**: Outbound call logger capturing exact duration in minutes/seconds, 9 outcomes, rich discussion notes, and optional linked follow-up task generation.
- **IST Follow-Up Scheduler**: Follow-up classification engine categorizing tasks into `Today`, `Upcoming`, `Overdue`, and `Completed` based on the local calendar day in Asia/Kolkata (+05:30).
- **Mathematical Telemetry Engine**: Zero-division-safe calculations for Call Coverage Rate, Conversion Rate, and Connection Rate.
- **Chronological Audit Trail**: Full historical assignment logs tracking initial assignment, reassignments, unassigned dates, and caller activity timelines.
- **Enterprise CSV Data Exporter**: Native RFC 4180 exports with UTF-8 BOM (`\uFEFF`) and quote sanitization against CSV formula injection.
- **Modern Responsive UI**: Dark glassmorphic aesthetic built with React 19, Tailwind CSS, Lucide icons, and centralized Axios client with automatic Bearer token injection.

---

## 4. Admin Functionality

- **Executive Oversight Dashboard**: Aggregates company-wide pipeline volume, active assignments, unassigned backlog, total dials, connected calls, pending follow-ups, and converted bookings.
- **Executive Performance Leaderboard**: Per-representative breakdown comparing assigned leads, unique contacts, conversion win rates, outbound volume, and connection ratios.
- **Lead Management & CRUD**: Create leads, update contact coordinates, search across customer name/mobile, and filter by status and location.
- **Lead Assignment & Workload Rebalancing**:
  - View **Unassigned Queue** awaiting allocation.
  - View **Assigned Pipeline** with 1-click reassignment modal.
  - Inspect **Chronological Assignment History** modal tracking every previous executive with unassigned timestamps.
- **Full Call & Follow-Up Auditing**: View and filter interactions across all sales reps by outcome, date ranges, and executive identity.
- **3 Native CSV Exports**: 1-click downloads for All Leads Report, Call History Report, and Sales Executive Performance Report.

---

## 5. Sales Executive Functionality

- **Personal Sales Dashboard**: Live personal KPIs (My Assigned Leads, Contacted Leads, Coverage Rate %, Conversion Rate %, Connection Rate %, Pending & Overdue Follow-ups).
- **Assigned Leads Queue**: Filtered strictly to leads assigned to the logged-in executive. Cross-executive records are physically blocked.
- **Customer Detail Drawer**: Slide-out panel presenting tenant preferences (property type, INR budget, preferred location), contact buttons, and an embedded `CallActivityTimeline`.
- **Outbound Call Recording**:
  - Duration inputs (minutes + seconds) with automated second summation.
  - Outcome dropdown supporting all 9 standardized statuses.
  - Multi-line discussion notes with character counting.
  - Integrated "Schedule Next Follow-Up" toggle.
- **Follow-Up Task Management**:
  - Filter tabs: `Today's Follow-ups`, `Upcoming`, `Overdue`, and `Completed`.
  - Mark completed with closing discussion notes.
  - Reschedule pending tasks to a new IST date/time.
  - Cancel tasks with recorded rationale.

---

## 6. Technology Stack

### Frontend Client
- **Framework**: React 19 with TypeScript (`tsc -b`)
- **Build Tool**: Vite 8 with optimized chunks
- **Styling**: Tailwind CSS 3.4 (custom glassmorphism, responsive grids, CSS variables)
- **Icons**: Lucide React
- **HTTP Client**: Centralized Axios client (`client/src/services/api.ts`) with request interceptors for JWT injection and response interceptors for global 401 handling.
- **Routing**: React Router DOM 7 with `RoleBasedRoute` guards and `AuthLayout` / `DashboardLayout`.

### Backend Server
- **Runtime**: Node.js 22 LTS with TypeScript 5
- **Framework**: Express 4 with modular routers
- **ORM**: Prisma Client 6 (`@prisma/client`) with PostgreSQL dialect
- **Validation**: Zod schema validation middleware (`validateBody`, `validateQuery`)
- **Security**: Helmet HTTP headers, CORS origin whitelisting, bcryptjs password hashing (10 rounds), jsonwebtoken (JWT).
- **Logging**: Morgan HTTP logger and custom structured console audit logger.

### Database
- **Engine**: PostgreSQL 15+ (relational integrity, foreign key cascades, unique constraints, native enums, indexes on search keys).

---

## 7. Architecture Overview

```mermaid
flowchart TD
    Client["React 19 + Vite Frontend Client (Port 5173)"]
    Axios["Centralized Axios Interceptor (Auth Token & Error Handler)"]
    Express["Express 4 Application Layer (Port 5000)"]
    AuthMW["JWT Authenticate Middleware"]
    RbacMW["Authorize Role-Based Guard (ADMIN / SALES_EXECUTIVE)"]
    Controllers["Express Route Controllers"]
    Services["Business Service Layer (Lead, Call, FollowUp, Dashboard, Report)"]
    Prisma["Prisma ORM (Schema & Client Engine)"]
    PostgreSQL[("PostgreSQL Database (pgfy_sales_crm)")]

    Client --> Axios
    Axios --> Express
    Express --> AuthMW
    AuthMW --> RbacMW
    RbacMW --> Controllers
    Controllers --> Services
    Services --> Prisma
    Prisma --> PostgreSQL
```

### Execution Flow: 8-Stage Customer Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin Manager
    actor Exec as Sales Executive
    participant API as Express API
    participant DB as PostgreSQL

    Admin->>API: POST /api/leads (Create new tenant lead)
    API->>DB: INSERT into leads (status=NEW, assignedExecutiveId=null)
    Admin->>API: PATCH /api/leads/:id/assign (Assign to Executive)
    API->>DB: INSERT into lead_assignments + UPDATE leads.assignedExecutiveId
    Exec->>API: GET /api/leads (View assigned queue)
    API->>DB: SELECT leads WHERE assignedExecutiveId = executive.id
    Exec->>API: POST /api/calls (Log call with outcome & schedule follow-up)
    API->>DB: Transaction: INSERT into calls + INSERT into follow_ups
    Exec->>API: PATCH /api/followups/:id/reschedule (Adjust follow-up date)
    API->>DB: UPDATE follow_ups SET dueAt = newDate
    Exec->>API: PATCH /api/followups/:id/status (Mark COMPLETED)
    API->>DB: UPDATE follow_ups SET status = 'COMPLETED'
    Exec->>API: PATCH /api/leads/:id/status (Mark CONVERTED)
    API->>DB: UPDATE leads SET status = 'CONVERTED'
    Admin->>API: GET /api/dashboard/admin/performance (Inspect updated leaderboard)
    API->>DB: Compute updated conversionRate & contacted counts
```

---

## 8. Database Schema Explanation

The schema is defined in [`server/prisma/schema.prisma`](file:///c:/Users/anwar/Desktop/pgfy-sales-crm/server/prisma/schema.prisma) and enforced on PostgreSQL:

```mermaid
erDiagram
    User ||--o{ LeadAssignment : assigns
    User ||--o{ LeadAssignment : receives
    User ||--o{ Call : makes
    User ||--o{ FollowUp : owns
    Lead ||--o{ LeadAssignment : tracks
    Lead ||--o{ Call : has
    Lead ||--o{ FollowUp : has
    Call ||--o{ FollowUp : schedules

    User {
        string id PK
        string email UK
        string name
        string password
        Role role
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    Lead {
        string id PK
        string customerName
        string mobileNumber
        string email
        string propertyCategory
        string preferredLocation
        decimal budget
        string leadSource
        LeadStatus status
        datetime enquiryDate
        string assignedExecutiveId FK
        datetime createdAt
        datetime updatedAt
    }

    LeadAssignment {
        string id PK
        string leadId FK
        string executiveId FK
        string assignedById FK
        datetime assignedAt
        datetime unassignedAt
    }

    Call {
        string id PK
        string leadId FK
        string executiveId FK
        datetime callDateTime
        int durationSeconds
        CallOutcome outcome
        string notes
        datetime createdAt
    }

    FollowUp {
        string id PK
        string leadId FK
        string executiveId FK
        string callId FK
        datetime dueAt
        FollowUpStatus status
        string notes
        datetime completedAt
        datetime createdAt
        datetime updatedAt
    }
```

### Enumerations
- **`Role`**: `ADMIN`, `SALES_EXECUTIVE`
- **`LeadStatus`**: `NEW`, `CONTACTED`, `INTERESTED`, `VISIT_SCHEDULED`, `NEGOTIATION`, `CONVERTED`, `LOST`
- **`CallOutcome`**: `CONNECTED`, `NOT_ANSWERED`, `BUSY`, `SWITCHED_OFF`, `INTERESTED`, `NOT_INTERESTED`, `CALL_BACK_REQUESTED`, `VISIT_SCHEDULED`, `CONVERTED`
- **`FollowUpStatus`**: `PENDING`, `COMPLETED`, `CANCELLED`

---

## 9. API Endpoint Documentation

All protected routes require header: `Authorization: Bearer <JWT>`.

### Authentication Routes (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|:---:|---|
| `POST` | `/api/auth/login` | Public | Authenticates credentials; returns user profile and JWT token. |
| `GET` | `/api/auth/me` | Authenticated | Retrieves current authenticated session user profile. |
| `POST` | `/api/auth/logout` | Authenticated | Discards active session on server. |

### Lead Management Routes (`/api/leads`)
| Method | Endpoint | Access | Description |
|---|---|:---:|---|
| `GET` | `/api/leads` | Scoped | Admin gets all company leads; Executive gets only assigned leads. |
| `POST` | `/api/leads` | Admin Only | Creates a new customer lead. |
| `GET` | `/api/leads/:id` | Scoped | Retrieves customer details. Blocks cross-executive IDOR tampering. |
| `PUT` | `/api/leads/:id` | Admin Only | Updates lead properties (location, category, budget, source). |
| `PATCH` | `/api/leads/:id/status` | Scoped | Updates lead pipeline status. |
| `PATCH` | `/api/leads/:id/assign` | Admin Only | Assigns or reassigns lead to executive, updating assignment ledger. |
| `GET` | `/api/leads/:id/assignments` | Admin Only | Retrieves chronological audit history of all assignments. |

### Call Tracking Routes (`/api/calls`)
| Method | Endpoint | Access | Description |
|---|---|:---:|---|
| `POST` | `/api/calls` | Executive | Records an outbound call. Executive ID strictly derived from JWT. |
| `GET` | `/api/calls` | Scoped | Admin views all calls; Executive views only their logged calls. |
| `GET` | `/api/calls/:id` | Scoped | Retrieves full call audit details. |
| `GET` | `/api/calls/lead/:leadId` | Scoped | Retrieves reverse-chronological call timeline for a lead. |

### Follow-Up Routes (`/api/followups`)
| Method | Endpoint | Access | Description |
|---|---|:---:|---|
| `GET` | `/api/followups` | Scoped | Lists follow-ups with classification filters (`today`, `upcoming`, `overdue`, `completed`). |
| `POST` | `/api/followups` | Executive | Creates standalone follow-up task. |
| `GET` | `/api/followups/:id` | Scoped | Retrieves follow-up details. |
| `PATCH` | `/api/followups/:id/status` | Executive | Marks task `COMPLETED` or `CANCELLED`. |
| `PATCH` | `/api/followups/:id/reschedule` | Executive | Updates `dueAt` date/time and records reschedule audit notes. |

### Dashboard & Analytics Routes (`/api/dashboard`)
| Method | Endpoint | Access | Description |
|---|---|:---:|---|
| `GET` | `/api/dashboard/admin` | Admin Only | Company pipeline metrics, dial volumes, and funnel charts. |
| `GET` | `/api/dashboard/admin/performance` | Admin Only | Per-executive performance leaderboard and conversion rates. |
| `GET` | `/api/dashboard/executive` | Executive | Personal sales metrics strictly derived from JWT identity. |

### CSV Report Routes (`/api/reports`)
| Method | Endpoint | Access | Description |
|---|---|:---:|---|
| `GET` | `/api/reports/leads` | Admin Only | Downloads RFC 4180 CSV containing all 12 lead attributes. |
| `GET` | `/api/reports/calls` | Admin Only | Downloads RFC 4180 CSV containing 9 call interaction attributes. |
| `GET` | `/api/reports/performance` | Admin Only | Downloads RFC 4180 CSV containing 11 executive metrics. |

---

## 10. Authentication and RBAC Explanation

1. **Password Security**: Passwords are never stored in plaintext. They are encrypted using `bcryptjs` with 10 salt rounds.
2. **Stateless JWT Authorization**: Upon login, the backend issues an HMAC-SHA256 token containing `{ id: user.id, role: user.role }` signed with `JWT_SECRET`. Tokens expire in 7 days (`JWT_EXPIRES_IN=7d`).
3. **Database Liveness Verification**: The `authenticate` middleware (`server/src/middleware/authenticate.ts`) verifies the cryptographic signature, checks token expiration, and confirms that `isActive === true` in PostgreSQL. If an executive account is deactivated, all active sessions are instantly invalidated.
4. **Authoritative Backend Guards**: Frontend route guards provide clean navigation UX, but the backend is strictly authoritative:
   - `authorize(Role.ADMIN)` blocks executives with **HTTP 403 Forbidden** on reports, assignments, and company analytics.
   - Database queries scope results using `where: { assignedExecutiveId: req.user.id }` for executive tokens, eliminating IDOR vulnerabilities.

---

## 11. Dashboard Metric Formulas

All metrics are calculated on PostgreSQL using exact mathematical formulations and guarded against zero-division errors:

### 1. Call Coverage Rate
$$\text{Call Coverage Rate} = \frac{\text{Unique Assigned Leads Contacted}}{\text{Total Assigned Leads}} \times 100$$
- *Condition*: A lead counts as contacted if at least one `Call` record exists for that lead during the current active assignment.
- *Zero Denominator*: Returns `0` if Total Assigned Leads is `0`.

### 2. Conversion Rate
$$\text{Conversion Rate} = \frac{\text{Converted Assigned Leads}}{\text{Total Assigned Leads}} \times 100$$
- *Condition*: Count of currently assigned leads whose status is `CONVERTED`.
- *Zero Denominator*: Returns `0` if Total Assigned Leads is `0`.

### 3. Connection Rate
$$\text{Connection Rate} = \frac{\text{Connected Calls}}{\text{Total Calls}} \times 100$$
- *Condition*: Count of logged calls whose outcome is `CONNECTED` divided by total logged calls.
- *Zero Denominator*: Returns `0` if Total Calls is `0`.

---

## 12. CSV Report Functionality

The platform provides 3 automated report generators located in [`server/src/services/report.service.ts`](file:///c:/Users/anwar/Desktop/pgfy-sales-crm/server/src/services/report.service.ts):

1. **All Leads Report** (`GET /api/reports/leads`):
   - Columns: Lead ID, Customer Name, Mobile Number, Email, Property Category, Preferred Location, Budget INR, Lead Source, Lead Status, Assigned Executive Name, Enquiry Date, Created Date.
2. **Call History Report** (`GET /api/reports/calls`):
   - Columns: Call ID, Customer Name, Customer Mobile, Executive Name, Call Date and Time, Duration, Call Outcome, Call Notes, Next Follow-up Date.
3. **Sales Executive Performance Report** (`GET /api/reports/performance`):
   - Columns: Executive Name, Assigned Leads, Unique Leads Contacted, Converted Leads, Total Calls, Connected Calls, Pending Follow-ups, Overdue Follow-ups, Call Coverage Rate, Conversion Rate, Connection Rate.

### RFC 4180 & Excel Compatibility Standards
- Prepend UTF-8 Byte Order Mark (`\uFEFF`) to prevent Indian character corruption in Microsoft Excel.
- Wrap values in double quotes (`"..."`) and escape internal quotes (`""`) if they contain commas, line breaks, or quotation marks.
- Sanitize values starting with `=`, `+`, `-`, or `@` to neutralize CSV formula injection attacks.

---

## 13. Project Folder Structure

```
pgfy-sales-crm/
├── .env.example                 # Root environment template (placeholders only)
├── .gitignore                   # Excludes node_modules, build dist, logs, and .env
├── README.md                    # Master technical documentation
├── ai-logs/                     # Complete AI development logs
│   ├── README.md                # AI logs index and methodology
│   ├── day-1.md                 # Day 1 architectural decisions & scaffolding
│   └── day-2.md                 # Day 2 advanced features, testing & audit
├── sample-exports/              # Live-generated sample CSV files
│   ├── leads.csv                # 12-column master leads directory
│   ├── call-history.csv         # 9-column chronological interaction logs
│   └── executive-performance.csv# 11-column sales performance leaderboard
├── docs/                        # Static assets & screenshots
│   └── screenshots/             # High-resolution UI captures
├── client/                      # React 19 + Vite frontend application
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── src/
│       ├── components/          # Common, leads, calls, and follow-up UI components
│       ├── context/             # AuthContext session provider
│       ├── layouts/             # AppLayout, AuthLayout, DashboardLayout
│       ├── pages/               # Admin pages, Executive pages, Login
│       ├── services/            # Centralized Axios client & API services
│       └── types/               # Shared TypeScript domain contracts
└── server/                      # Express + TypeScript backend application
    ├── package.json
    ├── tsconfig.json
    ├── .env.example             # Server environment template
    ├── prisma/
    │   ├── schema.prisma        # Authoritative PostgreSQL Prisma schema
    │   ├── migrations/          # Version-controlled SQL migrations
    │   └── seed.ts              # Idempotent realistic Indian dataset seeder
    └── src/
        ├── app.ts               # Express configuration, CORS, routes mounting
        ├── server.ts            # HTTP server bootstrap & port listener
        ├── config/              # Environment config & Prisma client instance
        ├── controllers/         # HTTP request/response handlers
        ├── middleware/          # authenticate, authorize, validate, errorHandler
        ├── routes/              # Express router definitions
        ├── services/            # Domain business logic & telemetry calculations
        ├── utils/               # CSV generator, IST date utilities, AppError
        └── validators/          # Zod request validation schemas
```

---

## 14. Prerequisites

Before running the application locally, ensure you have:
- **Node.js**: `v18.x` or higher (tested on Node `v22.14.0`)
- **npm**: `v9.x` or higher
- **PostgreSQL**: `v14.x` or higher running locally or accessible via network
- Modern web browser (Chrome, Edge, Firefox, Brave)

---

## 15. PostgreSQL Setup

1. Start your local PostgreSQL server:
   ```bash
   # Windows (PowerShell / Services)
   Start-Service postgresql-x64-15  # Adjust service name to your version

   # macOS (Homebrew)
   brew services start postgresql@15

   # Linux (systemd)
   sudo systemctl start postgresql
   ```

2. Open `psql` and create the dedicated database:
   ```sql
   CREATE DATABASE pgfy_sales_crm;
   ```

3. Ensure your PostgreSQL user has `ALL PRIVILEGES` on `pgfy_sales_crm`.

---

## 16. Environment Variable Setup

Copy the environment template in both the root directory and the server directory:

```bash
# In project root
cp .env.example .env

# In server directory
cp server/.env.example server/.env
```

Open `.env` (or `server/.env`) and configure your PostgreSQL database credentials:

```env
NODE_ENV=development
PORT=5000

# PostgreSQL Connection String
DATABASE_URL=postgresql://your_db_user:your_db_password@localhost:5432/pgfy_sales_crm?schema=public

# JWT Secret (Generate a strong 32+ character secret)
JWT_SECRET=super_secret_jwt_key_at_least_32_characters_pgfy_2026
JWT_EXPIRES_IN=7d

# CORS Allowed Origin
CLIENT_URL=http://localhost:5173
```

> **Security Note**: Never commit actual `.env` files to git. `.env` is ignored by [`.gitignore`](file:///c:/Users/anwar/Desktop/pgfy-sales-crm/.gitignore).

---

## 17. Prisma Migration Instructions

Run Prisma migration to generate all tables, enums, foreign keys, and indexes:

```bash
cd server
npm run prisma:migrate
```

*Expected output*: `Your database is now in sync with your schema.`

To inspect database status at any time:
```bash
npm exec prisma migrate status
```

---

## 18. Database Seed Instructions

Populate the database with realistic demo accounts, fictional Indian customer enquiries, call interactions across all 9 outcomes, and IST-aligned follow-up tasks:

```bash
cd server
npm run prisma:seed
```

To verify the seeded data integrity:
```bash
npm run verify:seed
```

*Seeded Dataset Highlights*:
- 4 Users (1 Admin, 2 Active Executives, 1 Deactivated test account)
- 42 Fictional Indian Leads across 10 locations (Whitefield, HSR Layout, Koramangala, Indiranagar, Bellandur, Electronic City, etc.)
- 52 Outbound calls distributed across all 9 standardized outcomes
- 11 IST follow-up tasks (Today's, Upcoming, Overdue, Completed, Cancelled)

---

## 19. Backend Startup Instructions

From the `server` directory:

```bash
cd server

# Install dependencies if not already done
npm install

# Start development server with live reload (Port 5000)
npm run dev
```

*Backend Health Check*: Navigate to `http://localhost:5000/api/health` (returns HTTP 200 OK with server status) or `http://localhost:5000/api/auth/me` (returns HTTP 401 when unauthenticated).

---

## 20. Frontend Startup Instructions

From the `client` directory in a new terminal:

```bash
cd client

# Install dependencies if not already done
npm install

# Start Vite development server (Port 5173)
npm run dev
```

Open your browser and navigate to: **`http://localhost:5173`**

---

## 21. Demo Login Credentials

The application provides 1-click Quick Demo login buttons on the login screen, or you can sign in manually:

| Role | Email | Password | Primary Workflow |
|---|---|---|---|
| **Admin** | `admin@pgfy.demo` | `Admin@123` | Overview metrics, lead allocation, executive performance leaderboard, and 3 CSV report downloads. |
| **Sales Executive 1** | `sales@pgfy.demo` | `Sales@123` | Personal sales dashboard, assigned leads queue, outbound call logging, and follow-up scheduling. |
| **Sales Executive 2** | `sales2@pgfy.demo` | `Sales2@123` | Secondary executive for testing reassignment, team leaderboards, and IDOR isolation. |

---

## 22. Testing Instructions

The project features 8 automated test suites verifying all backend endpoints, mathematical rates, and security boundaries:

```bash
cd server

# 1. Run full master test suite (All 8 suites, 258 tests)
npm test

# 2. Run individual test suites
npm run test:auth        # Authentication & RBAC guards (17 tests)
npm run test:leads       # Lead CRUD & assignment ledger (25 tests)
npm run test:dashboard   # Math formulas & zero division (75 tests)
npm run test:calls       # 9 call outcomes & interaction logging (32 tests)
npm run test:followups   # IST follow-up classifications (26 tests)
npm run test:reports     # CSV exports & RFC 4180 formatting (15 tests)
npm run test:lifecycle   # 8-Stage E2E customer lifecycle (24 tests)
npm run test:audit       # Comprehensive QA & security audit (44 tests)
```

### Frontend Build Verification
```bash
cd client
npm run build
```
*Expected output*: `✓ built in ~3.0s` with exit code 0 and 0 TypeScript errors.

---

## 23. Screenshots Section

### 1. Admin Management Dashboard
![Admin Dashboard](docs/screenshots/admin-dashboard.png)
*Figure 1: Admin Overview featuring aggregate pipeline counters, call metrics, conversion rates, and executive leaderboard.*

### 2. Admin Reports & Data Exports
![Admin Reports](docs/screenshots/admin-reports.png)
*Figure 2: Admin Reports module with 1-click RFC 4180 CSV downloads for All Leads, Call History, and Sales Performance.*

### 3. Sales Executive Dashboard
![Executive Dashboard](docs/screenshots/executive-dashboard.png)
*Figure 3: Sales Executive portal showing personal pipeline telemetry (Coverage, Conversion, and Connection rates).*

### 4. Assigned Leads Queue
![Executive Leads](docs/screenshots/executive-leads.png)
*Figure 4: Executive assigned leads view with status badges, budget ranges, and quick action buttons.*

### 5. Outbound Call History
![Executive Calls](docs/screenshots/executive-calls.png)
*Figure 5: Chronological outbound call records showing call outcome badges, duration in seconds, and caller notes.*

### 6. Follow-Up Task Management
![Executive Follow-ups](docs/screenshots/executive-follow-ups.png)
*Figure 6: IST calendar-classified follow-up management interface supporting completion, cancellation, and rescheduling.*

---

## 24. Known Limitations

1. **Simulated Telephony Integration**: The system captures and logs real outbound calls, durations, outcomes, and follow-ups through an interactive call logger, but does not bundle an embedded WebRTC VoIP dialer (e.g. Twilio Voice SDK).
2. **Single Currency**: Budgets and monetary values are denominated in Indian Rupees (INR, ₹).
3. **Session Revocation Mechanism**: The current JWT implementation uses stateless signatures with database liveness checks (`isActive`). Blacklisting individual tokens before expiration without deactivating the account is not implemented.

---

## 25. Deployment Instructions

### Production Build
1. Build the frontend distribution:
   ```bash
   cd client
   npm run build
   ```
   *Static assets are compiled into `client/dist/`.*

2. Compile the backend TypeScript:
   ```bash
   cd server
   npm run build
   ```
   *Compiled JavaScript is generated in `server/dist/`.*

3. Start the production backend server:
   ```bash
   NODE_ENV=production node dist/server.js
   ```

### Reverse Proxy Deployment (Nginx / Cloud)
- Serve `client/dist/` as static assets or via an S3/CloudFront/Vercel distribution.
- Reverse proxy API requests (`/api/*`) to the Node.js Express server running on port `5000`.
- Ensure SSL/TLS is terminated at the reverse proxy with `X-Forwarded-Proto` and `X-Forwarded-For` headers enabled.
- Set production environment variables (`NODE_ENV=production`, strong random `JWT_SECRET`, and managed PostgreSQL `DATABASE_URL` with SSL mode enabled).

> **Deployment Status**: Configured for local production builds and standard containerized deployments. (Not deployed to a public cloud instance).
