import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

// Extracted from Swagger models
export interface AssetDTO {
  id?: number;
  name: string;
  type: string;
  serialNumber: string;
  assetTag?: string;
  description?: string;
  location?: string;
  status?: string;
  orgCode?: string;
  employeeId?: string;
  assignedBy?: string;
  assignedDate?: string;
}

export interface AssetCreateRequest {
  name: string;
  type: string; // Accepts string, so custom strings can be dynamically saved here
  serialNumber: string;
  assetTag?: string;
  description?: string;
  location?: string;
  status?: string; 
}

@Injectable({
  providedIn: 'root'
})
export class AssetsService {
  private baseUrl = 'https://api.lovahr.com/api/assets';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token'); 
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  getAllAssets(): Observable<any> {
    return this.http.get<any>(this.baseUrl, { headers: this.getHeaders() });
  }

  createAsset(assetData: AssetCreateRequest): Observable<any> {
    return this.http.post<any>(this.baseUrl, assetData, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  updateAsset(serialNumber: string, updateData: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${serialNumber}`, updateData, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  assignAsset(serialNumber: string, request: { employeeId: string, assignedBy: string }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${serialNumber}/assign`, request, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  getAssetsByEmployee(empId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/employee/${empId}`, { headers: this.getHeaders() });
  }
  
  generateAssetTag(): string {
    const prefix = 'TAG';
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    return `${prefix}-${randomNum}`;
  }

  private handleError(error: any) {
    console.error('An error occurred:', error);
    return throwError(() => error);
  }
}