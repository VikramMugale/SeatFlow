import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EventService } from '../../core/services/event.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="hero">
      <div class="container">
        <h1>Ticket booking for events and shows</h1>
        <p>
          Browse movies, concerts, and live events. Select seats, pay securely, and receive
          your confirmation. Seat availability updates in real time.
        </p>
        <a routerLink="/events" class="btn btn-primary">View events</a>
      </div>
    </section>

    <section class="container">
      <h2 class="section-title">Upcoming events</h2>
      @if (loading) {
        <p class="muted">Loading events…</p>
      } @else if (events.length === 0) {
        <p class="muted">No published events at the moment.</p>
      } @else {
        <div class="grid grid-2">
          @for (ev of events; track ev.id) {
            <a [routerLink]="['/events', ev.id]" class="card event-card">
              <div class="event-type">{{ ev.event_type || ev.eventType }}</div>
              <h3>{{ ev.title }}</h3>
              <p class="muted">
                {{ ev.language || '—' }}
                @if (ev.genre) {
                  · {{ ev.genre }}
                }
              </p>
              @if (ev.duration_minutes || ev.durationMinutes) {
                <p class="muted">{{ ev.duration_minutes || ev.durationMinutes }} min</p>
              }
            </a>
          }
        </div>
      }
    </section>
  `,
  styles: [
    `
      .hero {
        background: var(--surface);
        border-bottom: 1px solid var(--border);
        padding: 3rem 0 2.5rem;
        margin-bottom: 1.75rem;
      }
      .hero h1 {
        font-size: clamp(1.5rem, 3.5vw, 2rem);
        max-width: 560px;
        margin-bottom: 0.65rem;
        letter-spacing: -0.02em;
        font-weight: 700;
      }
      .hero p {
        color: var(--muted);
        max-width: 480px;
        margin-bottom: 1.25rem;
        font-size: 0.95rem;
      }
      .section-title {
        margin-bottom: 1rem;
        font-size: 1.15rem;
        font-weight: 600;
      }
      .event-card {
        display: block;
        text-decoration: none;
        color: inherit;
      }
      .event-card:hover {
        border-color: var(--primary);
        text-decoration: none;
      }
      .event-type {
        font-size: 0.7rem;
        font-weight: 600;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        margin-bottom: 0.3rem;
      }
      .event-card h3 {
        margin-bottom: 0.3rem;
        font-size: 1.05rem;
      }
    `,
  ],
})
export class HomeComponent implements OnInit {
  events: any[] = [];
  loading = true;

  constructor(private eventService: EventService) {}

  ngOnInit() {
    this.eventService.list({ limit: 6 }).subscribe({
      next: (res) => {
        this.events = res.data?.events || (Array.isArray(res.data) ? res.data : []) || [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }
}
