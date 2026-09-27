# Angular Pages (scaffold)

Generate the full Angular app with:

```bash
cd frontend
npx @angular/cli@18 new seatflow-ui --routing --style=scss --skip-git
# then copy services from src/app/core into the generated project
```

Suggested routes:

| Path | Component | Auth |
|------|-----------|------|
| `/` | HomeComponent | Public |
| `/login` | LoginComponent | Public |
| `/register` | RegisterComponent | Public |
| `/events` | EventsListComponent | Public |
| `/events/:id` | EventDetailsComponent | Public |
| `/shows/:showId/seats` | SeatMapComponent | Customer |
| `/checkout/:reservationId` | CheckoutComponent | Customer |
| `/bookings` | MyBookingsComponent | Customer |
| `/bookings/:id` | BookingDetailComponent | Customer |
| `/admin` | AdminDashboardComponent | Admin |
| `/admin/events` | AdminEventsComponent | Admin |
| `/admin/venues` | AdminVenuesComponent | Admin |
| `/admin/shows` | AdminShowsComponent | Admin |

## Seat Map UI notes

- Load seats via `SeatService.loadSeats(showId)`
- Join Socket.IO room `show:{showId}` for live updates
- Legend: Available / Locked / Booked / Selected
- On select → call `BookingService.createReservation`
- Show countdown from `expiresAt`
