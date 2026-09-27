import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="container auth-page">
      <div class="card auth-card">
        <h1 class="page-title">Log in</h1>
        <p class="page-sub">Access your account to manage bookings</p>

        @if (error) {
          <div class="alert alert-error">{{ error }}</div>
        }

        <form (ngSubmit)="submit()">
          <div class="form-group">
            <label for="email">Email</label>
            <input
              id="email"
              type="email"
              [(ngModel)]="email"
              name="email"
              required
              autocomplete="email"
            />
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input
              id="password"
              type="password"
              [(ngModel)]="password"
              name="password"
              required
              autocomplete="current-password"
            />
          </div>
          <button class="btn btn-primary" type="submit" [disabled]="loading" style="width:100%">
            {{ loading ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>

        <p class="footer-link">
          No account? <a routerLink="/register">Create one</a>
        </p>
      </div>
    </div>
  `,
  styles: [
    `
      .auth-page {
        display: flex;
        justify-content: center;
        padding-top: 2.5rem;
      }
      .auth-card {
        width: 100%;
        max-width: 380px;
      }
      .footer-link {
        margin-top: 1.15rem;
        text-align: center;
        color: var(--muted);
        font-size: 0.9rem;
      }
    `,
  ],
})
export class LoginComponent {
  email = '';
  password = '';
  loading = false;
  error = '';

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  submit() {
    this.error = '';
    this.loading = true;
    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        this.loading = false;
          this.router.navigate([this.auth.isAdmin ? '/admin' : '/events']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'Login failed. Check your email and password.';
      },
    });
  }
}
