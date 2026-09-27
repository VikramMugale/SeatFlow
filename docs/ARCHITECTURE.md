# SeatFlow Architecture Notes

## Why Modular Monolith?

For a portfolio project, a modular monolith with clear service boundaries demonstrates microservice thinking without the operational cost of 8 independently deployed services.

Boundaries map 1:1 to future extractable services:

| Module        | Future Service     | DB Ownership      |
|---------------|--------------------|-------------------|
| auth/users    | Auth Service       | PostgreSQL        |
| events        | Event Service      | PG + Mongo metadata |
| venues/shows  | Catalog Service    | PostgreSQL        |
| seats/reservations | Inventory Service | PG + Redis locks |
| bookings/payments  | Booking Service   | PostgreSQL        |
| notifications | Notification Service | MongoDB + BullMQ |

## Double-Booking Prevention

```
User A & User B select seat A10 simultaneously

1. Both hit POST /api/reservations
2. Redis SET seat-lock:{showId}:{seatId} userId NX EX 300
3. Only one SET returns OK
4. Winner creates reservation in PG transaction
5. Loser gets 409 SEAT_LOCKED
```

Redis is the **admission control**. PostgreSQL is the **system of record** for bookings.

## Payment Source of Truth

Frontend success callback is **not** trusted.

```
Stripe/Razorpay → POST /api/payments/webhook
  → verify signature
  → check processed_webhooks.event_id (UNIQUE)
  → if new: confirm payment + create booking + mark seats BOOKED
  → if duplicate: return already_processed
```

## Failure Modes Handled

| Failure                    | Mitigation                                      |
|----------------------------|-------------------------------------------------|
| Redis down                 | API returns error — no unsafe booking           |
| Payment OK, API crash      | Webhook retry confirms booking                  |
| Webhook delivered 3x       | Idempotency key on event_id                     |
| User closes browser        | Redis TTL auto-releases seats                   |
| Worker crash               | BullMQ retries with backoff                     |
| Socket disconnect          | Client re-fetches seats via REST                |

## Seat State Machine

```
AVAILABLE → LOCKED (Redis + PG) → BOOKED (payment webhook)
                ↓
            AVAILABLE (expiry / cancel / payment fail)
```
