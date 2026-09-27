import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BookingService } from '../../core/services/booking.service';

@Component({
  selector: 'app-booking-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container">
      @if (loading) {
        <p class="muted">Loading…</p>
      } @else if (!booking) {
        <p class="muted">Booking not found.</p>
      } @else {
        <div class="card ticket">
          <div class="ticket-header">
            <span class="badge" [ngClass]="statusClass(booking.status)">{{ booking.status }}</span>
            <h1>Booking confirmed</h1>
            <p class="code">{{ booking.booking_code || booking.bookingCode || booking.id }}</p>
          </div>

          <dl class="details">
            <dt>Event</dt>
            <dd>{{ booking.event_title || booking.eventTitle }}</dd>
            <dt>Venue</dt>
            <dd>{{ booking.venue_name || booking.venueName || 'Venue not listed' }}</dd>
            <dt>Date</dt>
            <dd>{{ booking.show_date || booking.showDate | date: 'fullDate' }}</dd>
            <dt>Time</dt>
            <dd>{{ (booking.show_time || booking.showTime || '').slice(0, 5) }}</dd>
            <dt>Seats</dt>
            <dd>{{ formatSeats(booking) }}</dd>
            <dt>Amount</dt>
            <dd>₹{{ booking.amount }}</dd>
          </dl>

          @if (booking.status === 'CONFIRMED') {
            <button class="btn btn-danger" [disabled]="cancelling" (click)="cancel()">
              {{ cancelling ? 'Cancelling…' : 'Cancel booking' }}
            </button>
          }

          @if (message) {
            <div class="alert" [class.alert-success]="!error" [class.alert-error]="error" style="margin-top:1rem">
              {{ message }}
            </div>
          }

          <a routerLink="/bookings" class="back">← All bookings</a>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .ticket {
        max-width: 480px;
      }
      .ticket-header h1 {
        font-size: 1.5rem;
        margin: 0.5rem 0 0.25rem;
      }
      .code {
        font-family: ui-monospace, monospace;
        color: var(--muted);
        font-size: 0.9rem;
      }
      .details {
        display: grid;
        grid-template-columns: 100px 1fr;
        gap: 0.6rem 1rem;
        margin: 1.5rem 0;
      }
      .details dt {
        color: var(--muted);
      }
      .back {
        display: inline-block;
        margin-top: 1.5rem;
        color: var(--muted);
      }
      .muted {
        color: var(--muted);
      }
    `,
  ],
})
export class BookingDetailComponent implements OnInit {
  booking: any = null;
  loading = true;
  cancelling = false;
  message = '';
  error = false;

  constructor(
    private route: ActivatedRoute,
    private bookingService: BookingService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.bookingService.getBooking(id).subscribe({
      next: (res) => {
        this.booking = res.data || res;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  formatSeats(b: any): string {
    const seats = b.seats || [];
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
      default:
        return 'badge-muted';
    }
  }

  cancel() {
    if (!confirm('Cancel this booking?')) return;
    this.cancelling = true;
    this.bookingService.cancelBooking(this.booking.id).subscribe({
      next: (res) => {
        this.cancelling = false;
        this.booking = { ...this.booking, status: 'CANCELLED' };
        this.message = res.message || 'Booking cancelled';
        this.error = false;
      },
      error: (err) => {
        this.cancelling = false;
        this.message = err.error?.message || 'Cancel failed';
        this.error = true;
      },
    });
  }
}
