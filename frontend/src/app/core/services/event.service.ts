import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface EventFilters {
  q?: string;
  search?: string;
  type?: string;
  city?: string;
  genre?: string;
  language?: string;
  date?: string;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class EventService {
  private base = `${environment.apiUrl}/events`;

  constructor(private http: HttpClient) {}

  list(filters: EventFilters = {}): Observable<any> {
    let params = new HttpParams();
    const mapped: Record<string, string | number | undefined> = {
      ...filters,
      search: filters.search || filters.q,
    };
    delete (mapped as any).q;
    Object.entries(mapped).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        params = params.set(k, String(v));
      }
    });
    return this.http.get(this.base, { params });
  }

  getById(id: string): Observable<any> {
    return this.http.get(`${this.base}/${id}`);
  }

  create(payload: any): Observable<any> {
    return this.http.post(this.base, payload);
  }

  update(id: string, payload: any): Observable<any> {
    return this.http.put(`${this.base}/${id}`, payload);
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.base}/${id}`);
  }
}
