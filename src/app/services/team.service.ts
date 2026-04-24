import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

// --- Interfaces based on Swagger ---
export interface TeamCreateRequest {
  name: string;
  description: string;
  managerEmpId: string;
  memberEmpIds: string[];
}

export interface TeamUpdateRequest {
  name: string;
  description: string;
  managerEmpId: string;
  memberEmpIds: string[];
}

export interface TeamResponseDTO {
  id: number;
  teamName: string;
  description: string;
  managerEmpId: string;
  memberEmpIds: string[];
}

@Injectable({
  providedIn: 'root'
})
export class TeamService {
  private baseUrl = 'https://api.lovahr.com/api/teams';

  constructor(private http: HttpClient) {}

  // Helper to get headers with Token
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  // --- Admin Operations ---

  getAllTeams(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  getTeamById(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  createTeam(data: TeamCreateRequest): Observable<any> {
    const payload = {
        name: data.name,
        description: data.description,
        managerEmpId: data.managerEmpId,
        memberEmpIds: data.memberEmpIds
    };
    return this.http.post<any>(`${this.baseUrl}`, payload, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  updateTeam(id: number, data: TeamUpdateRequest): Observable<any> {
    const payload = {
        name: data.name,
        description: data.description,
        managerEmpId: data.managerEmpId,
        memberEmpIds: data.memberEmpIds
    };
    return this.http.put<any>(`${this.baseUrl}/${id}`, payload, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  deleteTeam(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  // --- Employee / Dashboard Operations ---

  // Fetch teams where the employee is a member
  getTeamsByEmployee(empId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/employee/${empId}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  private handleError(error: any) {
    console.error('Team Service Error:', error);
    return throwError(() => new Error(error.message || 'Server Error'));
  }
}