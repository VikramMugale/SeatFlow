import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container legal">
      <h1 class="page-title">Privacy policy</h1>
      <p class="page-sub">Last updated: 26 September 2026</p>

      <div class="card prose">
        <p>
          SeatFlow ("we", "us") operates this ticket booking service. This policy describes how we
          collect, use, and protect personal information when you use our website and related
          services.
        </p>

        <h2>Information we collect</h2>
        <p>We collect information you provide when you register or book tickets, including:</p>
        <ul>
          <li>Name, email address, and phone number</li>
          <li>Account credentials (passwords are stored as irreversible hashes)</li>
          <li>Booking and payment records associated with your account</li>
          <li>Technical data such as IP address, browser type, and device information</li>
        </ul>

        <h2>How we use information</h2>
        <p>We use your information to:</p>
        <ul>
          <li>Create and manage your account</li>
          <li>Process seat reservations, payments, and ticket delivery</li>
          <li>Send booking confirmations and service-related messages</li>
          <li>Prevent fraud, double booking, and abuse of the platform</li>
          <li>Improve reliability and security of the service</li>
        </ul>

        <h2>Legal bases</h2>
        <p>
          Where applicable law requires a legal basis, we process data to perform our contract with
          you (bookings and account services), to comply with legal obligations, and for legitimate
          interests such as security and service improvement.
        </p>

        <h2>Sharing</h2>
        <p>
          We share data with payment processors to complete transactions, and with infrastructure
          providers that host our systems under contractual confidentiality. We do not sell personal
          information.
        </p>

        <h2>Retention</h2>
        <p>
          Account and booking data is retained for as long as needed to provide the service and meet
          legal, tax, and dispute-resolution requirements. You may request account closure subject to
          outstanding obligations.
        </p>

        <h2>Security</h2>
        <p>
          We use industry-standard measures including encrypted transport (HTTPS), hashed passwords,
          access controls, and monitoring. No method of transmission or storage is completely secure.
        </p>

        <h2>Your rights</h2>
        <p>
          Depending on your location, you may have rights to access, correct, delete, or restrict
          processing of your personal data, and to lodge a complaint with a supervisory authority.
          Contact us using the details below to exercise these rights.
        </p>

        <h2>Cookies</h2>
        <p>
          We use essential cookies and local storage for authentication and session continuity. We do
          not use third-party advertising trackers on the core booking flow.
        </p>

        <h2>Contact</h2>
        <p>
          For privacy requests: privacy&#64;seatflow.example. Replace this address with your production
          contact before launch.
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
export class PrivacyComponent {}
