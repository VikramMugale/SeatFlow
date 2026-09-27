import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BookingService } from '../../core/services/booking.service';

@Component({
  selector: 'app-my-bookings',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container">
      <h1 class="page-title">My bookings</h1>
      <p class="page-sub">Upcoming, completed & cancelled</p>

      @if (loading) {
        <p class="muted">Loading…</p>
      } @else if (bookings.length === 0) {
        <p class="muted">No bookings yet. <a routerLink="/events">Browse events</a></p>
      } @else {
        <div class="grid">
          @for (b of bookings; track b.id) {
            <a [routerLink]="['/bookings', b.id]" class="card booking-card">
              <div class="row">
                <strong>{{ b.event_title || b.eventTitle || 'Event' }}</strong>
                <span class="badge" [ngClass]="statusClass(b.status)">{{ b.status }}</span>
              </div>
              <p class="muted">
                {{ b.show_date || b.showDate | date: 'mediumDate' }}
                ·
                {{ (b.show_time || b.showTime || '').slice(0, 5) }}
              </p>
              <p class="muted">Seats: {{ formatSeats(b) }} | ₹{{ b.amount }}</p>
              <p class="id">{{ b.booking_code || b.bookingCode || b.id }}</p>
            </a>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .booking-card {
        display: block;
        color: inherit;
        text-decoration: none;
        margin-bottom: 0.75rem;
      }
      .booking-card:hover {
        border-color: var(--primary);
        text-decoration: none;
      }
      .row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        margin-bottom: 0.35rem;
      }
      .muted {
        color: var(--muted);
        font-size: 0.9rem;
      }
      .id {
        font-size: 0.75rem;
        color: var(--muted);
        margin-top: 0.5rem;
        font-family: ui-monospace, monospace;
      }
    `,
  ],
})
export class MyBookingsComponent implements OnInit {
  bookings: any[] = [];
  loading = true;

  constructor(private bookingService: BookingService) {}

  ngOnInit() {
    this.bookingService.listBookings().subscribe({
      next: (res) => {
        this.bookings = res.data?.bookings || res.data || [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  formatSeats(b: any): string {
    const seats = b.seats || b.seat_labels || [];
    if (typeof seats === 'string') return seats;
    return seats.map((s: any) => s.seatLabel || s.seat_label || s.label || s).join(', ');
  }

  statusClass(status: string): string {
    switch (status) {
      case 'CONFIRMED':
        return 'badge-success';
      case 'CANCELLED':
      case 'REFUNDED':
        return 'badge-danger';
      case 'PENDING':
        return 'badge-warning';
      default:
        return 'badge-muted';
    }
  }
}
