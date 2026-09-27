import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Seat, SeatService } from '../../core/services/seat.service';
import { BookingService } from '../../core/services/booking.service';

@Component({
  selector: 'app-seat-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container">
      <h1 class="page-title">Select seats</h1>
      <p class="page-sub">Seat availability updates automatically. Selected seats are held for a limited time.</p>

      @if (error) {
        <div class="alert alert-error">{{ error }}</div>
      }

      <div class="legend">
        <span><i class="dot available"></i> Available</span>
        <span><i class="dot selected"></i> Selected</span>
        <span><i class="dot locked"></i> Locked</span>
        <span><i class="dot booked"></i> Booked</span>
      </div>

      <div class="screen">SCREEN</div>

      @if (loading) {
        <p class="muted">Loading seats…</p>
      } @else {
        <div class="seat-grid">
          @for (row of rows; track row) {
            <div class="row">
              <span class="row-label">{{ row }}</span>
              @for (seat of seatsByRow[row]; track seat.id) {
                <button
                  type="button"
                  class="seat"
                  [class.available]="seat.status === 'AVAILABLE' && !isSelected(seat)"
                  [class.selected]="isSelected(seat)"
                  [class.locked]="seat.status === 'LOCKED'"
                  [class.booked]="seat.status === 'BOOKED' || seat.status === 'BLOCKED'"
                  [disabled]="seat.status !== 'AVAILABLE' && !isSelected(seat)"
                  (click)="toggle(seat)"
                  [title]="seat.label + ' - ₹' + seat.price"
                >
                  {{ seat.number }}
                </button>
              }
            </div>
          }
        </div>
      }

      <div class="summary card">
        <div>
          <strong>{{ selected.length }}</strong> seat(s) selected
          @if (selected.length) {
            : {{ selectedLabels }} (₹{{ total }})
          }
        </div>
        <button
          class="btn btn-primary"
          [disabled]="!selected.length || reserving"
          (click)="reserve()"
        >
          {{ reserving ? 'Locking seats…' : 'Continue to checkout' }}
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .legend {
        display: flex;
        flex-wrap: wrap;
        gap: 1.25rem;
        margin-bottom: 1.5rem;
        font-size: 0.875rem;
        color: var(--muted);
      }
      .dot {
        display: inline-block;
        width: 12px;
        height: 12px;
        border-radius: 3px;
        margin-right: 0.35rem;
        vertical-align: middle;
      }
      .dot.available {
        background: #15803d;
      }
      .dot.selected {
        background: var(--primary);
      }
      .dot.locked {
        background: #94a3b8;
      }
      .dot.booked {
        background: #ef4444;
      }
      .screen {
        text-align: center;
        background: var(--surface-2);
        border: 1px solid var(--border);
        border-radius: 4px;
        padding: 0.5rem;
        margin: 0 auto 1.5rem;
        max-width: 480px;
        letter-spacing: 0.3em;
        font-size: 0.75rem;
        color: var(--muted);
      }
      .seat-grid {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        align-items: center;
        margin-bottom: 1.5rem;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 0.35rem;
      }
      .row-label {
        width: 1.5rem;
        font-weight: 600;
        color: var(--muted);
        font-size: 0.85rem;
      }
      .seat {
        width: 36px;
        height: 36px;
        border-radius: 6px;
        border: none;
        font-size: 0.75rem;
        font-weight: 600;
        cursor: pointer;
        color: #fff;
      }
      .seat.available {
        background: #15803d;
      }
      .seat.available:hover {
        background: #166534;
      }
      .seat.selected {
        background: var(--primary);
        box-shadow: 0 0 0 2px #93c5fd;
      }
      .seat.locked {
        background: #94a3b8;
        cursor: not-allowed;
      }
      .seat.booked {
        background: #b91c1c;
        cursor: not-allowed;
        opacity: 0.9;
      }
      .summary {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        position: sticky;
        bottom: 1rem;
      }
      .muted {
        color: var(--muted);
      }
    `,
  ],
})
export class SeatMapComponent implements OnInit, OnDestroy {
  showId = '';
  seats: Seat[] = [];
  selected: Seat[] = [];
  rows: string[] = [];
  seatsByRow: Record<string, Seat[]> = {};
  loading = true;
  reserving = false;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private seatService: SeatService,
    private bookingService: BookingService
  ) {}

  ngOnInit() {
    this.showId = this.route.snapshot.paramMap.get('showId')!;
    this.seatService.loadSeats(this.showId).subscribe({
      next: (res) => {
        const data = res.data || res;
        this.seats = (data.seats || []).map((s: any) => ({
          id: s.id,
          label: s.label || s.seat_label || s.seatLabel,
          row: s.row || s.row_label || s.rowLabel || (s.label || s.seat_label || '?')[0],
          number: s.number || s.seat_number || s.seatNumber || parseInt((s.label || '').slice(1), 10),
          category: s.category || 'STANDARD',
          status: s.status,
          price: Number(s.price) || 0,
        }));
        this.buildGrid();
        this.seatService.setSeats(this.seats);
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to load seats';
        this.loading = false;
      },
    });

    this.seatService.joinShow(this.showId);
    this.seatService.seats$.subscribe((seats) => {
      if (seats.length) {
        this.seats = seats;
        this.selected = this.selected.filter((s) => {
          const cur = seats.find((x) => x.id === s.id);
          return cur && (cur.status === 'AVAILABLE' || this.isSelected(s));
        });
        this.buildGrid();
      }
    });
  }

  ngOnDestroy() {
    this.seatService.leaveShow(this.showId);
  }

  private buildGrid() {
    const map: Record<string, Seat[]> = {};
    for (const s of this.seats) {
      if (!map[s.row]) map[s.row] = [];
      map[s.row].push(s);
    }
    for (const r of Object.keys(map)) {
      map[r].sort((a, b) => a.number - b.number);
    }
    this.seatsByRow = map;
    this.rows = Object.keys(map).sort();
  }

  isSelected(seat: Seat): boolean {
    return this.selected.some((s) => s.id === seat.id);
  }

  toggle(seat: Seat) {
    if (seat.status !== 'AVAILABLE' && !this.isSelected(seat)) return;
    if (this.isSelected(seat)) {
      this.selected = this.selected.filter((s) => s.id !== seat.id);
    } else {
      this.selected = [...this.selected, seat];
    }
  }

  get selectedLabels(): string {
    return this.selected.map((s) => s.label).join(', ');
  }

  get total(): number {
    return this.selected.reduce((sum, s) => sum + s.price, 0);
  }

  reserve() {
    this.error = '';
    this.reserving = true;
    const key = crypto.randomUUID();
    this.bookingService
      .createReservation(
        this.showId,
        this.selected.map((s) => s.id),
        key
      )
      .subscribe({
        next: (res) => {
          this.reserving = false;
          const id = res.data?.reservationId || res.data?.id || res.reservationId;
          this.router.navigate(['/checkout', id]);
        },
        error: (err) => {
          this.reserving = false;
          this.error = err.error?.message || 'Could not lock seats';
          // Refresh seats
          this.seatService.loadSeats(this.showId).subscribe((r) => {
            const data = r.data || r;
            this.seats = (data.seats || []).map((s: any) => ({
              id: s.id,
              label: s.label || s.seat_label,
              row: s.row || s.row_label || (s.label || '?')[0],
              number: s.number || s.seat_number || 0,
              category: s.category || 'STANDARD',
              status: s.status,
              price: Number(s.price) || 0,
            }));
            this.buildGrid();
            this.selected = [];
          });
        },
      });
  }
}
