import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container legal">
      <h1 class="page-title">Terms and conditions</h1>
      <p class="page-sub">Last updated: 26 September 2026</p>

      <div class="card prose">
        <p>
          These terms govern your use of SeatFlow and the purchase of tickets for events listed on
          the platform. By creating an account or completing a booking, you agree to these terms.
        </p>

        <h2>Service</h2>
        <p>
          SeatFlow provides tools to discover events, select seats, pay for tickets, and manage
          bookings. Event organisers and venues remain responsible for the event itself, including
          scheduling, access control, and on-site services.
        </p>

        <h2>Accounts</h2>
        <p>
          You must provide accurate registration details and keep your credentials confidential. You
          are responsible for activity under your account. We may suspend accounts that violate these
          terms or attempt to abuse the booking system.
        </p>

        <h2>Bookings and payments</h2>
        <p>
          A seat reservation holds inventory for a limited time. A booking is confirmed only after
          successful payment verification. Prices, fees, and taxes shown at checkout form part of the
          contract for that purchase. Payment processors may apply their own terms.
        </p>

        <h2>Cancellations and refunds</h2>
        <p>
          Cancellation and refund eligibility depends on the event organiser's policy and applicable
          law. Where refunds are approved, they are processed to the original payment method within a
          reasonable period. SeatFlow may charge a processing fee if disclosed at the time of
          purchase.
        </p>

        <h2>Seat inventory</h2>
        <p>
          Seat availability is managed in real time. Temporary locks prevent concurrent double
          booking. If a payment fails or a reservation expires, seats return to available inventory.
        </p>

        <h2>Prohibited use</h2>
        <p>You may not:</p>
        <ul>
          <li>Attempt to circumvent seat locks, rate limits, or security controls</li>
          <li>Use automated tools to scrape or bulk-reserve inventory without authorisation</li>
          <li>Resell tickets in violation of organiser rules or local law</li>
          <li>Interfere with the integrity or performance of the service</li>
        </ul>

        <h2>Limitation of liability</h2>
        <p>
          To the fullest extent permitted by law, SeatFlow is not liable for event cancellations,
          venue changes, or losses arising from circumstances outside our reasonable control. Our
          aggregate liability related to a booking is limited to the amount you paid for that
          booking through SeatFlow.
        </p>

        <h2>Changes</h2>
        <p>
          We may update these terms. Material changes will be indicated by updating the date above.
          Continued use after changes constitutes acceptance where permitted by law.
        </p>

        <h2>Contact</h2>
        <p>
          Legal notices: legal&#64;seatflow.example. Replace with your production contact before
          launch.
        </p>

        <p class="back"><a routerLink="/">Back to home</a></p>
      </div>
    </div>
  `,
  styles: [
    `
      .legal {
        max-width: 720px;
      }
      .prose h2 {
        font-size: 1.05rem;
        margin: 1.5rem 0 0.5rem;
        font-weight: 600;
      }
      .prose p,
      .prose li {
        color: var(--muted);
        font-size: 0.95rem;
        margin-bottom: 0.65rem;
      }
      .prose ul {
        padding-left: 1.25rem;
        margin-bottom: 0.75rem;
      }
      .back {
        margin-top: 1.5rem;
      }
    `,
  ],
})
export class TermsComponent {}
