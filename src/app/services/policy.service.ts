import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Interface for Policy Data
 * Represents a Map structure as per the Swagger analysis
 */
export interface PolicySummary {
  [key: string]: string;
}

@Injectable({
  providedIn: 'root'
})
export class PolicyService {
  private http = inject(HttpClient);
  private baseUrl = 'https://api.lovahr.com/api/policy';

  /**
   * Helper function to generate authorization headers
   */
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * Fetch policy summary for HR/Admin management
   */
  getPolicySummary(): Observable<PolicySummary> {
    return this.http.get<PolicySummary>(this.baseUrl, { headers: this.getHeaders() });
  }

  /**
   * Create a new Policy Summary
   */
  createPolicy(policy: PolicySummary): Observable<any> {
    return this.http.post(this.baseUrl, policy, { headers: this.getHeaders() });
  }

  /**
   * Update an existing policy summary
   */
  updatePolicy(policy: PolicySummary): Observable<any> {
    return this.http.put(this.baseUrl, policy, { headers: this.getHeaders() });
  }

  /**
   * Public endpoint for the Onboarding flow
   * Fetches policy based on the organization code
   */
  getPolicyByOrgCode(orgCode: string): Observable<PolicySummary> {
    return this.http.get<PolicySummary>(`${this.baseUrl}/${orgCode}`);
  }
}