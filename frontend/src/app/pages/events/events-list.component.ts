import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EventService } from '../../core/services/event.service';

@Component({
  selector: 'app-events-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="container">
      <h1 class="page-title">Events</h1>
      <p class="page-sub">Movies, concerts, sports & more</p>

      <div class="filters card">
        <div class="filter-row">
          <input
            type="search"
            placeholder="Search title, artist…"
            [(ngModel)]="q"
            (keyup.enter)="search()"
          />
          <select [(ngModel)]="type">
            <option value="">All types</option>
            <option value="MOVIE">Movie</option>
            <option value="CONCERT">Concert</option>
            <option value="SPORTS">Sports</option>
            <option value="THEATRE">Theatre</option>
            <option value="CONFERENCE">Conference</option>
          </select>
          <input type="text" placeholder="City" [(ngModel)]="city" />
          <button class="btn btn-primary" (click)="search()">Search</button>
        </div>
      </div>

      @if (loading) {
        <p class="muted">Loading…</p>
      } @else if (events.length === 0) {
        <p class="muted">No events found.</p>
      } @else {
        <div class="grid grid-2" style="margin-top: 1.5rem">
          @for (ev of events; track ev.id) {
            <a [routerLink]="['/events', ev.id]" class="card event-card">
              <span class="badge badge-muted">{{ ev.event_type || ev.eventType }}</span>
              <h3>{{ ev.title }}</h3>
              <p class="muted">
                {{ ev.language || '—' }}
                @if (ev.genre) {
                  · {{ ev.genre }}
                }
              </p>
              @if (ev.artist) {
                <p class="muted">{{ ev.artist }}</p>
              }
            </a>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .filters {
        margin-bottom: 0.5rem;
      }
      .filter-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
      }
      .filter-row input,
      .filter-row select {
        flex: 1;
        min-width: 140px;
      }
      .event-card {
        display: block;
        color: inherit;
        text-decoration: none;
        transition: border-color 0.15s;
      }
      .event-card:hover {
        border-color: var(--primary);
        text-decoration: none;
      }
      .event-card h3 {
        margin: 0.5rem 0 0.35rem;
      }
      .muted {
        color: var(--muted);
        font-size: 0.9rem;
      }
    `,
  ],
})
export class EventsListComponent implements OnInit {
  events: any[] = [];
  loading = true;
  q = '';
  type = '';
  city = '';

  constructor(private eventService: EventService) {}

  ngOnInit() {
    this.search();
  }

  search() {
    this.loading = true;
    this.eventService
      .list({
        q: this.q || undefined,
        type: this.type || undefined,
        city: this.city || undefined,
      })
      .subscribe({
        next: (res) => {
          this.events = res.data?.events || res.data || [];
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        },
      });
  }
}
