import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

// Matches the Swagger definition for Organization Details
export interface OrganizationDetails {
  companyLogo: string;
  companyName: string;
  corporateAddress: string;
}

export interface PaySlip {
  id: number;
  employeeId: string;
  payPeriod: string; 
  payDate: string;   
  basic: number;
  hra: number;
  conveyanceAllowance: number;
  medicalAllowance: number;
  specialAllowances: number;
  otherEarnings: number;
  bonus: number;
  esop: number;
  gratuity: number;
  pf: number;
  tax: number; 
  insurances: number;
  otherDeductions: number;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  paidDays: number;
  lopDays: number;
  orgCode: string;
  ytdBasic?: number;
  ytdGrossPay?: number;
  ytdNetPay?: number;
}

// Wrapper for the detailed response
export interface PaySlipWithOrgResponse {
  paySlip: PaySlip;
  organization: OrganizationDetails;
  employee: { empId: string; firstName: string; };
  success: boolean;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PayslipService {
  private baseUrl = 'https://api.lovahr.com/api';

  constructor(private http: HttpClient) { }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  getPayslipsByEmployeeId(employeeId: string): Observable<PaySlip[]> {
    const url = `${this.baseUrl}/payslips/employee/${employeeId}`;
    return this.http.get<any>(url, { headers: this.getAuthHeaders() }).pipe(
      map(response => {
        if (Array.isArray(response)) return response;
        if (response?.data && Array.isArray(response.data)) return response.data;
        return [];
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Fetch detailed payslip WITH Organization metadata
   * Endpoint: GET /api/payroll/payslip/id/{payslipId}
   */
  getPayslipByIdWithDetails(id: number): Observable<PaySlipWithOrgResponse> {
    const url = `${this.baseUrl}/payroll/payslip/id/${id}`;
    return this.http.get<PaySlipWithOrgResponse>(url, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = error.error?.message || error.statusText || 'Server Error';
    return throwError(() => new Error(errorMessage));
  }
}