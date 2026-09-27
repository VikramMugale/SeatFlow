import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/services/admin.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="container admin-page">
      <header class="page-header">
        <div>
          <p class="eyebrow">SEATFLOW ADMIN</p>
          <h1 class="page-title">Overview</h1>
          <p class="page-sub">Manage your events and review platform activity.</p>
        </div>
      </header>

      @if (loading) {
        <p class="state-message" role="status">Loading platform activity...</p>
      } @else if (statsError) {
        <p class="alert alert-error" role="alert">{{ statsError }}</p>
      } @else {
        <section class="metrics" aria-label="Platform totals">
          <div class="metric">
            <span class="metric-label">Published events</span>
            <strong>{{ stats.totalEvents }}</strong>
          </div>
          <div class="metric">
            <span class="metric-label">Registered users</span>
            <strong>{{ stats.totalUsers }}</strong>
          </div>
          <div class="metric">
            <span class="metric-label">Bookings</span>
            <strong>{{ stats.totalBookings }}</strong>
          </div>
          <div class="metric">
            <span class="metric-label">Gross revenue</span>
            <strong>₹{{ stats.revenue }}</strong>
          </div>
          <div class="metric">
            <span class="metric-label">Active reservations</span>
            <strong>{{ stats.activeLocks }}</strong>
          </div>
          <div class="metric">
            <span class="metric-label">Failed payments</span>
            <strong>{{ stats.failedPayments }}</strong>
          </div>
        </section>
      }

      <section class="event-management" aria-labelledby="events-heading">
        <div class="section-heading">
          <div>
            <p class="eyebrow">CATALOG</p>
            <h2 id="events-heading">Event management</h2>
            <p class="section-sub">Create events, save drafts, and control what appears in Explore.</p>
          </div>
          <button type="button" class="btn btn-primary" (click)="toggleCreateForm()">
            {{ showCreateForm ? 'Close form' : 'Create event' }}
          </button>
        </div>

        @if (notice) {
          <p class="notice" role="status">{{ notice }}</p>
        }
        @if (actionError) {
          <p class="alert alert-error" role="alert">{{ actionError }}</p>
        }

        @if (showCreateForm) {
          <form class="event-form" (ngSubmit)="createEvent()">
            <div class="form-heading">
              <h3>New event</h3>
              <p>Required fields are marked. Save as a draft or publish to the public event list.</p>
            </div>

            <div class="form-grid">
              <label class="field field-wide">
                <span>Event title <b>*</b></span>
                <input name="title" [(ngModel)]="draft.title" required minlength="2" maxlength="255" placeholder="Example: Summer music festival" />
              </label>
              <label class="field">
                <span>Category <b>*</b></span>
                <select name="eventType" [(ngModel)]="draft.eventType" required>
                  <option value="MOVIE">Movie</option>
                  <option value="CONCERT">Concert</option>
                  <option value="SPORTS">Sports</option>
                  <option value="THEATRE">Theatre</option>
                  <option value="CONFERENCE">Conference</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>
              <label class="field">
                <span>Artist or organiser</span>
                <input name="artist" [(ngModel)]="draft.artist" maxlength="200" />
              </label>
              <label class="field">
                <span>Genre</span>
                <input name="genre" [(ngModel)]="draft.genre" maxlength="100" />
              </label>
              <label class="field">
                <span>Language</span>
                <input name="language" [(ngModel)]="draft.language" maxlength="50" />
              </label>
              <label class="field">
                <span>Duration in minutes</span>
                <input name="durationMinutes" type="number" [(ngModel)]="draft.durationMinutes" min="1" step="1" />
              </label>
              <label class="field field-wide">
                <span>Poster image URL</span>
                <input name="posterUrl" type="url" [(ngModel)]="draft.posterUrl" placeholder="https://..." />
              </label>
              <label class="field field-wide">
                <span>Description</span>
                <textarea name="description" [(ngModel)]="draft.description" rows="4" maxlength="5000"></textarea>
              </label>
            </div>

            <div class="form-footer">
              <label class="publish-toggle">
                <input type="checkbox" name="isPublished" [(ngModel)]="draft.isPublished" />
                <span>Publish immediately</span>
              </label>
              <button type="submit" class="btn btn-primary" [disabled]="saving">
                {{ saving ? 'Saving event...' : (draft.isPublished ? 'Publish event' : 'Save draft') }}
              </button>
            </div>
          </form>
        }

        <div class="managed-heading">
          <h3>All events <span>{{ events.length }}</span></h3>
          <button type="button" class="text-button" (click)="loadEvents()" [disabled]="eventsLoading">Refresh</button>
        </div>

        @if (eventsLoading) {
          <p class="state-message" role="status">Loading events...</p>
        } @else if (eventsError) {
          <p class="alert alert-error" role="alert">{{ eventsError }}</p>
        } @else if (events.length === 0) {
          <div class="empty-state">
            <h3>No events created yet</h3>
            <p>Create an event to add it to the catalog.</p>
          </div>
        } @else {
          <div class="event-list">
            @for (event of events; track event.id) {
              <article class="event-row">
                <div class="event-copy">
                  <div class="event-title-row">
                    <h4>{{ event.title }}</h4>
                    <span class="status" [class.status-live]="event.is_published">{{ event.is_published ? 'Published' : 'Draft' }}</span>
                  </div>
                  <p>{{ event.event_type | titlecase }} @if (event.artist) { <span>·</span> {{ event.artist }} }</p>
                </div>
                <div class="event-actions">
                  <button type="button" class="text-button" (click)="togglePublished(event)" [disabled]="busyEventId === event.id">
                    {{ event.is_published ? 'Unpublish' : 'Publish' }}
                  </button>
                  <button type="button" class="text-button destructive" (click)="deleteEvent(event)" [disabled]="busyEventId === event.id">Delete</button>
                </div>
              </article>
            }
          </div>
        }
      </section>
    </main>
  `,
  styles: [
    `
      .admin-page { padding-top: 2.5rem; padding-bottom: 4rem; }
      .page-header { margin-bottom: 1.5rem; }
      .eyebrow { margin: 0 0 .45rem; color: #bd806e; font-size: .68rem; font-weight: 700; letter-spacing: .12em; }
      .page-title { margin-bottom: .35rem; }
      .page-sub { margin: 0; }
      .metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border-top: 1px solid var(--border); border-left: 1px solid var(--border); }
      .metric { min-height: 105px; display: flex; flex-direction: column; justify-content: space-between; border-right: 1px solid var(--border); border-bottom: 1px solid var(--border); padding: .9rem 1rem; }
      .metric-label { color: var(--muted); font-size: .78rem; }
      .metric strong { font-family: 'Space Grotesk', 'Segoe UI', sans-serif; font-size: 1.6rem; font-weight: 600; }
      .event-management { margin-top: 2.7rem; }
      .section-heading { display: flex; align-items: end; justify-content: space-between; gap: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border); }
      .section-heading h2 { margin: 0; font-size: 1.45rem; }
      .section-sub { margin: .4rem 0 0; color: var(--muted); font-size: .84rem; }
      .event-form { margin-top: 1.2rem; border: 1px solid var(--border); border-radius: 4px; background: var(--surface); padding: 1.15rem; }
      .form-heading { margin-bottom: 1rem; }
      .form-heading h3 { font-size: 1.1rem; }
      .form-heading p { margin-top: .25rem; color: var(--muted); font-size: .8rem; }
      .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .9rem; }
      .field { display: grid; gap: .35rem; color: #d3d8d5; font-size: .77rem; }
      .field b { color: #f0a18a; }
      .field-wide { grid-column: 1 / -1; }
      .field input, .field select, .field textarea { min-width: 0; border-radius: 3px; border-color: #394241; background: #101313; }
      .field textarea { resize: vertical; }
      .form-footer { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border); }
      .publish-toggle { display: inline-flex; align-items: center; gap: .55rem; color: #d0d6d2; font-size: .82rem; }
      .publish-toggle input { width: 17px; height: 17px; accent-color: var(--primary); }
      .managed-heading { display: flex; align-items: center; justify-content: space-between; margin: 1.65rem 0 .5rem; }
      .managed-heading h3 { font-size: 1rem; }
      .managed-heading h3 span { margin-left: .35rem; color: var(--muted); font-size: .75rem; font-weight: 500; }
      .text-button { border: 0; background: transparent; color: #efaa91; font-size: .79rem; font-weight: 700; cursor: pointer; }
      .text-button:disabled { opacity: .5; cursor: wait; }
      .event-list { border-top: 1px solid var(--border); }
      .event-row { display: flex; justify-content: space-between; align-items: center; gap: 1rem; min-height: 76px; border-bottom: 1px solid var(--border); padding: .8rem .2rem; }
      .event-copy { min-width: 0; }
      .event-title-row { display: flex; align-items: center; flex-wrap: wrap; gap: .55rem; }
      .event-title-row h4 { overflow-wrap: anywhere; font-size: .92rem; }
      .event-copy p { margin: .25rem 0 0; color: var(--muted); font-size: .75rem; }
      .event-copy p span { padding: 0 .25rem; color: #c98976; }
      .status { border: 1px solid #54513b; border-radius: 2px; padding: .14rem .38rem; color: #e9cc87; font-size: .62rem; font-weight: 700; text-transform: uppercase; }
      .status-live { border-color: #35614d; color: #a0d7ba; }
      .event-actions { display: flex; flex: 0 0 auto; gap: .85rem; }
      .text-button.destructive { color: #e68c83; }
      .notice { margin-top: .8rem; color: #a4dfbd; font-size: .85rem; }
      .state-message, .empty-state { padding: 1.4rem 0; color: var(--muted); font-size: .88rem; }
      .empty-state { border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
      .empty-state h3 { color: var(--text); font-size: 1rem; }
      .empty-state p { margin-top: .3rem; }
      @media (max-width: 700px) { .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
      @media (max-width: 520px) {
        .admin-page { padding-top: 1.7rem; }
        .section-heading { align-items: flex-start; flex-direction: column; }
        .section-heading > button { width: 100%; }
        .form-grid { grid-template-columns: 1fr; }
        .field-wide { grid-column: auto; }
        .form-footer { align-items: stretch; flex-direction: column; }
        .event-row { align-items: flex-start; flex-direction: column; }
        .event-actions { align-self: flex-end; }
      }
    `,
  ],
})
export class AdminDashboardComponent implements OnInit {
  stats: any = { totalUsers: 0, totalBookings: 0, revenue: 0, totalEvents: 0, activeLocks: 0, failedPayments: 0 };
  events: any[] = [];
  loading = true;
  eventsLoading = true;
  eventsError = '';
  statsError = '';
  actionError = '';
  notice = '';
  showCreateForm = false;
  saving = false;
  busyEventId = '';
  draft = this.emptyDraft();

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.adminService.getStats().subscribe({
      next: (res) => {
        this.stats = res.data || res;
        this.loading = false;
      },
      error: (err) => {
        this.statsError = this.errorMessage(err, 'Could not load platform activity.');
        this.loading = false;
      },
    });
    this.loadEvents();
  }

  loadEvents() {
    this.eventsLoading = true;
    this.eventsError = '';
    this.adminService.listManagedEvents().subscribe({
      next: (res) => {
        this.events = res.data?.events || [];
        this.eventsLoading = false;
      },
      error: (err) => {
        this.eventsError = this.errorMessage(err, 'Could not load events.');
        this.eventsLoading = false;
      },
    });
  }

  toggleCreateForm() {
    this.showCreateForm = !this.showCreateForm;
    this.actionError = '';
    this.notice = '';
  }

  createEvent() {
    this.saving = true;
    this.actionError = '';
    this.notice = '';
    const payload = {
      ...this.draft,
      durationMinutes: this.draft.durationMinutes ? Number(this.draft.durationMinutes) : undefined,
      artist: this.draft.artist.trim() || undefined,
      genre: this.draft.genre.trim() || undefined,
      language: this.draft.language.trim() || undefined,
      posterUrl: this.draft.posterUrl.trim() || undefined,
      description: this.draft.description.trim() || undefined,
    };

    this.adminService.createEvent(payload).subscribe({
      next: (res) => {
        const event = res.data;
        this.notice = `${event.title} was ${event.is_published ? 'published' : 'saved as a draft'}.`;
        this.draft = this.emptyDraft();
        this.saving = false;
        this.showCreateForm = false;
        this.loadEvents();
        this.adminService.getStats().subscribe({ next: (stats) => (this.stats = stats.data || stats) });
      },
      error: (err) => {
        this.actionError = this.errorMessage(err, 'Could not create this event.');
        this.saving = false;
      },
    });
  }

  togglePublished(event: any) {
    this.busyEventId = event.id;
    this.actionError = '';
    this.notice = '';
    this.adminService.updateEvent(event.id, { isPublished: !event.is_published }).subscribe({
      next: (res) => {
        const updated = res.data;
        this.notice = `${updated.title} is now ${updated.is_published ? 'published' : 'a draft'}.`;
        this.busyEventId = '';
        this.loadEvents();
      },
      error: (err) => {
        this.actionError = this.errorMessage(err, 'Could not update publication status.');
        this.busyEventId = '';
      },
    });
  }

  deleteEvent(event: any) {
    if (!confirm(`Delete "${event.title}"? This cannot be undone.`)) return;
    this.busyEventId = event.id;
    this.actionError = '';
    this.notice = '';
    this.adminService.deleteEvent(event.id).subscribe({
      next: () => {
        this.notice = `${event.title} was deleted.`;
        this.busyEventId = '';
        this.loadEvents();
        this.adminService.getStats().subscribe({ next: (stats) => (this.stats = stats.data || stats) });
      },
      error: (err) => {
        this.actionError = this.errorMessage(err, 'Could not delete this event. Events with scheduled shows may need to be cancelled first.');
        this.busyEventId = '';
      },
    });
  }

  private emptyDraft() {
    return {
      title: '',
      eventType: 'MOVIE',
      artist: '',
      genre: '',
      language: '',
      durationMinutes: null as number | null,
      posterUrl: '',
      description: '',
      isPublished: false,
    };
  }

  private errorMessage(error: any, fallback: string): string {
    return error.error?.message || error.error?.errors?.map((item: any) => item.message).join(' ') || fallback;
  }
}
