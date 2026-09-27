# SeatFlow Frontend

Angular 18 standalone application for SeatFlow ticket booking.

## Requirements

- Node.js 18+
- Backend API running at `http://localhost:3000` (see root README)

## Setup

```bash
npm install
npx ng serve --port 4200
```

Open http://localhost:4200

## Configuration

`src/environments/environment.ts` points to the local API and Socket.IO server.
For production, set `apiUrl` and `socketUrl` to your deployed API origin and serve the app behind the same domain or configure CORS.

## Pages

| Path | Description |
|------|-------------|
| `/` | Home and upcoming events |
| `/events` | Search and list events |
| `/events/:id` | Event details and shows |
| `/shows/:showId/seats` | Seat selection (auth required) |
| `/checkout/:reservationId` | Payment (auth required) |
| `/bookings` | User booking history |
| `/admin` | Admin metrics (admin role) |
| `/privacy` | Privacy policy |
| `/terms` | Terms and conditions |

## Favicon

`src/assets/favicon.svg` is linked from `index.html`.
