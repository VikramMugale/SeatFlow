import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ElementRef, ViewChild } from '@angular/core';
import { EventService } from '../../core/services/event.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="showcase">
      <img
        class="showcase-image"
        [src]="featuredImage(featuredEvent)"
        (error)="useFallbackImage($event)"
        [alt]="featuredEvent?.title || 'A crowd enjoying a live event'"
        fetchpriority="high"
      />
      <div class="showcase-shade"></div>
      <div class="showcase-content page-wrap">
        <div class="showcase-copy">
          <p class="eyebrow"><span class="live-dot"></span> THE SEATFLOW GUIDE</p>
          @if (featuredEvent) {
            <p class="feature-label">FEATURED EVENT</p>
            <h1>{{ featuredEvent.title }}</h1>
            <p class="feature-meta">
              {{ eventType(featuredEvent) | titlecase }}
              @if (featuredEvent.genre) {
                <span>·</span> {{ featuredEvent.genre }}
              }
              @if (featuredEvent.language) {
                <span>·</span> {{ featuredEvent.language }}
              }
            </p>
            <p class="feature-description">
              {{ featuredEvent.description || 'Make room for a night worth remembering.' }}
            </p>
          } @else {
            <p class="feature-label">BOOK MOVIES, CONCERTS AND LIVE EVENTS</p>
            <h1>Movies, concerts<br />and live events.</h1>
            <p class="feature-description">
              Search upcoming events, compare show times and reserve seats in one place.
            </p>
          }
          <div class="feature-actions">
            <a
              class="button button-bright"
              [routerLink]="featuredEvent ? ['/events', featuredEvent.id] : ['/events']"
            >
              {{ featuredEvent ? 'Explore event' : 'Explore events' }} <span aria-hidden="true">→</span>
            </a>
            <a class="button button-glass" routerLink="/events">Browse all</a>
          </div>
        </div>

        <a class="showcase-index" routerLink="/events" aria-label="Browse the full event collection">
          <span>01</span><i></i><span>DISCOVER</span>
        </a>
      </div>
    </section>

    <section class="discovery page-wrap" id="event-catalog">
      <section class="discovery-tools" aria-label="Find events">
        <div>
          <p class="eyebrow">A GOOD NIGHT STARTS HERE</p>
          <h2>Find your kind of night</h2>
        </div>
        <label class="search-box">
          <span class="search-mark" aria-hidden="true">⌕</span>
          <input
            type="search"
            [(ngModel)]="query"
            placeholder="Search events, artists, genres"
            aria-label="Search events, artists, and genres"
          />
          @if (query) {
            <button type="button" class="clear-search" (click)="query = ''" aria-label="Clear search">×</button>
          }
        </label>
      </section>

      <nav class="category-list" aria-label="Event categories">
        @for (category of categories; track category.value) {
          <button
            type="button"
            class="category-chip"
            [class.selected]="selectedCategory === category.value"
            [attr.aria-pressed]="selectedCategory === category.value"
            (click)="selectedCategory = category.value"
          >
            {{ category.label }}
          </button>
        }
        <button
          type="button"
          class="category-chip saved-chip"
          [class.selected]="selectedCategory === 'SAVED'"
          [attr.aria-pressed]="selectedCategory === 'SAVED'"
          (click)="selectedCategory = selectedCategory === 'SAVED' ? 'ALL' : 'SAVED'"
        >
          Saved <span class="saved-count">{{ savedIds.size }}</span>
        </button>
      </nav>

      <section class="event-section" aria-live="polite">
        <div class="section-heading">
          <div>
            <p class="eyebrow">CURATED FOR YOU</p>
            <h2>{{ sectionTitle }}</h2>
          </div>
          @if (visibleEvents.length > 4) {
            <div class="rail-controls">
              <button type="button" aria-label="Scroll events left" (click)="scrollRail(-1)">←</button>
              <button type="button" aria-label="Scroll events right" (click)="scrollRail(1)">→</button>
            </div>
          }
        </div>

        @if (loading) {
          <div class="event-rail skeleton-rail" aria-label="Loading events">
            @for (item of skeletonCards; track item) {
              <div class="poster-skeleton"></div>
            }
          </div>
        } @else if (loadError) {
          <div class="empty-state" role="status">
            <h3>We couldn't load the line-up.</h3>
            <p>Check that SeatFlow is running, then try again.</p>
            <button type="button" class="button button-bright" (click)="loadEvents()">Try again</button>
          </div>
        } @else if (visibleEvents.length === 0) {
          <div class="empty-state" role="status">
            <h3>{{ events.length ? 'Nothing matches those filters.' : 'The line-up is taking shape.' }}</h3>
            <p>
              {{ events.length ? 'Try another category or search.' : 'New events will appear here as soon as they are announced.' }}
            </p>
            @if (events.length) {
              <button type="button" class="button button-glass" (click)="clearFilters()">Clear filters</button>
            } @else {
              <a class="button button-glass" routerLink="/events">Explore events</a>
            }
          </div>
        } @else {
          <div class="event-rail" #eventRail>
            @for (event of visibleEvents; track event.id; let index = $index) {
              <article class="event-card" [style.--card-index]="index">
                <a class="poster-link" [routerLink]="['/events', event.id]" [attr.aria-label]="'View ' + event.title">
                  <img
                    class="poster-image"
                    [src]="posterFor(event, index)"
                    (error)="useFallbackImage($event)"
                    [alt]="event.title"
                    loading="lazy"
                  />
                  <span class="poster-wash"></span>
                  <span class="poster-category">{{ eventType(event) | titlecase }}</span>
                  @if (event.next_show_date) {
                    <span class="poster-date">{{ event.next_show_date | date: 'd MMM' }}</span>
                  }
                  <span class="poster-title">{{ event.title }}</span>
                  <span class="poster-cta">View event <span aria-hidden="true">↗</span></span>
                </a>
                <button
                  type="button"
                  class="save-button"
                  [class.is-saved]="isSaved(event.id)"
                  [attr.aria-pressed]="isSaved(event.id)"
                  [attr.aria-label]="isSaved(event.id) ? 'Remove ' + event.title + ' from saved events' : 'Save ' + event.title"
                  (click)="toggleSaved(event.id)"
                >
                  {{ isSaved(event.id) ? 'Saved' : 'Save' }}
                </button>
                <p class="poster-meta">
                  {{ event.artist || event.genre || event.language || eventType(event) | titlecase }}
                </p>
              </article>
            }
          </div>
        }
      </section>

      <section class="closing-note">
        <span class="closing-rule"></span>
        <p>Good plans look good on you.</p>
        <a routerLink="/events">See everything <span aria-hidden="true">→</span></a>
      </section>
    </section>
  `,
  styles: [
    `
      :host { display: block; overflow: hidden; }
      .page-wrap { width: min(100% - 3rem, 1280px); margin: 0 auto; }
      .showcase { min-height: 540px; height: min(70vh, 720px); position: relative; isolation: isolate; background: #202424; }
      .showcase-image, .showcase-shade { position: absolute; inset: 0; width: 100%; height: 100%; }
      .showcase-image { z-index: -2; object-fit: cover; object-position: center 42%; animation: image-reveal 900ms ease-out both; }
      .showcase-shade { z-index: -1; background: linear-gradient(90deg, rgba(9, 12, 12, .93) 0%, rgba(9, 12, 12, .73) 34%, rgba(9, 12, 12, .15) 75%), linear-gradient(0deg, #0d0f10 0%, transparent 32%, rgba(8, 10, 10, .1) 100%); }
      .showcase-content { height: 100%; display: flex; align-items: center; justify-content: space-between; padding-top: 4rem; padding-bottom: 5rem; }
      .showcase-copy { max-width: 620px; animation: copy-reveal 650ms 100ms ease-out both; }
      .eyebrow, .feature-label { color: #d0a999; font-size: .7rem; font-weight: 700; letter-spacing: .13em; }
      .eyebrow { display: flex; align-items: center; gap: .6rem; margin-bottom: 1.4rem; color: #e1d6cb; }
      .live-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--primary); box-shadow: 0 0 14px rgba(237, 104, 79, .8); }
      .feature-label { margin-bottom: .6rem; color: #f29b83; }
      .showcase h1 { max-width: 650px; margin: 0; font-size: clamp(2.5rem, 5vw, 4.5rem); line-height: .99; font-weight: 600; color: #fffaf3; }
      .feature-meta { margin-top: 1rem; color: #e7e6df; font-size: .9rem; }
      .feature-meta span { padding: 0 .3rem; color: #c1816f; }
      .feature-description { max-width: 480px; margin: .8rem 0 1.5rem; color: #d3d2ca; font-size: 1rem; line-height: 1.7; }
      .feature-actions { display: flex; flex-wrap: wrap; gap: .7rem; }
      .button { min-height: 44px; display: inline-flex; align-items: center; justify-content: center; gap: .7rem; border: 1px solid transparent; border-radius: 4px; padding: .65rem 1.05rem; font-size: .88rem; font-weight: 700; text-decoration: none; cursor: pointer; transition: transform 160ms ease, background 160ms ease, border-color 160ms ease; }
      .button:hover { transform: translateY(-2px); text-decoration: none; }
      .button-bright { color: #191211; background: #f6eee5; }
      .button-bright:hover { background: #fff; }
      .button-glass { color: #fff; background: rgba(255, 255, 255, .1); border-color: rgba(255, 255, 255, .35); backdrop-filter: blur(8px); }
      .button-glass:hover { background: rgba(255, 255, 255, .18); }
      .showcase-index { align-self: flex-end; display: flex; align-items: center; gap: .55rem; color: #f4ece2; font-size: .67rem; font-weight: 700; letter-spacing: .1em; text-decoration: none; }
      .showcase-index i { width: 42px; height: 1px; background: var(--primary); }
      .discovery { padding-top: 2.5rem; }
      .discovery-tools { display: flex; align-items: end; justify-content: space-between; gap: 1.5rem; }
      .discovery-tools .eyebrow, .section-heading .eyebrow { margin: 0 0 .45rem; color: #bd806e; }
      .discovery h2, .section-heading h2 { margin: 0; font-size: 1.55rem; font-weight: 600; }
      .search-box { width: min(100%, 380px); min-height: 46px; display: flex; align-items: center; gap: .65rem; border: 1px solid var(--border); border-radius: 4px; background: #151819; padding: 0 .8rem; transition: border-color 150ms ease, box-shadow 150ms ease; }
      .search-box:focus-within { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(237, 104, 79, .12); }
      .search-mark { color: #c98976; font-size: 1.7rem; line-height: 1; transform: rotate(-20deg); }
      .search-box input { min-width: 0; border: 0; outline: 0; box-shadow: none; background: transparent; color: var(--text); padding: .55rem 0; }
      .search-box input:focus { outline: 0; }
      .clear-search { border: 0; background: none; color: var(--muted); font-size: 1.3rem; padding: .1rem .25rem; }
      .category-list { display: flex; gap: .55rem; overflow-x: auto; padding: 1.25rem 0 1.7rem; scrollbar-width: none; }
      .category-list::-webkit-scrollbar { display: none; }
      .category-chip { flex: 0 0 auto; border: 1px solid #363e3e; border-radius: 3px; background: transparent; color: #c0c5c2; padding: .48rem .85rem; font-size: .79rem; font-weight: 600; cursor: pointer; transition: color 150ms ease, border-color 150ms ease, background 150ms ease; }
      .category-chip:hover { color: #fff; border-color: #858b86; }
      .category-chip.selected { color: #191211; border-color: #f0c0a9; background: #f0c0a9; }
      .saved-chip { margin-left: auto; }
      .saved-count { display: inline-flex; justify-content: center; align-items: center; min-width: 1.15rem; height: 1.15rem; margin-left: .35rem; border-radius: 50%; background: rgba(0, 0, 0, .13); font-size: .67rem; }
      .section-heading { display: flex; align-items: end; justify-content: space-between; margin-bottom: 1rem; }
      .section-heading h2 { font-size: 1.4rem; }
      .rail-controls { display: flex; gap: .45rem; }
      .rail-controls button { width: 38px; height: 38px; border: 1px solid #414949; border-radius: 50%; background: #171b1c; color: white; font-size: 1.15rem; }
      .rail-controls button:hover { border-color: #e0ae97; color: #f0c0a9; }
      .event-rail { display: grid; grid-auto-columns: clamp(150px, 18vw, 218px); grid-auto-flow: column; gap: 1rem; overflow-x: auto; padding: .1rem .05rem 1rem; scroll-snap-type: x mandatory; scrollbar-color: #434b49 transparent; scrollbar-width: thin; }
      .event-card { position: relative; min-width: 0; scroll-snap-align: start; animation: card-reveal 480ms calc(var(--card-index, 0) * 45ms) ease-out both; }
      .poster-link { position: relative; display: block; aspect-ratio: 2 / 2.85; overflow: hidden; border: 1px solid #353c3c; border-radius: 4px; background: #242929; color: #fff; text-decoration: none; }
      .poster-link:hover { text-decoration: none; }
      .poster-image, .poster-wash { position: absolute; inset: 0; width: 100%; height: 100%; }
      .poster-image { object-fit: cover; transition: transform 450ms cubic-bezier(.2, .75, .25, 1); }
      .poster-link:hover .poster-image, .poster-link:focus-visible .poster-image { transform: scale(1.055); }
      .poster-wash { background: linear-gradient(180deg, rgba(7, 9, 9, .4), transparent 30%, rgba(7, 9, 9, .08) 44%, rgba(7, 9, 9, .93) 100%); }
      .poster-category, .poster-date { position: absolute; top: .7rem; font-size: .62rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
      .poster-category { left: .7rem; border: 1px solid rgba(255,255,255,.38); border-radius: 2px; background: rgba(14,16,16,.42); padding: .27rem .4rem; backdrop-filter: blur(8px); }
      .poster-date { right: .65rem; color: #f6d4c1; }
      .poster-title { position: absolute; left: .75rem; right: .65rem; bottom: 2.05rem; font-family: 'Space Grotesk', 'Segoe UI', sans-serif; font-size: 1.05rem; font-weight: 600; line-height: 1.13; }
      .poster-cta { position: absolute; left: .75rem; bottom: .75rem; color: #f0b19a; font-size: .72rem; font-weight: 700; opacity: 0; transform: translateY(5px); transition: opacity 180ms ease, transform 180ms ease; }
      .poster-link:hover .poster-cta, .poster-link:focus-visible .poster-cta { opacity: 1; transform: translateY(0); }
      .save-button { position: absolute; z-index: 1; top: .55rem; right: .55rem; min-height: 30px; border: 1px solid rgba(255,255,255,.42); border-radius: 3px; background: rgba(12,14,14,.68); color: white; padding: .25rem .48rem; font-size: .67rem; font-weight: 700; backdrop-filter: blur(8px); }
      .save-button:hover, .save-button.is-saved { border-color: #f0b19a; color: #ffd7c7; background: rgba(80, 39, 31, .86); }
      .poster-meta { overflow: hidden; margin: .55rem .1rem 0; color: #9ea6a3; font-size: .74rem; text-overflow: ellipsis; white-space: nowrap; }
      .skeleton-rail { overflow: hidden; }
      .poster-skeleton { aspect-ratio: 2 / 2.85; border-radius: 4px; background: linear-gradient(105deg, #171c1c 20%, #242a29 40%, #171c1c 60%); background-size: 200% 100%; animation: shimmer 1.4s ease-in-out infinite; }
      .empty-state { min-height: 200px; display: flex; flex-direction: column; align-items: flex-start; justify-content: center; gap: .6rem; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); padding: 2rem .1rem; }
      .empty-state h3 { font-size: 1.2rem; }
      .empty-state p { max-width: 460px; margin-bottom: .5rem; color: var(--muted); font-size: .9rem; }
      .closing-note { display: flex; align-items: center; gap: 1rem; margin: 3.2rem 0 1.5rem; padding: 1.2rem 0; border-top: 1px solid var(--border); color: #dad7ce; }
      .closing-rule { width: 30px; height: 2px; background: var(--primary); }
      .closing-note p { margin: 0; font-family: 'Space Grotesk', 'Segoe UI', sans-serif; font-size: .95rem; }
      .closing-note a { margin-left: auto; color: #e9a890; font-size: .83rem; font-weight: 700; }
      @keyframes image-reveal { from { opacity: .35; transform: scale(1.025); } to { opacity: 1; transform: scale(1); } }
      @keyframes copy-reveal { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes card-reveal { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes shimmer { to { background-position: -200% 0; } }
      @media (max-width: 700px) {
        .page-wrap { width: min(100% - 2rem, 1280px); }
        .showcase { height: 590px; min-height: 0; }
        .showcase-image { object-position: 58% center; }
        .showcase-shade { background: linear-gradient(90deg, rgba(9, 12, 12, .83), rgba(9, 12, 12, .27)), linear-gradient(0deg, #0d0f10 0%, transparent 58%); }
        .showcase-content { align-items: flex-end; padding-top: 3rem; padding-bottom: 3.1rem; }
        .showcase h1 { font-size: clamp(2.5rem, 11vw, 3.65rem); }
        .feature-description { max-width: 390px; font-size: .93rem; }
        .showcase-index { display: none; }
        .discovery { padding-top: 2rem; }
        .discovery-tools { align-items: stretch; flex-direction: column; gap: 1rem; }
        .search-box { width: 100%; }
        .category-list { margin-right: -1rem; padding-right: 1rem; }
        .saved-chip { margin-left: 0; }
        .event-rail { grid-auto-columns: clamp(148px, 42vw, 190px); gap: .75rem; margin-right: -1rem; padding-right: 1rem; }
        .section-heading h2 { font-size: 1.25rem; }
        .closing-note { gap: .65rem; }
        .closing-note p { font-size: .82rem; }
        .closing-note a { font-size: .75rem; white-space: nowrap; }
      }
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after { scroll-behavior: auto !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
      }
    `,
  ],
})
export class HomeComponent implements OnInit {
  @ViewChild('eventRail') eventRail?: ElementRef<HTMLElement>;
  events: any[] = [];
  loading = true;
  loadError = false;
  query = '';
  selectedCategory = 'ALL';
  savedIds = new Set<string>();
  skeletonCards = [0, 1, 2, 3, 4, 5];
  categories = [
    { value: 'ALL', label: 'For you' },
    { value: 'MOVIE', label: 'Movies' },
    { value: 'CONCERT', label: 'Music' },
    { value: 'SPORTS', label: 'Sports' },
    { value: 'THEATRE', label: 'Theatre' },
    { value: 'CONFERENCE', label: 'Culture' },
  ];

  private fallbackImage =
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=85';
  private posters: Record<string, string[]> = {
    MOVIE: [
      'photo-1489599849927-2ee91cede3ba',
      'photo-1478720568477-152d9b164e26',
      'photo-1440404653325-ab127d49abc1',
    ],
    CONCERT: [
      'photo-1506157786151-b8491531f063',
      'photo-1514525253161-7a46d19cd819',
      'photo-1470229722913-7c0e2dbbafd3',
    ],
    SPORTS: [
      'photo-1461896836934-ffe607ba8211',
      'photo-1508098682722-e99c43a406b2',
      'photo-1521412644187-c49fa049e84d',
    ],
    THEATRE: [
      'photo-1503095396549-807759245b35',
      'photo-1507676184212-d03ab07a01bf',
      'photo-1516280440614-37939bbacd81',
    ],
    CONFERENCE: [
      'photo-1475721027785-f74eccf877e2',
      'photo-1511578314322-379afb476865',
      'photo-1540575467063-178a50c2df87',
    ],
  };

  constructor(private eventService: EventService) {}

  ngOnInit() {
    try {
      const stored = JSON.parse(localStorage.getItem('seatflow:saved-events') || '[]');
      if (Array.isArray(stored)) this.savedIds = new Set(stored.filter((id) => typeof id === 'string'));
    } catch {
      this.savedIds = new Set();
    }
    this.loadEvents();
  }

  get featuredEvent(): any | null {
    return this.events[0] || null;
  }

  get visibleEvents(): any[] {
    const search = this.query.trim().toLowerCase();
    return this.events.filter((event) => {
      const type = this.eventType(event);
      const matchesCategory = this.selectedCategory === 'ALL'
        || (this.selectedCategory === 'SAVED'
          ? this.savedIds.has(String(event.id))
          : type === this.selectedCategory);
      const searchable = [event.title, event.artist, event.genre, event.language, type]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return matchesCategory && (!search || searchable.includes(search));
    });
  }

  get sectionTitle(): string {
    if (this.selectedCategory === 'SAVED') return 'Your saved events';
    if (this.selectedCategory !== 'ALL') {
      return this.categories.find((category) => category.value === this.selectedCategory)?.label || 'Events';
    }
    return this.query ? 'Search results' : 'On the calendar';
  }

  loadEvents() {
    this.loading = true;
    this.loadError = false;
    this.eventService.list({ limit: 24 }).subscribe({
      next: (res) => {
        this.events = res.data?.events || (Array.isArray(res.data) ? res.data : []);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.loadError = true;
      },
    });
  }

  eventType(event: any): string {
    return String(event?.event_type || event?.eventType || 'EVENT').toUpperCase();
  }

  featuredImage(event: any): string {
    if (event?.poster_url || event?.posterUrl) return event.poster_url || event.posterUrl;
    const images = this.posters[this.eventType(event)] || this.posters['CONCERT'];
    return this.unsplash(images[0], 2000, 1200);
  }

  posterFor(event: any, index: number): string {
    if (event?.poster_url || event?.posterUrl) return event.poster_url || event.posterUrl;
    const images = this.posters[this.eventType(event)] || this.posters['CONCERT'];
    return this.unsplash(images[index % images.length], 560, 800);
  }

  useFallbackImage(event: Event) {
    const image = event.target as HTMLImageElement | null;
    if (!image || image.dataset['fallback']) return;
    image.dataset['fallback'] = 'true';
    image.src = this.fallbackImage;
  }

  isSaved(id: string): boolean {
    return this.savedIds.has(String(id));
  }

  toggleSaved(id: string) {
    const key = String(id);
    if (this.savedIds.has(key)) this.savedIds.delete(key);
    else this.savedIds.add(key);
    this.savedIds = new Set(this.savedIds);
    try {
      localStorage.setItem('seatflow:saved-events', JSON.stringify([...this.savedIds]));
    } catch {
      // Saving remains available for this session when browser storage is disabled.
    }
  }

  clearFilters() {
    this.query = '';
    this.selectedCategory = 'ALL';
  }

  scrollRail(direction: number) {
    const rail = this.eventRail?.nativeElement;
    rail?.scrollBy({ left: direction * rail.clientWidth * 0.8, behavior: 'smooth' });
  }

  private unsplash(id: string, width: number, height: number): string {
    return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&h=${height}&q=82`;
  }
}
