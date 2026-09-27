import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container">
      <h1 class="page-title">Admin dashboard</h1>
      <p class="page-sub">Platform overview</p>

      @if (loading) {
        <p class="muted">Loading stats…</p>
      } @else {
        <div class="grid grid-3 metrics">
          <div class="card metric">
            <div class="value">{{ stats.totalUsers ?? '—' }}</div>
            <div class="label">Users</div>
          </div>
          <div class="card metric">
            <div class="value">{{ stats.totalBookings ?? '—' }}</div>
            <div class="label">Bookings</div>
          </div>
          <div class="card metric">
            <div class="value">₹{{ stats.revenue ?? '—' }}</div>
            <div class="label">Revenue</div>
          </div>
          <div class="card metric">
            <div class="value">{{ stats.totalEvents ?? '—' }}</div>
            <div class="label">Events</div>
          </div>
          <div class="card metric">
            <div class="value">{{ stats.activeLocks ?? stats.activeReservations ?? '—' }}</div>
            <div class="label">Active locks</div>
          </div>
          <div class="card metric">
            <div class="value">{{ stats.failedPayments ?? '—' }}</div>
            <div class="label">Failed payments</div>
          </div>
        </div>
      }

      <div class="card" style="margin-top: 1.5rem">
        <h3>Management</h3>
        <ul class="links">
          <li><a routerLink="/events">View published events</a></li>
          <li>Create and update events, venues, and shows through the admin API endpoints.</li>
        </ul>
      </div>
    </div>
  `,
  styles: [
    `
      .metrics {
        margin-top: 0.5rem;
      }
      .metric .value {
        font-size: 1.75rem;
        font-weight: 700;
      }
      .metric .label {
        color: var(--muted);
        font-size: 0.9rem;
      }
      .links {
        margin-top: 0.75rem;
        padding-left: 1.25rem;
        color: var(--muted);
      }
      .links li {
        margin-bottom: 0.35rem;
      }
      .muted {
        color: var(--muted);
      }
    `,
  ],
})
export class AdminDashboardComponent implements OnInit {
  stats: any = {};
  loading = true;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/users/stats`).subscribe({
      next: (res) => {
        this.stats = res.data || res;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }
}
