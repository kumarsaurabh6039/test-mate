// ═══════════════════════════════════════════════════════════════════════════
// chatbot.service.ts  —  Lova Chatbot  —  All real API calls
// ═══════════════════════════════════════════════════════════════════════════
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';

// ─── Response Shapes (trimmed to what we display) ───────────────────────────

export interface AssetItem {
  id: number;
  name: string;
  type: string;
  serialNumber: string;
  status: string;
  location?: string;
  assignedDate?: string;
}

export interface AssetListResponse {
  assets: AssetItem[];
  success: boolean;
  totalCount: number;
}

export interface AttendanceSummary {
  date: string;
  firstLogin: string;   // ISO datetime
  lastLogout: string;   // ISO datetime
  duration: string;
}

export interface AttendanceRecord {
  id: number;
  empId: string;
  date: string;
  loginTime: string;
  logoutTime: string;
  status: string;
  totalHoursWorked: number;
  irregularAttendance: boolean;
  managerApprovalStatus: string;
}

export interface AttendanceListResponse {
  attendances: AttendanceRecord[];
  success: boolean;
  totalCount: number;
}

export interface LeaveBalance {
  id: number;
  employeeId: string;
  leaveType: string;
  annualQuota: number;
  accrued: number;
  consumed: number;
  available: number;
  total: number;
}

export interface LeaveRequest {
  id: number;
  empId: string;
  employeeName: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  days: number;
  status: string;
  reason: string;
}

export interface LeaveRequestListResponse {
  leaveRequests: LeaveRequest[];
  success: boolean;
  totalCount: number;
}

export interface TeamMemberContact {
  empId: string;
  fullName: string;
  email: string;
  designation: string;
  department: string;
  role: string;
  mobileNumber?: string;
  profilePictureUrl?: string;
}

export interface TeamItem {
  id: number;
  teamName: string;
  managerEmpId: string;
  managerContact: TeamMemberContact;
  memberContacts: TeamMemberContact[];
  memberEmpIds: string[];
}

export interface TeamListResponse {
  teams: TeamItem[];
  success: boolean;
  totalCount: number;
}

export interface EmployeeProfile {
  empId: string;
  firstName: string;
  surname: string;
  middleName?: string;
  department: string;
  designation: string;
  role: string;
  joiningDate: string;
  location: string;
  managerEmpId?: string;
  mobileNumber?: string;
  personalEmailId?: string;
  profilePictureUrl?: string;
  birthday?: string;
  bloodGroup?: string;
  gender?: string;
  address?: string;
}

export interface TrainingItem {
  id: number;
  trainingCode: string;
  title: string;
  description?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  durationHours?: number;
}

export interface EnrollmentItem {
  id: number;
  employeeId: string;
  trainingId: number;
  trainingTitle: string;
  status: string;
  overallProgress: number;
  enrollmentDate: string;
  completionDate?: string;
}

export interface PaySlip {
  id: number;
  employeeId: string;
  payPeriod: string;
  payDate: string;
  grossPay: number;
  netPay: number;
  basic: number;
  hra: number;
  pf: number;
  tax: number;
  totalDeductions: number;
  paidDays: number;
  workingDays: number;
}

export interface CtcDetail {
  id: number;
  employeeId: string;
  basicPay: number;
  hra: number;
  pf: number;
  tax: number;
  grossSalary: number;
  netPay: number;
  bonus?: number;
  specialAllowances?: number;
  medicalAllowance?: number;
  isMonthly: boolean;
}

export interface ExternalLink {
  id: number;
  linkName: string;
  linkType: string;
  url: string;
  description?: string;
  isActive: boolean;
  visibleToRoles?: string;
}

export interface HolidayItem {
  id: number;
  date: string;
  day: string;
  description?: string;
  location?: string;
  year: number;
}

export interface HolidayListResponse {
  holidays: HolidayItem[];
  success: boolean;
  totalCount: number;
}

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  status: string;
  priority: string;
  recipientEmpId: string;
  createdAt: string;
  readAt?: string;
}

export interface PolicyDocument {
  id: number;
  orgCode: string;
  fileName: string;
  fileType: string;
  s3Key: string;
  status: string;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private http = inject(HttpClient);

  readonly baseUrl = 'https://api.lovahr.com';

