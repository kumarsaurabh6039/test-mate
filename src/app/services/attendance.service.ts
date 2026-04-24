import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserService } from '../user-service.service';

export interface AttendanceDTO {
  id: number;
  empId: string;
  date: string;
  loginTime: string;
  logoutTime: string;
  irregularAttendance: boolean;
  managerApprovalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  status?: string; // Adding status field (PRESENT, ABSENT, etc.)
  totalHoursWorked: number;
  orgCode: string;
  employeeName?: string;
}

export interface AttendanceListResponse {
  attendances: AttendanceDTO[];
  message: string;
  success: boolean;
  totalCount: number;
}

export interface AttendanceResponse {
  attendance: AttendanceDTO;
  message: string;
  success: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  private baseUrl = 'https://api.lovahr.com/api/attendances';

  constructor(private http: HttpClient, private userService: UserService) {}

  private getHeaders(): HttpHeaders {
    const token: string | null = this.userService.getToken(); 
    let headers = new HttpHeaders();
    if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  // Fetch all attendance records (Used in Admin View)
  getAllAttendances(): Observable<AttendanceListResponse> {
    return this.http.get<AttendanceListResponse>(this.baseUrl, {
      headers: this.getHeaders()
    });
  }

  // Fetch pending regularization requests
  getPendingRegularizations(): Observable<AttendanceListResponse> {
    return this.http.get<AttendanceListResponse>(`${this.baseUrl}/irregular/pending`, {
      headers: this.getHeaders()
    });
  }

  // Approve regularization
  regularizeAttendance(attendanceId: number): Observable<AttendanceResponse> {
    return this.http.post<AttendanceResponse>(`${this.baseUrl}/${attendanceId}/regularize`, {}, {
      headers: this.getHeaders()
    });
  }

  // Reject regularization
  rejectAttendance(attendanceId: number): Observable<AttendanceResponse> {
    return this.http.post<AttendanceResponse>(`${this.baseUrl}/${attendanceId}/reject`, {}, {
      headers: this.getHeaders()
    });
  }

  updateAttendance(id: number, request: any): Observable<AttendanceResponse> {
    return this.http.put<AttendanceResponse>(`${this.baseUrl}/${id}`, request, {
      headers: this.getHeaders()
    });
  }
}