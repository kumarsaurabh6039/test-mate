import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ExternalLink {
  id?: number;
  linkName: string;
  linkType: string;
  url: string;
  description?: string;
  isActive?: boolean;
  orgCode?: string;
  visibleToRoles?: string; // Comma separated roles like "EMPLOYEE,HR,ADMIN"
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ExternalLinksService {
  private http = inject(HttpClient);
  private baseUrl = 'https://api.lovahr.com/api/external-links';

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken'); 
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // Get only active links (for general dashboard)
  getActiveLinks(): Observable<ExternalLink[]> {
    return this.http.get<ExternalLink[]>(this.baseUrl, { headers: this.getHeaders() });
  }

  // Get all links including inactive (for HR Admin)
  getAllLinks(): Observable<ExternalLink[]> {
    return this.http.get<ExternalLink[]>(`${this.baseUrl}/all`, { headers: this.getHeaders() });
  }

  // Get links by type (PF, INSURANCE, etc.)
  getLinksByType(type: string): Observable<ExternalLink[]> {
    return this.http.get<ExternalLink[]>(`${this.baseUrl}/type/${type}`, { headers: this.getHeaders() });
  }

  // Create new link
  createLink(link: ExternalLink): Observable<any> {
    return this.http.post(this.baseUrl, link, { headers: this.getHeaders() });
  }

  // Update existing link
  updateLink(id: number, link: ExternalLink): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}`, link, { headers: this.getHeaders() });
  }

  // Delete link permanently
  deleteLink(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`, { headers: this.getHeaders() });
  }

  // Status management using PATCH endpoints
  activateLink(id: number): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}/activate`, {}, { headers: this.getHeaders() });
  }

  deactivateLink(id: number): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}/deactivate`, {}, { headers: this.getHeaders() });
  }
}