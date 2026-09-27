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
    <section class="browse container">
      <section class="browse-heading">
        <p class="eyebrow">THE FULL LINE-UP</p>
        <div class="heading-row">
          <div>
            <h1>Make a night of it.</h1>
            <p class="intro">The shows, screenings and live moments coming up.</p>
          </div>
          <span class="result-count">{{ events.length }} <span>events</span></span>
        </div>
      </section>

      <section class="filters" aria-label="Search and filter events">
        <label class="search-field">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            placeholder="Search events or artists"
            [(ngModel)]="q"
            (keyup.enter)="search()"
            aria-label="Search events or artists"
          />
        </label>
        <label class="city-field">
          <span>City</span>
          <input type="text" placeholder="Any city" [(ngModel)]="city" (keyup.enter)="search()" />
        </label>
        <button class="search-button" type="button" (click)="search()">Search <span aria-hidden="true">→</span></button>
      </section>

      <nav class="categories" aria-label="Filter by event type">
        @for (category of categories; track category.value) {
          <button
            type="button"
            [class.active]="type === category.value"
            [attr.aria-pressed]="type === category.value"
            (click)="setType(category.value)"
          >
            {{ category.label }}
          </button>
        }
        @if (q || type || city) {
          <button type="button" class="clear-button" (click)="clearFilters()">Clear filters</button>
        }
      </nav>

      @if (loading) {
        <div class="event-grid" aria-label="Loading events">
          @for (item of skeletonCards; track item) {
            <div class="event-skeleton"></div>
          }
        </div>
      } @else if (loadError) {
        <section class="empty-state" role="status">
          <h2>Events couldn't load.</h2>
          <p>Check the connection to SeatFlow and try again.</p>
          <button type="button" class="search-button" (click)="search()">Try again <span aria-hidden="true">→</span></button>
        </section>
      } @else if (events.length === 0) {
        <section class="empty-state" role="status">
          <h2>No events found.</h2>
          <p>Try a different search or remove some filters.</p>
          <button type="button" class="search-button" (click)="clearFilters()">Show all events <span aria-hidden="true">→</span></button>
        </section>
      } @else {
        <div class="event-grid">
          @for (event of events; track event.id; let index = $index) {
            <article class="event-card" [style.--card-index]="index">
              <a [routerLink]="['/events', event.id]" class="event-poster" [attr.aria-label]="'View ' + event.title">
                <img
                  [src]="posterFor(event, index)"
                  (error)="useFallbackImage($event)"
                  [alt]="event.title"
                  loading="lazy"
                />
                <span class="poster-shade"></span>
                <span class="event-type">{{ event.event_type || event.eventType | titlecase }}</span>
                @if (event.next_show_date) {
                  <span class="event-date">{{ event.next_show_date | date: 'd MMM' }}</span>
                }
                <span class="poster-copy">
                  <strong>{{ event.title }}</strong>
                  <span>View event <i aria-hidden="true">↗</i></span>
                </span>
              </a>
              <div class="event-meta">
                <span>{{ event.artist || event.genre || event.language || 'Live event' }}</span>
                @if (event.duration_minutes || event.durationMinutes) {
                  <span>{{ event.duration_minutes || event.durationMinutes }} min</span>
                }
              </div>
            </article>
          }
        </div>
      }
    </section>
  `,
  styles: [
    `
      :host { display: block; min-height: 70vh; }
      .browse { padding-top: 3.3rem; padding-bottom: 4rem; }
      .browse-heading { margin-bottom: 1.7rem; }
      .eyebrow { margin: 0 0 .6rem; color: #bd806e; font-size: .69rem; font-weight: 700; letter-spacing: .13em; }
      .heading-row { display: flex; align-items: end; justify-content: space-between; gap: 1rem; }
      h1 { margin: 0; font-size: clamp(2.2rem, 5vw, 3.5rem); line-height: 1; font-weight: 600; }
      .intro { margin: .8rem 0 0; color: var(--muted); font-size: .95rem; }
      .result-count { color: #f0b19a; font-family: 'Space Grotesk', 'Segoe UI', sans-serif; font-size: 1.3rem; font-weight: 600; white-space: nowrap; }
      .result-count span { color: var(--muted); font: 400 .78rem 'DM Sans', 'Segoe UI', sans-serif; }
      .filters { display: grid; grid-template-columns: minmax(220px, 1fr) minmax(150px, 230px) auto; gap: .65rem; }
      .search-field, .city-field { min-height: 46px; display: flex; align-items: center; gap: .65rem; border: 1px solid var(--border); border-radius: 4px; background: var(--surface); padding: 0 .75rem; }
      .search-field:focus-within, .city-field:focus-within { border-color: var(--primary); }
      .search-field > span { color: #c98976; font-size: 1.55rem; line-height: 1; }
      .search-field input, .city-field input { min-width: 0; border: 0; outline: 0; background: transparent; box-shadow: none; padding: .5rem 0; }
      .search-field input:focus, .city-field input:focus { outline: 0; }
      .city-field > span { color: #aab0ad; font-size: .75rem; }
      .search-button { min-height: 46px; display: inline-flex; align-items: center; justify-content: center; gap: .65rem; border: 1px solid #f0b19a; border-radius: 4px; background: #f0b19a; color: #211411; padding: .55rem 1.1rem; font-weight: 700; }
      .search-button:hover { background: #ffd3bd; }
      .categories { display: flex; flex-wrap: wrap; gap: .5rem; margin: 1.2rem 0 1.6rem; }
      .categories button { min-height: 36px; border: 1px solid #353e3d; border-radius: 3px; background: transparent; color: #bac0bd; padding: .4rem .72rem; font-size: .78rem; font-weight: 600; }
      .categories button:hover { color: white; border-color: #86908b; }
      .categories button.active { border-color: #f0b19a; background: #f0b19a; color: #211411; }
      .categories .clear-button { margin-left: auto; border-color: transparent; color: #e4a18b; }
      .event-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 1.25rem 1rem; }
      .event-card { min-width: 0; animation: card-reveal 420ms calc(var(--card-index, 0) * 35ms) ease-out both; }
      .event-poster { position: relative; display: block; overflow: hidden; aspect-ratio: 2 / 2.85; border: 1px solid #353c3c; border-radius: 4px; background: #232929; color: white; text-decoration: none; }
      .event-poster:hover { text-decoration: none; }
      .event-poster img, .poster-shade { position: absolute; inset: 0; width: 100%; height: 100%; }
      .event-poster img { object-fit: cover; transition: transform 450ms cubic-bezier(.2, .75, .25, 1); }
      .event-poster:hover img, .event-poster:focus-visible img { transform: scale(1.055); }
      .poster-shade { background: linear-gradient(180deg, rgba(7, 9, 9, .38), transparent 34%, rgba(7, 9, 9, .9) 100%); }
      .event-type, .event-date { position: absolute; top: .65rem; font-size: .62rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
      .event-type { left: .65rem; border: 1px solid rgba(255,255,255,.4); border-radius: 2px; background: rgba(12,14,14,.48); padding: .26rem .4rem; backdrop-filter: blur(7px); }
      .event-date { right: .65rem; color: #ffd4bd; }
      .poster-copy { position: absolute; right: .7rem; bottom: .7rem; left: .7rem; display: grid; gap: .55rem; }
      .poster-copy strong { font-family: 'Space Grotesk', 'Segoe UI', sans-serif; font-size: 1rem; line-height: 1.18; }
      .poster-copy span { color: #f0b19a; font-size: .72rem; font-weight: 700; opacity: 0; transform: translateY(4px); transition: opacity 170ms ease, transform 170ms ease; }
      .event-poster:hover .poster-copy span, .event-poster:focus-visible .poster-copy span { opacity: 1; transform: translateY(0); }
      .poster-copy i { font-style: normal; }
      .event-meta { display: flex; justify-content: space-between; gap: .5rem; overflow: hidden; margin-top: .55rem; color: #9ea6a3; font-size: .73rem; }
      .event-meta span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .event-skeleton { aspect-ratio: 2 / 2.85; border-radius: 4px; background: linear-gradient(105deg, #171c1c 20%, #242a29 40%, #171c1c 60%); background-size: 200% 100%; animation: shimmer 1.4s ease-in-out infinite; }
      .empty-state { min-height: 250px; display: flex; flex-direction: column; align-items: flex-start; justify-content: center; gap: .6rem; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
      .empty-state h2 { font-size: 1.25rem; }
      .empty-state p { margin-bottom: .5rem; color: var(--muted); font-size: .9rem; }
      @keyframes card-reveal { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes shimmer { to { background-position: -200% 0; } }
      @media (max-width: 1000px) { .event-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
      @media (max-width: 760px) {
        .browse { padding-top: 2.5rem; }
        .event-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem .7rem; }
        .filters { grid-template-columns: 1fr auto; }
        .city-field { grid-column: 1 / -1; grid-row: 2; }
        .search-button { grid-column: 2; grid-row: 1; }
      }
      @media (max-width: 520px) {
        .heading-row { align-items: center; }
        .event-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem .65rem; }
        .poster-copy strong { font-size: .88rem; }
        .categories { flex-wrap: nowrap; overflow-x: auto; margin-right: -1rem; padding-right: 1rem; scrollbar-width: none; }
        .categories::-webkit-scrollbar { display: none; }
        .categories .clear-button { margin-left: 0; }
      }
      @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; } }
    `,
  ],
})
export class EventsListComponent implements OnInit {
  events: any[] = [];
  loading = true;
  q = '';
  type = '';
  city = '';
  loadError = false;
  skeletonCards = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  categories = [
    { value: '', label: 'Everything' },
    { value: 'MOVIE', label: 'Movies' },
    { value: 'CONCERT', label: 'Music' },
    { value: 'SPORTS', label: 'Sports' },
    { value: 'THEATRE', label: 'Theatre' },
    { value: 'CONFERENCE', label: 'Culture' },
  ];
  private fallbackImage =
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=82';
  private posters: Record<string, string[]> = {
    MOVIE: ['photo-1489599849927-2ee91cede3ba', 'photo-1478720568477-152d9b164e26'],
    CONCERT: ['photo-1506157786151-b8491531f063', 'photo-1514525253161-7a46d19cd819'],
    SPORTS: ['photo-1461896836934-ffe607ba8211', 'photo-1508098682722-e99c43a406b2'],
    THEATRE: ['photo-1503095396549-807759245b35', 'photo-1516280440614-37939bbacd81'],
    CONFERENCE: ['photo-1475721027785-f74eccf877e2', 'photo-1540575467063-178a50c2df87'],
  };

  constructor(private eventService: EventService) {}

  ngOnInit() {
    this.search();
  }

  search() {
    this.loading = true;
    this.loadError = false;
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
          this.loadError = true;
        },
      });
  }

  setType(type: string) {
    this.type = type;
    this.search();
  }

  clearFilters() {
    this.q = '';
    this.type = '';
    this.city = '';
    this.search();
  }

  posterFor(event: any, index: number): string {
    if (event?.poster_url || event?.posterUrl) return event.poster_url || event.posterUrl;
    const type = String(event?.event_type || event?.eventType || 'CONCERT').toUpperCase();
    const images = this.posters[type] || this.posters['CONCERT'];
    const image = images[index % images.length];
    return `https://images.unsplash.com/${image}?auto=format&fit=crop&w=560&h=800&q=82`;
  }

  useFallbackImage(event: Event) {
    const image = event.target as HTMLImageElement | null;
    if (!image || image.dataset['fallback']) return;
    image.dataset['fallback'] = 'true';
    image.src = this.fallbackImage;
  }
}
