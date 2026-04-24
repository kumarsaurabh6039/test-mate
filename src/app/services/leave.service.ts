import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, timer, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';

// --- Interfaces ---
export interface LeaveType {
  id?: number;
  name: string;
  annualQuota: number;
  orgCode: string;
}

export interface LeaveBalance {
  id: number;
  empId: string;
  leaveType: string;
  total: number;
  consumed: number;
  remaining: number;
}

export interface LeaveBalanceCreatePayload {
  accrued: number;
  annualQuota: number;
  available: number;
  consumed: number;
  employeeId: string;
  id?: number;
  leaveType: string;
  orgCode: string;
  total: number;
}

export interface LeaveRequest {
  leaveRequestId: number; 
  id?: number; 
  empId: string;
  employeeName: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: string;
  days: number;
}

export interface LeaveApplicationRequest {
  leaveType: string;
  fromDate: string;
  toDate: string;
  reason: string;
}

@Injectable({
  providedIn: 'root'
})
export class LeaveService {
  
  private baseUrl = 'https://api.lovahr.com/api';
  private leaveBalanceSubject = new BehaviorSubject<LeaveBalance[]>([]);
  public leaveBalance$ = this.leaveBalanceSubject.asObservable();
  
  private readonly POLLING_INTERVAL = 30000;
  
  constructor(private http: HttpClient) {}
  
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    return headers;
  }

  // ==========================================
  // 1. Leave Type CRUD (Admin)
  // ==========================================
  
  getAllLeaveTypes(): Observable<LeaveType[]> {
    return this.http.get<LeaveType[]>(`${this.baseUrl}/leave-types`, { headers: this.getHeaders() }).pipe(
      catchError(() => of([]))
    );
  }

  createLeaveType(payload: LeaveType): Observable<LeaveType> {
    return this.http.post<LeaveType>(`${this.baseUrl}/leave-types`, payload, { headers: this.getHeaders() });
  }

  updateLeaveType(id: number, payload: LeaveType): Observable<LeaveType> {
    return this.http.put<LeaveType>(`${this.baseUrl}/leave-types/${id}`, payload, { headers: this.getHeaders() });
  }

  deleteLeaveType(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/leave-types/${id}`, { headers: this.getHeaders() });
  }

  // ==========================================
  // 2. Leave Balance & Polling (Restored)
  // ==========================================

  getLeaveBalance(employeeId: string): Observable<LeaveBalance[]> {
    const url = `${this.baseUrl}/leave-balances/${employeeId}`;
    return this.http.get<any[]>(url, { headers: this.getHeaders() }).pipe(
      map(data => {
        if (!Array.isArray(data)) return [];
        return data.map(item => ({
          id: item.id,
          empId: item.employeeId || item.empId,
          leaveType: item.leaveType,
          total: item.annualQuota || item.total,
          consumed: item.consumed,
          remaining: item.available || (item.total - item.consumed)
        }));
      }),
      tap(balances => this.leaveBalanceSubject.next(balances)),
      catchError(() => of([]))
    );
  }

  startLeaveBalancePolling(employeeId: string): Observable<LeaveBalance[]> {
    return timer(0, this.POLLING_INTERVAL).pipe(switchMap(() => this.getLeaveBalance(employeeId)));
  }

  // ==========================================
  // 3. Leave Requests & Management (Restored)
  // ==========================================

  getLeaveRequestsByEmpId(empId: string): Observable<LeaveRequest[]> {
    const url = `${this.baseUrl}/leave-requests/employee/${empId}`;
    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
      map(response => {
        let list = Array.isArray(response) ? response : (response?.leaveRequests || []);
        return list.map((item: any) => this.mapBackendToFrontend(item));
      }),
      catchError(() => of([]))
    );
  }

  startLeaveHistoryPolling(employeeId: string): Observable<LeaveRequest[]> {
    return timer(0, this.POLLING_INTERVAL).pipe(switchMap(() => this.getLeaveRequestsByEmpId(employeeId)));
  }

  getManagerLeaveRequests(managerId: string): Observable<LeaveRequest[]> {
    const url = `${this.baseUrl}/leave-requests/manager/${managerId}`;
    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
        map(response => {
            let list = Array.isArray(response) ? response : (response?.leaveRequests || []);
            return list.map((item: any) => this.mapBackendToFrontend(item));
        }),
        catchError(() => of([]))
    );
  }

  applyLeave(empId: string, request: LeaveApplicationRequest): Observable<any> {
    const url = `${this.baseUrl}/leave-requests/apply/${empId}`;
    return this.http.post(url, request, { headers: this.getHeaders() });
  }

  cancelLeaveRequest(leaveRequestId: number, empId: string, leavePayload: any): Observable<any> {
    const url = `${this.baseUrl}/leave-requests/cancel/${leaveRequestId}/employee/${empId}`;
    return this.http.put(url, leavePayload, { headers: this.getHeaders() });
  }

  approveLeaveRequest(requestId: number, managerId: string, payload: any): Observable<any> {
    const url = `${this.baseUrl}/leave-requests/approve/${requestId}/manager/${managerId}`;
    return this.http.put(url, payload, { headers: this.getHeaders() });
  }

  rejectLeaveRequest(requestId: number, managerId: string): Observable<any> {
    const url = `${this.baseUrl}/leave-requests/cancel/${requestId}/manager/${managerId}`;
    return this.http.put(url, {}, { headers: this.getHeaders() });
  }

  private mapBackendToFrontend(data: any): LeaveRequest {
    return {
      leaveRequestId: data.id || data.leaveRequestId,
      id: data.id || data.leaveRequestId,
      empId: data.empId,
      employeeName: data.employeeName || data.empId,
      leaveType: data.leaveType,
      fromDate: data.fromDate,
      toDate: data.toDate,
      reason: data.reason,
      status: data.status,
      days: data.days || 0
    };
  }

  createLeaveBalance(payload: LeaveBalanceCreatePayload): Observable<any> {
    const url = `${this.baseUrl}/leave-balances`;
    return this.http.post(url, payload, { headers: this.getHeaders() });
  }
}