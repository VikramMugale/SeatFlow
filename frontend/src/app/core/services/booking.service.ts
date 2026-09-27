import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BookingService {
  private base = `${environment.apiUrl}/bookings`;
  private resBase = `${environment.apiUrl}/reservations`;
  private payBase = `${environment.apiUrl}/payments`;

  constructor(private http: HttpClient) {}

  createReservation(showId: string, seatIds: string[], idempotencyKey?: string): Observable<any> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    return this.http.post(
      this.resBase,
      { showId, seatIds },
      { headers }
    );
  }

  getReservation(id: string): Observable<any> {
    return this.http.get(`${this.resBase}/${id}`);
  }

  cancelReservation(id: string): Observable<any> {
    return this.http.delete(`${this.resBase}/${id}`);
  }

  createPayment(reservationId: string): Observable<any> {
    return this.http.post(`${this.payBase}/create`, { reservationId });
  }

  listBookings(): Observable<any> {
    return this.http.get(this.base);
  }

  getBooking(id: string): Observable<any> {
    return this.http.get(`${this.base}/${id}`);
  }

  cancelBooking(id: string): Observable<any> {
    return this.http.post(`${this.base}/${id}/cancel`, {});
  }
}
