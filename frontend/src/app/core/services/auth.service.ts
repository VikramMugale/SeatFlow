import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'CUSTOMER' | 'ADMIN';
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = `${environment.apiUrl}/auth`;
  private userSubject = new BehaviorSubject<User | null>(this.loadUser());
  user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient) {}

  register(data: { name: string; email: string; password: string; phone?: string }) {
    return this.http.post<{ success: boolean; data: AuthResponse }>(`${this.API}/register`, data).pipe(
      tap((res) => this.persist(res.data))
    );
  }

  login(email: string, password: string) {
    return this.http.post<{ success: boolean; data: AuthResponse }>(`${this.API}/login`, { email, password }).pipe(
      tap((res) => this.persist(res.data))
    );
  }

  logout() {
    const refreshToken = localStorage.getItem('refreshToken');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    this.userSubject.next(null);
    if (refreshToken) {
      this.http.post(`${this.API}/logout`, { refreshToken }).subscribe();
    }
  }

  get accessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  get isLoggedIn(): boolean {
    return !!this.accessToken;
  }

  get isAdmin(): boolean {
    return this.userSubject.value?.role === 'ADMIN';
  }

  private persist(data: AuthResponse) {
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    this.userSubject.next(data.user);
  }

  private loadUser(): User | null {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  }
}
