import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Seat {
  id: string;
  label: string;
  row: string;
  number: number;
  category: string;
  status: 'AVAILABLE' | 'LOCKED' | 'BOOKED' | 'BLOCKED';
  price: number;
}

@Injectable({ providedIn: 'root' })
export class SeatService {
  private socket: Socket | null = null;
  private seatsSubject = new BehaviorSubject<Seat[]>([]);
  seats$ = this.seatsSubject.asObservable();

  constructor(private http: HttpClient) {}

  loadSeats(showId: string): Observable<{ success: boolean; data: { showId: string; seats: Seat[] } }> {
    return this.http.get<{ success: boolean; data: { showId: string; seats: Seat[] } }>(
      `${environment.apiUrl}/shows/${showId}/seats`
    );
  }

  setSeats(seats: Seat[]) {
    this.seatsSubject.next(seats);
  }

  joinShow(showId: string) {
    if (!this.socket) {
      this.socket = io(environment.socketUrl, { path: '/socket.io', transports: ['websocket'] });
    }
    this.socket.emit('join:show', showId);

    this.socket.on('seat:locked', (payload: { seatId: string; seatLabel: string }) => {
      this.updateSeatStatus(payload.seatId, 'LOCKED');
    });

    this.socket.on('seat:released', (payload: { seatId: string }) => {
      this.updateSeatStatus(payload.seatId, 'AVAILABLE');
    });

    this.socket.on('seat:booked', (payload: { seatId: string }) => {
      this.updateSeatStatus(payload.seatId, 'BOOKED');
    });

    this.socket.on('reservation:expired', (payload: { seats: { seatId: string }[] }) => {
      payload.seats?.forEach((s) => this.updateSeatStatus(s.seatId, 'AVAILABLE'));
    });
  }

  leaveShow(showId: string) {
    this.socket?.emit('leave:show', showId);
  }

  createReservation(showId: string, seatIds: string[], idempotencyKey?: string) {
    const headers: Record<string, string> = {};
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    return this.http.post(
      `${environment.apiUrl}/reservations`,
      { showId, seatIds },
      { headers }
    );
  }

  private updateSeatStatus(seatId: string, status: Seat['status']) {
    const seats = this.seatsSubject.value.map((s) =>
      s.id === seatId ? { ...s, status } : s
    );
    this.seatsSubject.next(seats);
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
}
