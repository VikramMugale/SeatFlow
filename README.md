# SeatFlow — Distributed Ticket Booking Platform

A production-oriented distributed ticket booking system demonstrating:

1. **Distributed locking** (Redis `SET NX EX`) to prevent double-booking
2. **Idempotent payment webhooks** to avoid duplicate bookings
3. **Async jobs** (BullMQ) for expiration, notifications, tickets
4. **Real-time seat updates** (Socket.IO)
5. **Transactional consistency** (PostgreSQL ACID)

## Architecture

```
Angular Frontend
       │
       ▼
  Express API (modular monolith)
       │
  ┌────┼────┬────────┬─────────┐
  │    │    │        │         │
 PG  Mongo Redis  BullMQ   Socket.IO
```

**PostgreSQL** owns: users, events, venues, shows, seats, reservations, bookings, payments, webhooks  
**MongoDB** ready for: event metadata, notifications, audit logs, search documents  
**Redis**: seat locks, cache, BullMQ backend

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 16+
- Redis 7+
- MongoDB 7 (optional; Mongo-backed features are unavailable when it is not connected)
- (Optional) Angular CLI for frontend

### 1. Install and configure local services

Install PostgreSQL and Redis as native services for your operating system and start them using its service manager. MongoDB is optional and can also be installed as a native service. Create a PostgreSQL login and database for SeatFlow, for example:

```sql
CREATE ROLE seatflow WITH LOGIN PASSWORD 'seatflow_secret';
CREATE DATABASE seatflow OWNER seatflow;
```

Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL` and `REDIS_URL` to match your local services. `REDIS_URL` must be a raw `redis://` or `rediss://` URL, not a `redis-cli` command. Set `MONGODB_URI` if MongoDB is available; the API starts without it, but MongoDB-backed features and its health check remain unavailable. The example values assume local services on their default ports and an unauthenticated local Redis/MongoDB.

### 2. Initialize and start the backend

```bash
cd backend
npm install
npm run migrate
node src/scripts/seed.js
npm run dev
```

Run `npm run migrate` once against a new, empty database. It applies `src/scripts/schema.sql` and is not a repeatable migration on an already initialized database.

API: `http://localhost:3000`  
Health: `http://localhost:3000/api/health`

### 3. Seed credentials

| Role     | Email                  | Password       |
|----------|------------------------|----------------|
| Admin    | admin@seatflow.com     | Admin@12345    |
| Customer | customer@seatflow.com  | Customer@123   |

### 4. Frontend (Angular 18 standalone)

```bash
cd frontend
npm install
npx ng serve --port 4200
```

App: `http://localhost:4200`

Pages: Home · Login/Register · Events · Event details · Seat map (Socket.IO) · Checkout · My bookings · Admin dashboard

## Core Flow (Customer)

```
REGISTER → LOGIN → BROWSE EVENTS → SELECT SHOW
    → VIEW SEATS → SELECT SEATS → REDIS LOCK
    → RESERVATION (5 min TTL) → CHECKOUT → PAYMENT
    → WEBHOOK (idempotent) → BOOKING CONFIRMED
    → TICKET + NOTIFICATION → SOCKET.IO UPDATE
```

## Critical APIs

### Auth
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/me
```

### Events / Venues / Shows
```
GET  /api/events
GET  /api/events/:id
POST /api/events          (ADMIN)
GET  /api/venues
POST /api/venues          (ADMIN)
POST /api/venues/:id/screens  (ADMIN)
GET  /api/shows
POST /api/shows           (ADMIN)
GET  /api/shows/:showId/seats
```

### Reservation (distributed lock)
```
POST /api/reservations
  Body: { "showId": "...", "seatIds": ["uuid1", "uuid2"] }
  Header: Idempotency-Key: optional-unique-key

GET  /api/reservations/:id
DELETE /api/reservations/:id
```

### Payment
```
POST /api/payments/create
  Body: { "reservationId": "..." }

