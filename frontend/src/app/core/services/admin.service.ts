import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getStats(): Observable<any> {
    return this.http.get(`${this.base}/users/stats`);
  }

  listUsers(page = 1, limit = 20, search?: string): Observable<any> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (search) params = params.set('search', search);
    return this.http.get(`${this.base}/users`, { params });
  }

  createVenue(payload: any): Observable<any> {
    return this.http.post(`${this.base}/venues`, payload);
  }

  createShow(payload: any): Observable<any> {
    return this.http.post(`${this.base}/shows`, payload);
  }

  createEvent(payload: any): Observable<any> {
    return this.http.post(`${this.base}/events`, payload);
  }
}
