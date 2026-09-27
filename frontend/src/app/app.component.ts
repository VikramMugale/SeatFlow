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
        <a routerLink="/" class="logo" aria-label="SeatFlow home">SeatFlow<span>.</span></a>
        <nav class="nav">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Discover</a>
          <a routerLink="/events" routerLinkActive="active">Explore</a>
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
        background: rgba(13, 15, 16, 0.94);
        border-bottom: 1px solid var(--border);
        position: sticky;
        top: 0;
        z-index: 100;
        backdrop-filter: blur(16px);
      }
      .header-inner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-top: 0.75rem;
        padding-bottom: 0.75rem;
      }
      .logo {
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--text);
        text-decoration: none;
      }
      .logo span {
        color: var(--primary);
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
        transition: color 160ms ease;
      }
      .nav a:hover,
      .nav a.active {
        color: #fff;
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
        background: #101314;
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
      @media (max-width: 620px) {
        .header-inner {
          align-items: flex-start;
          flex-direction: column;
          gap: 0.55rem;
        }
        .nav {
          width: 100%;
          justify-content: space-between;
          gap: 0.55rem;
        }
        .nav a,
        .user-name {
          font-size: 0.82rem;
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
