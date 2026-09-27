import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="header">
      <div class="header-inner container">
        <a routerLink="/" class="logo">SeatFlow</a>
        <nav class="nav">
          <a routerLink="/events" routerLinkActive="active">Events</a>
          @if (auth.isLoggedIn) {
            <a routerLink="/bookings" routerLinkActive="active">My bookings</a>
            @if (auth.isAdmin) {
              <a routerLink="/admin" routerLinkActive="active">Admin</a>
            }
            <span class="user-name">{{ (auth.user$ | async)?.name }}</span>
            <button type="button" class="btn btn-ghost btn-sm" (click)="logout()">Log out</button>
          } @else {
            <a routerLink="/login" routerLinkActive="active">Log in</a>
            <a routerLink="/register" class="btn btn-primary btn-sm">Create account</a>
          }
        </nav>
      </div>
    </header>

    <main>
      <router-outlet />
    </main>

    <footer class="footer">
      <div class="container footer-inner">
        <div class="footer-brand">SeatFlow</div>
        <nav class="footer-nav">
          <a routerLink="/events">Events</a>
          <a routerLink="/privacy">Privacy</a>
          <a routerLink="/terms">Terms</a>
        </nav>
        <div class="footer-copy">© {{ year }} SeatFlow. All rights reserved.</div>
      </div>
    </footer>
  `,
  styles: [
    `
      .header {
        background: var(--surface);
        border-bottom: 1px solid var(--border);
        position: sticky;
        top: 0;
        z-index: 100;
      }
      .header-inner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-top: 0.75rem;
        padding-bottom: 0.75rem;
      }
      .logo {
        font-size: 1.15rem;
        font-weight: 700;
        color: var(--text);
        text-decoration: none;
        letter-spacing: -0.02em;
      }
      .logo:hover {
        text-decoration: none;
      }
      .nav {
        display: flex;
        align-items: center;
        gap: 1.15rem;
        flex-wrap: wrap;
      }
      .nav a {
        color: var(--muted);
        text-decoration: none;
        font-weight: 500;
        font-size: 0.9rem;
      }
      .nav a:hover,
      .nav a.active {
        color: var(--text);
        text-decoration: none;
      }
      .user-name {
        color: var(--muted);
        font-size: 0.85rem;
      }
      .btn-sm {
        padding: 0.35rem 0.75rem;
        font-size: 0.85rem;
      }
      main {
        min-height: calc(100vh - 140px);
      }
      .footer {
        border-top: 1px solid var(--border);
        background: var(--surface);
        padding: 1.5rem 0;
        margin-top: 2rem;
      }
      .footer-inner {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
      }
      .footer-brand {
        font-weight: 600;
        font-size: 0.95rem;
      }
      .footer-nav {
        display: flex;
        gap: 1.25rem;
      }
      .footer-nav a {
        color: var(--muted);
        font-size: 0.85rem;
        text-decoration: none;
      }
      .footer-nav a:hover {
        color: var(--text);
      }
      .footer-copy {
        color: var(--muted);
        font-size: 0.8rem;
        width: 100%;
      }
      @media (min-width: 640px) {
        .footer-copy {
          width: auto;
        }
      }
    `,
  ],
})
export class AppComponent {
  year = new Date().getFullYear();

  constructor(public auth: AuthService) {}

  logout() {
    this.auth.logout();
  }
}