  // ─── Auth Header ──────────────────────────────────────────────────────────
  private headers(): HttpHeaders {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    });
  }

  // Used specifically for file uploads (browser sets multipart boundary automatically)
  private uploadHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';
    return new HttpHeaders({
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    });
  }

  getCurrentEmpId(): string {
    return localStorage.getItem('empId') || sessionStorage.getItem('empId') || '';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AI POLICY CHATBOT APIS
  // ═══════════════════════════════════════════════════════════════════════════

  askPolicyQuestion(question: string, sessionId?: number): Observable<any> {
    const payload = { question, sessionId };
    return this.http.post<any>(`${this.baseUrl}/api/chatbot/ask`, payload, { headers: this.headers() })
      .pipe(catchError((err) => {
        console.error("AI Chatbot Error:", err);
        return of(null);
      }));
  }

  uploadPolicyDocument(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`${this.baseUrl}/api/policy/upload`, formData, { headers: this.uploadHeaders() })
      .pipe(catchError((err) => {
        console.error("Upload Error:", err);
        return of(null);
      }));
  }

  getPolicyDocuments(): Observable<PolicyDocument[] | null> {
    return this.http.get<PolicyDocument[]>(`${this.baseUrl}/api/policy/documents`, { headers: this.headers() })
      .pipe(catchError(() => of(null)));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STANDARD HR APIS
  // ═══════════════════════════════════════════════════════════════════════════

  getMyAssets(empId: string): Observable<AssetListResponse | null> {
    return this.http.get<AssetListResponse>(`${this.baseUrl}/api/assets/employee/${empId}`, { headers: this.headers() }).pipe(catchError(() => of(null)));
  }

  getAttendanceSummary(empId: string): Observable<AttendanceSummary[] | null> {
    return this.http.get<AttendanceSummary[]>(`${this.baseUrl}/api/attendances/summary/${empId}`, { headers: this.headers() }).pipe(catchError(() => of(null)));
  }

  getAttendanceByEmployee(empId: string): Observable<AttendanceListResponse | null> {
    return this.http.get<AttendanceListResponse>(`${this.baseUrl}/api/attendances/employee/${empId}`, { headers: this.headers() }).pipe(catchError(() => of(null)));
  }

  getLeaveBalance(empId: string): Observable<LeaveBalance[] | null> {
    return this.http.get<LeaveBalance[]>(`${this.baseUrl}/api/leave-balances/${empId}`, { headers: this.headers() }).pipe(catchError(() => of(null)));
  }

  getLeaveRequests(empId: string): Observable<LeaveRequestListResponse | null> {
    return this.http.get<LeaveRequestListResponse>(`${this.baseUrl}/api/leave-requests/employee/${empId}`, { headers: this.headers() }).pipe(catchError(() => of(null)));
  }

  getMyTeams(empId: string): Observable<TeamListResponse | null> {
    return this.http.get<TeamListResponse>(`${this.baseUrl}/api/teams/employee/${empId}`, { headers: this.headers() }).pipe(catchError(() => of(null)));
  }

  getMyProfile(empId: string): Observable<EmployeeProfile | null> {
    return this.http.get<EmployeeProfile>(`${this.baseUrl}/api/employees/empid/${empId}`, { headers: this.headers() }).pipe(catchError(() => of(null)));
  }

  getCtcDetail(empId: string): Observable<{ ctcDetail: CtcDetail } | null> {
    return this.http.get<{ ctcDetail: CtcDetail }>(`${this.baseUrl}/api/ctc/employee/${empId}`, { headers: this.headers() }).pipe(catchError(() => of(null)));
  }

  getPayslipsByEmployee(empId: string): Observable<PaySlip[] | null> {
    return this.http.get<PaySlip[]>(`${this.baseUrl}/api/payslips/employee/${empId}`, { headers: this.headers() }).pipe(catchError(() => of(null)));
  }

  getActiveTrainings(): Observable<TrainingItem[] | null> {
    return this.http.get<TrainingItem[]>(`${this.baseUrl}/api/trainings/status/ACTIVE`, { headers: this.headers() }).pipe(catchError(() => of(null)));
  }

  getAllTrainings(): Observable<TrainingItem[] | null> {
    return this.http.get<TrainingItem[]>(`${this.baseUrl}/api/trainings`, { headers: this.headers() }).pipe(catchError(() => of(null)));
  }

  getMyEnrollments(empId: string): Observable<EnrollmentItem[] | null> {
    return this.http.get<EnrollmentItem[]>(`${this.baseUrl}/api/enrollments/employee/${empId}`, { headers: this.headers() }).pipe(catchError(() => of(null)));
  }

  getExternalLinks(): Observable<ExternalLink[] | null> {
    return this.http.get<ExternalLink[]>(`${this.baseUrl}/api/external-links`, { headers: this.headers() }).pipe(catchError(() => of(null)));
  }

  getHolidays(): Observable<HolidayListResponse | null> {
    return this.http.get<any>(`${this.baseUrl}/api/holidays`, { headers: this.headers() }).pipe(catchError(() => of(null)));
  }

  getNotifications(empId: string): Observable<NotificationItem[] | null> {
    return this.http.get<NotificationItem[]>(`${this.baseUrl}/api/notifications?empId=${empId}`, { headers: this.headers() }).pipe(catchError(() => of(null)));
  }

  getUnreadCount(empId: string): Observable<number | null> {
    return this.http.get<number>(`${this.baseUrl}/api/notifications/unread/count?empId=${empId}`, { headers: this.headers() }).pipe(catchError(() => of(null)));
  }

  // ─── Utility: badge class by asset/leave/attendance status ───────────────
  assetBadgeClass(status: string): string {
    const s = (status || '').toUpperCase();
    if (s === 'ASSIGNED')    return 'badge-green';
    if (s === 'MAINTENANCE') return 'badge-yellow';
    if (s === 'AVAILABLE')   return 'badge-blue';
    if (s === 'RETURNED')    return 'badge-gray';
    return 'badge-gray';
  }

  attendanceBadgeClass(status: string): string {
    const s = (status || '').toUpperCase();
    if (s === 'PRESENT')        return 'badge-green';
    if (s === 'HALF_DAY')       return 'badge-blue';
    if (s === 'LATE')           return 'badge-yellow';
    if (s === 'ABSENT')         return 'badge-red';
    if (s === 'LEAVE')          return 'badge-gray';
    if (s === 'WORK_FROM_HOME') return 'badge-blue';
    return 'badge-gray';
  }

  leaveBadgeClass(status: string): string {
    const s = (status || '').toUpperCase();
    if (s === 'APPROVED')  return 'badge-green';
    if (s === 'PENDING')   return 'badge-yellow';
    if (s === 'REJECTED')  return 'badge-red';
    if (s === 'CANCELLED') return 'badge-gray';
    return 'badge-blue';
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return iso; }
  }

  formatTime(iso: string): string {
    if (!iso) return '--:--';
    try {
      return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch { return iso; }
  }

  formatCurrency(amount: number): string {
    if (amount == null) return '—';
    return '₹' + amount.toLocaleString('en-IN');
  }
}