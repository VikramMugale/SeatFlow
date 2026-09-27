import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="container auth-page">
      <div class="card auth-card">
        <h1 class="page-title">Create account</h1>
        <p class="page-sub">Register to book tickets</p>

        @if (error) {
          <div class="alert alert-error">{{ error }}</div>
        }

        <form (ngSubmit)="submit()">
          <div class="form-group">
            <label for="name">Full name</label>
            <input id="name" type="text" [(ngModel)]="name" name="name" required autocomplete="name" />
          </div>
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
            <label for="phone">Phone (optional)</label>
            <input id="phone" type="tel" [(ngModel)]="phone" name="phone" autocomplete="tel" />
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input
              id="password"
              type="password"
              [(ngModel)]="password"
              name="password"
              required
              minlength="8"
              autocomplete="new-password"
            />
          </div>
          <button class="btn btn-primary" type="submit" [disabled]="loading" style="width:100%">
            {{ loading ? 'Creating account…' : 'Create account' }}
          </button>
        </form>

        <p class="footer-link">
          Already registered? <a routerLink="/login">Log in</a>
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
export class RegisterComponent {
  name = '';
  email = '';
  phone = '';
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
    this.auth
      .register({
        name: this.name,
        email: this.email,
        password: this.password,
        phone: this.phone || undefined,
      })
      .subscribe({
        next: () => {
          this.loading = false;
          this.router.navigate(['/events']);
        },
        error: (err) => {
          this.loading = false;
          this.error = err.error?.message || 'Registration failed. Try a different email.';
        },
      });
  }
}
