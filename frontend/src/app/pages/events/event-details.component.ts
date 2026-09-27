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
    <section class="event-page container">
      @if (loading) {
        <p class="state-message" role="status">Loading event details...</p>
      } @else if (!event) {
        <section class="state-message" role="status">
          <h1>Event details are unavailable.</h1>
          <p>{{ eventError || 'This event could not be found.' }}</p>
          <a routerLink="/events" class="btn btn-ghost">Back to events</a>
        </section>
      } @else {
        <a class="back-link" routerLink="/events">← All events</a>

        <section class="event-hero">
          <img
            [src]="posterFor(event)"
            (error)="useFallbackImage($event)"
            [alt]="event.title"
          />
          <div class="hero-shade"></div>
          <div class="hero-copy">
            <p class="eyebrow">{{ event.event_type || event.eventType | titlecase }}</p>
            <h1>{{ event.title }}</h1>
            <p class="event-meta">
              @if (event.genre) { <span>{{ event.genre }}</span> }
              @if (event.language) { <span>{{ event.language }}</span> }
              @if (event.duration_minutes || event.durationMinutes) {
                <span>{{ event.duration_minutes || event.durationMinutes }} minutes</span>
              }
            </p>
            @if (event.description) {
              <p class="description">{{ event.description }}</p>
            }
            @if (event.artist) {
              <p class="artist"><span>Featuring</span> {{ event.artist }}</p>
            }
          </div>
        </section>

        <section class="showtimes">
          <div class="showtimes-heading">
            <div>
              <p class="eyebrow">PICK YOUR SESSION</p>
              <h2>Available showtimes</h2>
            </div>
            <span>{{ shows.length }} {{ shows.length === 1 ? 'show' : 'shows' }}</span>
          </div>
          @if (showsLoading) {
            <p class="state-message" role="status">Checking available showtimes...</p>
          } @else if (showsError) {
            <p class="state-message" role="status">Showtimes are temporarily unavailable. Please try again.</p>
          } @else if (shows.length === 0) {
            <p class="state-message" role="status">There are no upcoming showtimes for this event.</p>
          } @else {
            <div class="show-grid">
              @for (s of shows; track s.id) {
                <article class="show-card">
                  <div class="show-date">{{ s.show_date || s.showDate | date: 'EEE, d MMM' }}</div>
                  <div class="show-time">{{ formatTime(s.show_time || s.showTime) }}</div>
                  <div class="venue">{{ s.venue_name || s.venueName || 'Venue to be confirmed' }}</div>
                  @if (s.venue_city || s.venueCity) {
                    <div class="venue-city">{{ s.venue_city || s.venueCity }}</div>
                  }
                  <div class="price">From ₹{{ s.base_price || s.basePrice || 'Price unavailable' }}</div>
                  <a [routerLink]="['/shows', s.id, 'seats']" class="btn btn-primary">
                    Choose seats <span aria-hidden="true">→</span>
                  </a>
                </article>
              }
            </div>
          }
        </section>
      }
    </section>
  `,
  styles: [
    `
      .event-page { padding-top: 1.5rem; padding-bottom: 4rem; }
      .back-link { display: inline-block; margin-bottom: 1rem; color: #d9a08c; font-size: .83rem; font-weight: 600; }
      .event-hero { position: relative; isolation: isolate; min-height: 390px; display: flex; align-items: end; overflow: hidden; border: 1px solid var(--border); border-radius: 4px; background: var(--surface); }
      .event-hero > img, .hero-shade { position: absolute; z-index: -1; inset: 0; width: 100%; height: 100%; }
      .event-hero > img { z-index: -2; object-fit: cover; object-position: center 38%; }
      .hero-shade { background: linear-gradient(0deg, rgba(10, 12, 12, .96), rgba(10, 12, 12, .7) 42%, rgba(10, 12, 12, .06)); }
      .hero-copy { max-width: 740px; padding: 2.2rem; }
      .eyebrow { margin: 0 0 .55rem; color: #f0b19a; font-size: .68rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
      .hero-copy h1 { margin: 0; color: #fffaf3; font-size: clamp(2rem, 5vw, 3.4rem); line-height: 1.04; }
      .event-meta { display: flex; flex-wrap: wrap; gap: .5rem; margin: .9rem 0 0; color: #e0ded7; font-size: .81rem; }
      .event-meta span + span::before { content: '·'; margin: 0 .45rem; color: #f0b19a; }
      .description { max-width: 600px; margin: 1rem 0 0; color: #d4d2ca; line-height: 1.65; }
      .artist { margin: .75rem 0 0; color: #fff; font-size: .87rem; }
      .artist span { margin-right: .4rem; color: #b6bcb8; }
      .showtimes { padding-top: 2.3rem; }
      .showtimes-heading { display: flex; justify-content: space-between; align-items: end; gap: 1rem; margin-bottom: 1rem; }
      .showtimes-heading h2 { font-size: 1.4rem; }
      .showtimes-heading > span { color: var(--muted); font-size: .8rem; }
      .show-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(225px, 1fr)); gap: .8rem; }
      .show-card { display: flex; flex-direction: column; align-items: flex-start; min-height: 200px; border: 1px solid var(--border); border-radius: 4px; background: var(--surface); padding: 1rem; }
      .show-date { color: #f0b19a; font-size: .78rem; font-weight: 700; text-transform: uppercase; }
      .show-time { margin: .28rem 0; font-family: 'Space Grotesk', 'Segoe UI', sans-serif; font-size: 1.55rem; font-weight: 600; }
      .venue { color: #e0e3df; font-size: .88rem; }
      .venue-city { color: var(--muted); font-size: .78rem; }
      .price { margin: .75rem 0; color: #d6dcd8; font-size: .82rem; }
      .show-card .btn { width: 100%; margin-top: auto; }
      .state-message { display: grid; justify-items: start; gap: .6rem; padding: 2.2rem 0; color: var(--muted); }
      .state-message h1 { color: var(--text); font-size: 1.5rem; }
      @media (max-width: 600px) {
        .event-page { padding-top: .8rem; }
        .event-hero { min-height: 430px; }
        .hero-copy { padding: 1.25rem; }
        .showtimes-heading h2 { font-size: 1.2rem; }
        .show-grid { grid-template-columns: 1fr; }
      }
    `,
  ],
})
export class EventDetailsComponent implements OnInit {
  event: any = null;
  shows: any[] = [];
  loading = true;
  showsLoading = true;
  showsError = false;
  eventError = '';
  private fallbackImage = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1400&q=85';

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
      error: (err) => {
        this.eventError = err.error?.message || 'Check your connection and try again.';
        this.loading = false;
      },
    });
    this.http.get<any>(`${environment.apiUrl}/shows`, { params: { eventId: id } }).subscribe({
      next: (res) => {
        // API returns array in data
        const d = res.data;
        this.shows = Array.isArray(d) ? d : d?.shows || [];
        this.showsLoading = false;
      },
      error: () => {
        this.showsLoading = false;
        this.showsError = true;
      },
    });
  }

  formatTime(t: string): string {
    if (!t) return 'Time to be confirmed';
    return t.slice(0, 5);
  }

  posterFor(event: any): string {
    return event?.poster_url || event?.posterUrl || this.fallbackImage;
  }

  useFallbackImage(event: Event) {
    const image = event.target as HTMLImageElement | null;
    if (!image || image.dataset['fallback']) return;
    image.dataset['fallback'] = 'true';
    image.src = this.fallbackImage;
  }
}
