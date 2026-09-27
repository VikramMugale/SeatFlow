import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BookingService } from '../../core/services/booking.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container">
      <h1 class="page-title">Checkout</h1>
      <p class="page-sub">Complete payment before the reservation expires</p>

      @if (error) {
        <div class="alert alert-error">{{ error }}</div>
      }
      @if (success) {
        <div class="alert alert-success">
          Booking confirmed! <a [routerLink]="['/bookings', bookingId]">View ticket</a>
        </div>
      }

      @if (loading) {
        <p class="muted">Loading reservation…</p>
      } @else if (reservation) {
        <div class="layout">
          <div class="card">
            <h3>Reservation summary</h3>
            <dl class="summary-list">
              <dt>Seats</dt>
              <dd>{{ seatLabels }}</dd>
              <dt>Amount</dt>
              <dd>₹{{ reservation.amount || totalAmount }}</dd>
              <dt>Status</dt>
              <dd>
                <span class="badge" [class.badge-success]="reservation.status === 'ACTIVE'">{{
                  reservation.status
                }}</span>
              </dd>
            </dl>

            <div class="timer" [class.urgent]="secondsLeft < 60">
              Expires in {{ timerDisplay }}
            </div>

            <div class="actions">
              <button
                class="btn btn-primary"
                [disabled]="paying || expired || reservation.status !== 'ACTIVE'"
                (click)="pay()"
              >
                {{ paying ? 'Processing…' : 'Complete payment' }}
              </button>
              <button class="btn btn-ghost" [disabled]="paying" (click)="cancel()">
                Cancel reservation
              </button>
            </div>
            <p class="hint">
              Payment is confirmed on the server after verification. Do not close this page until confirmation appears.
            </p>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .layout {
        max-width: 480px;
      }
      .summary-list {
        display: grid;
        grid-template-columns: 100px 1fr;
        gap: 0.5rem 1rem;
        margin: 1rem 0;
      }
      .summary-list dt {
        color: var(--muted);
      }
      .timer {
        font-size: 1.5rem;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        margin: 1rem 0;
        color: var(--primary-hover);
      }
      .timer.urgent {
        color: var(--danger);
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        margin-top: 1rem;
      }
      .hint {
        margin-top: 1rem;
        font-size: 0.8rem;
        color: var(--muted);
      }
      .muted {
        color: var(--muted);
      }
    `,
  ],
})
export class CheckoutComponent implements OnInit, OnDestroy {
  reservationId = '';
  reservation: any = null;
  loading = true;
  paying = false;
  error = '';
  success = false;
  bookingId = '';
  secondsLeft = 0;
  private timerId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private bookingService: BookingService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.reservationId = this.route.snapshot.paramMap.get('reservationId')!;
    this.bookingService.getReservation(this.reservationId).subscribe({
      next: (res) => {
        this.reservation = res.data || res;
        this.loading = false;
        this.startTimer();
      },
      error: (err) => {
        this.error = err.error?.message || 'Reservation not found';
        this.loading = false;
      },
    });
  }

  ngOnDestroy() {
    if (this.timerId) clearInterval(this.timerId);
  }

  get seatLabels(): string {
    const seats = this.reservation?.seats || [];
    return seats.map((s: any) => s.seatLabel || s.seat_label || s.label || s).join(', ');
  }

  get totalAmount(): number {
    const seats = this.reservation?.seats || [];
    return seats.reduce((sum: number, s: any) => sum + (Number(s.price) || 0), 0);
  }

  get expired(): boolean {
    return this.secondsLeft <= 0;
  }

  get timerDisplay(): string {
    const m = Math.floor(Math.max(0, this.secondsLeft) / 60);
    const s = Math.max(0, this.secondsLeft) % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  private startTimer() {
    const exp = this.reservation?.expiresAt || this.reservation?.expires_at;
    if (!exp) return;
    const update = () => {
      this.secondsLeft = Math.floor((new Date(exp).getTime() - Date.now()) / 1000);
    };
    update();
    this.timerId = setInterval(update, 1000);
  }

  pay() {
    this.error = '';
    this.paying = true;
    this.bookingService.createPayment(this.reservationId).subscribe({
      next: (res) => {
        const order = res.data || res;
        const orderId = order.orderId || order.id;
        // Simulate payment success + webhook (dev endpoint)
        this.http
          .post(`${environment.apiUrl}/payments/simulate-success`, {
            orderId,
            paymentId: `pay_sim_${Date.now()}`,
            reservationId: this.reservationId,
          })
          .subscribe({
            next: (payRes: any) => {
              this.paying = false;
              this.success = true;
              this.bookingId =
                payRes.data?.bookingId || payRes.data?.id || payRes.bookingId || '';
              if (this.bookingId) {
                setTimeout(() => this.router.navigate(['/bookings', this.bookingId]), 1500);
              } else {
                this.router.navigate(['/bookings']);
              }
            },
            error: (err) => {
              this.paying = false;
              this.error = err.error?.message || 'Payment confirmation failed';
            },
          });
      },
      error: (err) => {
        this.paying = false;
        this.error = err.error?.message || 'Could not create payment';
      },
    });
  }

  cancel() {
    this.bookingService.cancelReservation(this.reservationId).subscribe({
      next: () => this.router.navigate(['/events']),
      error: (err) => {
        this.error = err.error?.message || 'Cancel failed';
      },
    });
  }
}
