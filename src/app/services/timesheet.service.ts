import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

// --- Interfaces ---
export interface TimesheetDTO {
  id: number;
  employeeId: string;
  workDate: string;
  checkInTime: string; // "HH:mm:ss"
  checkOutTime: string; // "HH:mm:ss"
  totalHours: number;
  remarks: string;
  status: string; // 'Submitted', 'Approved', 'Rejected'
}

export interface TimesheetCreateRequest {
  empId: string;      // Changed from employeeId to match validation error 'empId'
  date: string;       // Changed from workDate to match validation error 'date' ("YYYY-MM-DD")
  hoursWorked: number;// Changed from totalHours to match validation error 'hoursWorked'
  checkInTime?: string; // Optional if backend calculates hours, but good to send
  checkOutTime?: string; // Optional if backend calculates hours
  projectName?: string; // Add if needed
  taskDescription?: string; // Add if needed
  remarks?: string;
  status?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TimesheetService {
  private baseUrl = 'https://api.lovahr.com/api/timesheets';

  constructor(private http: HttpClient) {}

  // --- Headers Helper (Token Authentication) ---
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

  // --- Operations ---

  // Get All Timesheets (Admin View)
  getAllTimesheets(): Observable<TimesheetDTO[]> {
    return this.http.get<TimesheetDTO[]>(`${this.baseUrl}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  // Get Single Timesheet
  getTimesheetById(id: number): Observable<TimesheetDTO> {
    return this.http.get<TimesheetDTO>(`${this.baseUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  // Create (User submits work)
  createTimesheet(data: TimesheetCreateRequest): Observable<any> {
    // Ensure payload matches backend expectations
    const payload = {
        empId: data.empId,
        date: data.date,
        hoursWorked: data.hoursWorked,
        // Include other fields if your backend supports them, otherwise they are ignored
        checkInTime: data.checkInTime,
        checkOutTime: data.checkOutTime,
        remarks: data.remarks,
        status: data.status,
        projectName: data.projectName || 'General',
        taskDescription: data.taskDescription || data.remarks
    };
    return this.http.post<any>(`${this.baseUrl}`, payload, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  // Update (Correction or Admin Edit)
  updateTimesheet(id: number, data: Partial<TimesheetCreateRequest>): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${id}`, data, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  // Delete
  deleteTimesheet(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  // --- Helper: Format Time for UI ---
  formatTime(timeArr: any): string {
    if (!timeArr) return '--:--';
    // Handle [Hour, Minute] array from backend
    if (Array.isArray(timeArr)) {
        const h = timeArr[0] < 10 ? '0' + timeArr[0] : timeArr[0];
        const m = timeArr[1] < 10 ? '0' + timeArr[1] : timeArr[1];
        return `${h}:${m}`;
    }
    // Handle String "HH:mm:ss"
    if (typeof timeArr === 'string') {
        return timeArr.substring(0, 5);
    }
    return String(timeArr);
  }

  private handleError(error: any) {
    console.error('Timesheet Service Error:', error);
    return throwError(() => new Error(error.message || 'Server Error'));
  }
}