POST /api/payments/webhook   (source of truth)

POST /api/payments/simulate-success   (dev only)
  Body: { "orderId": "...", "paymentId": "...", "reservationId": "..." }
```

### Bookings
```
GET  /api/bookings
GET  /api/bookings/:id
POST /api/bookings/:id/cancel
```

### Users / Admin
```
GET  /api/users              (ADMIN)
GET  /api/users/stats        (ADMIN)
GET  /api/users/:id          (ADMIN)
PATCH /api/users/:id         (ADMIN)
POST /api/users/me/change-password
POST /api/auth/forgot-password
POST /api/auth/reset-password
```

## Redis Seat Lock

```
Key:   seat-lock:{showId}:{seatId}
Value: userId
TTL:   300 seconds (configurable)

SET seat-lock:show123:seat-uuid user123 NX EX 300
```

- `NX` → only if key does not exist  
- On payment success → seats marked `BOOKED`, locks released  
- On expiry / cancel / payment fail → seats return to `AVAILABLE`

## Idempotent Webhooks

```
processed_webhooks.event_id  UNIQUE
```

Duplicate webhooks are ignored after the first successful process.

## Socket.IO Events

Join room: `join:show` with `showId`

Emitted:
- `seat:locked`
- `seat:released`
- `seat:booked`
- `reservation:expired`
- `booking:confirmed`

## Testing Concurrency

```bash
# With Redis + API running, simulate 100 concurrent lock attempts on same seat
# (example script in scripts/concurrency-test.js)
```

Expected: **1 success, 99 rejected**.

## Project Structure

```
seatflow/
├── backend/
│   ├── src/
│   │   ├── config/       # env, postgres, redis
│   │   ├── modules/      # auth, users, events, venues, shows, seats,
│   │   │                 # reservations, bookings, payments, notifications
│   │   ├── jobs/         # BullMQ queues + workers
│   │   ├── sockets/      # Socket.IO
│   │   ├── middleware/
│   │   ├── routes/
│   │   └── server.js
│   └── package.json
├── frontend/             # Angular 18 standalone app (seat map, checkout, admin)
├── scripts/              # concurrency-test.js
└── README.md
```

## Feature Checklist

| Module         | Status |
| -------------- | ------ |
| Authentication | Register / Login / Logout / Refresh / Forgot / Reset |
| Authorization  | CUSTOMER / ADMIN RBAC |
| Events         | CRUD + search/filter |
| Venues         | CRUD + screens |
| Shows          | CRUD + pricing |
| Seats          | Map + status per show |
| Reservation    | Redis SET NX EX lock + TTL |
| Booking        | Confirm / cancel / history |
| Payments       | Order + idempotent webhook |
| BullMQ         | Expiry, notifications, tickets, cleanup |
| Socket.IO      | seat:locked / released / booked |
| Admin          | Stats + user management |
| Database       | PostgreSQL (ACID) + MongoDB (notifications) |
| Security       | JWT, Helmet, rate limit, validation |
| Testing        | Unit seat-lock + concurrency script |
| DevOps         | Native PostgreSQL and Redis services |

## Phase Roadmap

| Phase | Scope | Status |
|-------|--------|--------|
| 1 | Auth, Events, Venues, Shows, Seats, Reservations, Bookings, PostgreSQL | Done |
| 2 | Redis locking, Idempotency, Payment webhooks | Done |
| 3 | Socket.IO, BullMQ, Notifications, Tickets | Done |
| 4 | Health checks, Rate limiting, Tests, Logging | Done |

## Security

- bcrypt password hashing  
- JWT access + rotating refresh tokens  
- RBAC (CUSTOMER / ADMIN)  
- Helmet, CORS, rate limiting  
- Parameterized SQL  
- Webhook signature verification (stub ready)  
- No secrets in git (`.env.example` only)

## License

MIT — for portfolio / learning use.
