import { Routes } from '@angular/router';
import { authGuard, adminGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'events',
    loadComponent: () =>
      import('./pages/events/events-list.component').then((m) => m.EventsListComponent),
  },
  {
    path: 'events/:id',
    loadComponent: () =>
      import('./pages/events/event-details.component').then((m) => m.EventDetailsComponent),
  },
  {
    path: 'shows/:showId/seats',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/seats/seat-map.component').then((m) => m.SeatMapComponent),
  },
  {
    path: 'checkout/:reservationId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/checkout/checkout.component').then((m) => m.CheckoutComponent),
  },
  {
    path: 'bookings',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/bookings/my-bookings.component').then((m) => m.MyBookingsComponent),
  },
  {
    path: 'bookings/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/bookings/booking-detail.component').then((m) => m.BookingDetailComponent),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./pages/admin/admin-dashboard.component').then((m) => m.AdminDashboardComponent),
  },
  {
    path: 'privacy',
    loadComponent: () =>
      import('./pages/legal/privacy.component').then((m) => m.PrivacyComponent),
  },
  {
    path: 'terms',
    loadComponent: () => import('./pages/legal/terms.component').then((m) => m.TermsComponent),
  },
  { path: '**', redirectTo: '' },
];
