import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EventService } from '../../core/services/event.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-event-details',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container">
      @if (loading) {
        <p class="muted">Loading…</p>
      } @else if (!event) {
        <p class="muted">Event not found.</p>
      } @else {
        <div class="card detail">
          <span class="badge badge-muted">{{ event.event_type || event.eventType }}</span>
          <h1 class="page-title" style="margin-top: 0.5rem">{{ event.title }}</h1>
          <p class="page-sub">
            {{ event.language || '—' }}
            @if (event.genre) {
              · {{ event.genre }}
            }
            @if (event.duration_minutes || event.durationMinutes) {
              · {{ event.duration_minutes || event.durationMinutes }} min
            }
          </p>
          @if (event.description) {
            <p class="desc">{{ event.description }}</p>
          }
          @if (event.artist) {
            <p><strong>Artist:</strong> {{ event.artist }}</p>
          }
        </div>

        <h2 class="shows-title">Available shows</h2>
        @if (shows.length === 0) {
          <p class="muted">No upcoming shows.</p>
        } @else {
          <div class="grid grid-3">
            @for (s of shows; track s.id) {
              <div class="card show-card">
                <div class="show-date">{{ s.show_date || s.showDate | date: 'mediumDate' }}</div>
                <div class="show-time">{{ formatTime(s.show_time || s.showTime) }}</div>
                <div class="muted">{{ s.venue_name || s.venueName || 'Venue' }}</div>
                <div class="price">From ₹{{ s.base_price || s.basePrice || '—' }}</div>
                <a [routerLink]="['/shows', s.id, 'seats']" class="btn btn-primary" style="width:100%;margin-top:0.75rem">
                  Select seats
                </a>
              </div>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [
    `
      .detail {
        margin-bottom: 2rem;
      }
      .desc {
        color: var(--muted);
        margin: 1rem 0;
        white-space: pre-wrap;
      }
      .shows-title {
        font-size: 1.25rem;
        margin-bottom: 1rem;
      }
      .show-card .show-date {
        font-weight: 600;
      }
      .show-time {
        font-size: 1.35rem;
        color: var(--primary-hover);
        margin: 0.25rem 0;
      }
      .price {
        margin-top: 0.5rem;
        font-weight: 600;
      }
      .muted {
        color: var(--muted);
        font-size: 0.9rem;
      }
    `,
  ],
})
export class EventDetailsComponent implements OnInit {
  event: any = null;
  shows: any[] = [];
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private eventService: EventService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.eventService.getById(id).subscribe({
      next: (res) => {
        this.event = res.data || res;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
    this.http.get<any>(`${environment.apiUrl}/shows`, { params: { eventId: id } }).subscribe({
      next: (res) => {
        // API returns array in data
        const d = res.data;
        this.shows = Array.isArray(d) ? d : d?.shows || [];
      },
    });
  }

  formatTime(t: string): string {
    if (!t) return '—';
    // HH:MM:SS or HH:MM
    return t.slice(0, 5);
  }
}
