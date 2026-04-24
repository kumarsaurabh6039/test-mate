// user-service.service.ts (Previously mock-data.service.ts)

import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay, tap, catchError } from 'rxjs/operators';
import { HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs'; // For real-time updates

// =========================================================
// 1. DASHBOARD INTERFACES (Previous components se collected)
// =========================================================

export interface EmployeeInfoResponse {
  empId: string;
  firstName: string;
  surname: string;
  role: string;
  workEmail: string;
  personalEmail: string;
  phone: string;
  department: string;
  reportingTo: string;
  workShift: string;
  address: string;
  profileImageUrl?: string;
}

export interface LeaveBalanceResponse {
  leaveType: string;
  total: number;
  consumed: number;
}

export interface AttendanceSummaryResponse {
  date: string; // YYYY-MM-DD
  duration: string; // HH:MM
}

export interface IndividualAttendanceRecordResponse {
  id: string;
  empId: string;
  date: string; // YYYY-MM-DD
  loginTime: string; // ISO DateTime string
  logoutTime?: string; // ISO DateTime string
}

export interface HolidayResponse {
  date: string; // YYYY-MM-DD
  description: string;
  day: string;
}

export interface TimesheetEntryResponse {
  date: string; // YYYY-MM-DD
  project: string;
  task: string;
  hours: number;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected';
}

export interface AssetResponse {
  id: string;
  name: string;
  category: 'Laptop' | 'Monitor' | 'Accessory' | 'Software';
  serialNumber: string;
  assignedDate: string; // ISO Date String
  status: 'Assigned' | 'In Maintenance' | 'Available';
  icon: string; // Font Awesome class
  color: string; // CSS class
}

export interface TeamMemberResponse {
  id: string;
  name: string;
  designation: string;
  status: 'Online' | 'Offline' | 'In Meeting';
  email: string;
  phone: string;
  imageUrl: string;
  color: string;
}

// Comprehensive Dashboard Data Structure
export interface DashboardData {
  employeeInfo: EmployeeInfoResponse;
  leaveBalances: LeaveBalanceResponse[];
  attendancesummary: AttendanceSummaryResponse[];
  attendances: IndividualAttendanceRecordResponse[];
  holidays: HolidayResponse[];
  assets: AssetResponse[];
  teamMembers: TeamMemberResponse[];
}

// =========================================================
// 2. MOCK DATA STORAGE
// =========================================================

const mockUsers = [
  { empId: 'EMP1001', username: 'arjun', password: 'password', role: 'Employee', token: 'fake-jwt-arjun' },
  { empId: 'HR2001', username: 'hrhead', password: 'password', role: 'HR', token: 'fake-jwt-hr' },
];

const mockAttendanceRecords: IndividualAttendanceRecordResponse[] = [
    // Today's records (for real-time update simulation)
    { id: 'A001', empId: 'EMP1001', date: new Date().toISOString().slice(0, 10), loginTime: new Date(Date.now() - 6 * 3600 * 1000).toISOString(), logoutTime: undefined }, // Currently clocked in (6 hours ago)
    
    // Past records
    { id: 'A002', empId: 'EMP1001', date: '2025-10-24', loginTime: '2025-10-24T09:00:00Z', logoutTime: '2025-10-24T18:00:00Z' },
    { id: 'A003', empId: 'EMP1001', date: '2025-10-23', loginTime: '2025-10-23T09:05:00Z', logoutTime: '2025-10-23T17:55:00Z' },
    { id: 'A004', empId: 'EMP1001', date: '2025-10-22', loginTime: '2025-10-22T08:50:00Z', logoutTime: '2025-10-22T17:45:00Z' },
];


const initialDashboardData: DashboardData = {
  employeeInfo: {
    empId: 'EMP1001',
    firstName: 'Arjun',
    surname: 'Verma',
    role: 'Senior Developer',
    workEmail: 'arjun.verma@workplace.com',
    personalEmail: 'arjun.v@personal.com',
    phone: '9876543210',
    department: 'Software Development',
    reportingTo: 'Priya Sharma',
    workShift: 'Day Shift (9:00 - 18:00)',
    address: '123 Tech Park Road, Bengaluru, India',
    profileImageUrl: 'https://i.pravatar.cc/100?u=EMP1001',
  },
  leaveBalances: [
    { leaveType: 'Casual', total: 10, consumed: 3 },
    { leaveType: 'Sick', total: 8, consumed: 1 },
    { leaveType: 'Annual', total: 15, consumed: 5 },
    { leaveType: 'Unpaid', total: 0, consumed: 0 },
  ],
  attendancesummary: [
    { date: new Date().toISOString().slice(0, 10), duration: '06:00' },
    { date: '2025-10-24', duration: '09:00' },
  ],
  attendances: mockAttendanceRecords,
  holidays: [
    { date: '2025-10-26', description: 'Diwali (Start)', day: 'Sunday' },
    { date: '2025-11-01', description: 'Kannada Rajyotsava', day: 'Friday' },
    { date: '2025-12-25', description: 'Christmas', day: 'Thursday' },
  ],
  assets: [
    { id: 'AST001', name: 'MacBook Pro 14"', category: 'Laptop', serialNumber: 'C02G1234F5F6', assignedDate: '2023-01-15', status: 'Assigned', icon: 'fas fa-laptop', color: 'bg-indigo-500' },
    { id: 'AST002', name: 'Dell 27" 4K Monitor', category: 'Monitor', serialNumber: 'CN-0D5678-GF6F', assignedDate: '2023-01-15', status: 'Assigned', icon: 'fas fa-desktop', color: 'bg-blue-500' },
    { id: 'AST003', name: 'Wireless Keyboard & Mouse', category: 'Accessory', serialNumber: 'AC123456789', assignedDate: '2023-01-20', status: 'In Maintenance', icon: 'fas fa-keyboard', color: 'bg-yellow-500' },
    { id: 'AST004', name: 'VS Code Pro License', category: 'Software', serialNumber: 'SW-VSC-9876', assignedDate: '2023-03-01', status: 'Available', icon: 'fas fa-code', color: 'bg-green-500' },
  ],
  teamMembers: [
    { id: 'E101', name: 'Alok Sharma', designation: 'Software Engineer', status: 'Online', email: 'alok.sharma@antforge.in', phone: '+91 98765 43210', imageUrl: 'https://i.pravatar.cc/150?u=alok', color: 'online' },
    { id: 'EMP1001', name: 'Arjun Verma (You)', designation: 'Sr. Developer', status: 'Online', email: 'arjun.verma@workplace.com', phone: '+91 98765 43210', imageUrl: 'https://i.pravatar.cc/150?u=EMP1001', color: 'online' },
    { id: 'E103', name: 'Vikas Gupta', designation: 'UX Designer', status: 'Offline', email: 'vikas.gupta@antforge.in', phone: '+91 80000 11111', imageUrl: 'https://i.pravatar.cc/150?u=vikas', color: 'offline' },
    { id: 'HR2001', name: 'Priya Sharma', designation: 'HR Head', status: 'In Meeting', email: 'priya.sharma@antforge.in', phone: '+91 91234 56789', imageUrl: 'https://i.pravatar.cc/150?u=HR2001', color: 'meeting' },
  ],
};

const mockTimesheet: TimesheetEntryResponse[] = [
    { date: '2025-10-20', project: 'HR Platform', task: 'Component implementation', hours: 8.0, status: 'Approved' },
    { date: '2025-10-21', project: 'HR Platform', task: 'Bug fixes', hours: 8.5, status: 'Submitted' },
    { date: '2025-10-22', project: 'Internal Audit', task: 'Documentation review', hours: 7.5, status: 'Draft' },
    { date: '2025-10-23', project: 'Marketing Campaign', task: 'Landing page design', hours: 8.0, status: 'Approved' },
];

// =========================================================
// 3. USER SERVICE IMPLEMENTATION (Mocking Backend)
// =========================================================

@Injectable({
  providedIn: 'root'
})
export class UserService {
  isHR(): boolean {
    throw new Error('Method not implemented.');
  }
  isEmployee(): boolean {
    throw new Error('Method not implemented.');
  }
  triggerRefresh() {
    throw new Error('Method not implemented.');
  }
  // Use BehaviorSubject to simulate real-time updates for dashboard data
  // The dashboard component will subscribe to this to get updates when mock data changes (e.g., clock in/out)
  private dashboardDataSubject = new BehaviorSubject<DashboardData>(initialDashboardData);

  // Use BehaviorSubject for assets to simulate the asset component's data
  private assetsSubject = new BehaviorSubject<AssetResponse[]>(initialDashboardData.assets);

  // Use BehaviorSubject for team members to simulate the team component's data
  private teamMembersSubject = new BehaviorSubject<TeamMemberResponse[]>(initialDashboardData.teamMembers);
  
  // Use BehaviorSubject for timesheet to simulate the timesheet component's data
  private timesheetSubject = new BehaviorSubject<TimesheetEntryResponse[]>(mockTimesheet);

  // Use localStorage key for current user ID
  private readonly EMP_ID_KEY = 'currentEmpId';

  // Use localStorage key for current user role
  private readonly ROLE_KEY = 'currentUserRole';

  // State to hold profile edits
  private profileEdits = { ...initialDashboardData.employeeInfo };

  // Placeholder for internal form data (from your old service)
  private formData: any = {};

  // Store profile image URL separately for easy access
  private userProfileImageUrl: string = initialDashboardData.employeeInfo.profileImageUrl || '';

  constructor() {
    this.initializeState();
  }

  // Initialize state with current mock data, primarily to set up the Subjects
  private initializeState(): void {
    const currentData = { ...initialDashboardData };
    this.dashboardDataSubject.next(currentData);
    this.assetsSubject.next(currentData.assets);
    this.teamMembersSubject.next(currentData.teamMembers);
    this.timesheetSubject.next(mockTimesheet);
  }

  // Helper to format HH:MM duration
  private formatSecondsToHHMM(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const formatTime = (num: number) => (num < 10 ? '0' + num : num.toString());
    return `${formatTime(hours)}:${formatTime(minutes)}`;
  }

  // ==================== AUTH METHODS ====================

  login(credentials: { userName: string; password: string }): Observable<any> {
    const user = mockUsers.find(u => u.username === credentials.userName && u.password === credentials.password);

    if (user) {
      // Store EmpId and Role on successful login
      localStorage.setItem(this.EMP_ID_KEY, user.empId);
      localStorage.setItem(this.ROLE_KEY, user.role);

      // Reset subjects with the initial data (for simulation consistency)
      this.initializeState();
      
      return of({
        token: user.token,
        empId: user.empId,
        role: user.role,
      }).pipe(delay(500)); // Simulate network delay
    } else {
      // Simulate API error response
      const errorResponse = new HttpErrorResponse({
        error: { message: 'Invalid username or password.' },
        status: 401
      });
      return throwError(() => errorResponse);
    }
  }

  storeToken(token: string): void {
    localStorage.setItem('authToken', token);
  }

  storeUserDetails(empId: string, role: string): void {
    localStorage.setItem(this.EMP_ID_KEY, empId);
    localStorage.setItem(this.ROLE_KEY, role);
  }

  getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  getEmpIdFromToken(): string | null {
    return localStorage.getItem(this.EMP_ID_KEY);
  }

  getUserRole(): string | null {
    return localStorage.getItem(this.ROLE_KEY);
  }

  // ==================== DASHBOARD DATA METHODS (Real-Time Mocking) ====================

  /**
   * Returns a real-time observable of the entire dashboard data set.
   */
  getEmployeeDashboardData(): Observable<DashboardData> {
    return this.dashboardDataSubject.asObservable().pipe(delay(200));
  }

  // ==================== ATTENDANCE METHODS (Real-Time) ====================

  recordClockIn(): Observable<any> {
    const empId = this.getEmpIdFromToken();
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();

    const currentAttendance = this.dashboardDataSubject.getValue().attendances;
    const lastRecord = currentAttendance.filter(r => r.empId === empId && r.date === today).pop();

    // Check if the user is already clocked in (last record has no logoutTime)
    if (lastRecord && !lastRecord.logoutTime) {
      return throwError(() => new HttpErrorResponse({ error: { message: 'Already clocked in.' }, status: 400 }));
    }

    // Add new clock-in record
    const newRecord: IndividualAttendanceRecordResponse = {
      id: `A${Math.random().toString(36).substring(2, 9)}`,
      empId: empId || 'EMP1001',
      date: today,
      loginTime: now.toISOString(),
      logoutTime: undefined
    };

    const updatedAttendance = [...currentAttendance, newRecord];

    // Update the Subject to trigger real-time updates in the dashboard
    this.updateDashboardData('attendances', updatedAttendance);

    return of({ success: true, message: 'Clocked In successfully.' }).pipe(delay(500));
  }

  recordClockOut(): Observable<any> {
    const empId = this.getEmpIdFromToken();
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();

    const currentAttendance = this.dashboardDataSubject.getValue().attendances;
    const lastRecordIndex = currentAttendance.findIndex(r => r.empId === empId && r.date === today && !r.logoutTime);

    if (lastRecordIndex === -1) {
      return throwError(() => new HttpErrorResponse({ error: { message: 'Not currently clocked in.' }, status: 400 }));
    }

    // Update the last attendance record with the current time
    const updatedAttendance = [...currentAttendance];
    updatedAttendance[lastRecordIndex] = {
      ...updatedAttendance[lastRecordIndex],
      logoutTime: now.toISOString()
    };

    // Calculate duration for the updated record
    const loginTime = new Date(updatedAttendance[lastRecordIndex].loginTime).getTime();
    const durationSeconds = (now.getTime() - loginTime) / 1000;

    // Update attendance summary (mock calculation: adding new duration to existing total)
    let currentSummary = this.dashboardDataSubject.getValue().attendancesummary.find(s => s.date === today);
    let totalSeconds = 0;
    if (currentSummary) {
      const [h, m] = currentSummary.duration.split(':').map(Number);
      totalSeconds = h * 3600 + m * 60;
    }
    const newTotalSeconds = totalSeconds + durationSeconds;
    const newDuration = this.formatSecondsToHHMM(newTotalSeconds);

    const updatedSummary = currentSummary ?
      this.dashboardDataSubject.getValue().attendancesummary.map(s => s.date === today ? { ...s, duration: newDuration } : s) :
      [...this.dashboardDataSubject.getValue().attendancesummary, { date: today, duration: newDuration }];

    // Update the Subject to trigger real-time updates
    this.updateDashboardData('attendances', updatedAttendance);
    this.updateDashboardData('attendancesummary', updatedSummary);

    return of({ success: true, message: 'Clocked Out successfully.' }).pipe(delay(500));
  }

  // ==================== ASSET METHODS (Real-Time) ====================

  getEmployeeAssets(empId: string): Observable<AssetResponse[]> {
    return this.assetsSubject.asObservable().pipe(delay(200));
  }
  
  // Placeholder for asset action logic (e.g., reporting an issue)
  takeAssetAction(asset: AssetResponse | null | 'HR_ASSET'): Observable<any> {
    let message = '';
    if (asset === 'HR_ASSET') {
      message = 'HR Asset Assignment Request Processed (Mock).';
    } else if (asset) {
      // Simulate status change on Report/Return
      this.updateAssetStatus(asset.id, 'In Maintenance');
      message = `Asset ${asset.name} reported for maintenance (Mock).`;
    } else {
      message = 'New Asset Request (Employee) Processed (Mock).';
    }
    return of({ success: true, message: message }).pipe(delay(500));
  }

  // Helper to update asset status in the mock data
  private updateAssetStatus(assetId: string, newStatus: 'Assigned' | 'In Maintenance' | 'Available'): void {
    const currentAssets = this.assetsSubject.getValue();
    const updatedAssets = currentAssets.map(asset =>
      asset.id === assetId ? { ...asset, status: newStatus } : asset
    );
    this.assetsSubject.next(updatedAssets);
  }


  // ==================== TEAM METHODS (Real-Time) ====================

  getTeamMembers(): Observable<TeamMemberResponse[]> {
    return this.teamMembersSubject.asObservable().pipe(delay(200));
  }

  // ==================== TIMESHEET METHODS (Real-Time) ====================

  getTimesheetEntries(empId: string, week: string): Observable<TimesheetEntryResponse[]> {
    return this.timesheetSubject.asObservable().pipe(delay(200));
  }

  submitTimesheet(empId: string): Observable<any> {
    const currentTimesheet = this.timesheetSubject.getValue();
    
    // Check if there are any drafts to submit
    if (currentTimesheet.every(e => e.status !== 'Draft')) {
      return throwError(() => new HttpErrorResponse({ error: { message: 'Timesheet is already submitted or approved.' }, status: 400 }));
    }

    const updatedTimesheet = currentTimesheet.map(entry => {
      if (entry.status === 'Draft') {
        return { ...entry, status: 'Submitted' as 'Submitted' };
      }
      return entry;
    });

    this.timesheetSubject.next(updatedTimesheet);
    return of({ success: true, message: 'Timesheet submitted successfully for review!' }).pipe(delay(500));
  }

  // ==================== PROFILE METHODS (Mock Data with Updates) ====================
  
  getEmployeeInfo(empId: string): Observable<EmployeeInfoResponse> {
    // Return current editable state of profile data
    return of(this.profileEdits).pipe(delay(200));
  }

  updateEmployeeProfile(updatedData: EmployeeInfoResponse): Observable<EmployeeInfoResponse> {
    // Update internal editable state
    this.profileEdits = { ...this.profileEdits, ...updatedData };

    // Update the main dashboard subject for real-time reflection across the app (e.g., header avatar name)
    this.updateDashboardData('employeeInfo', this.profileEdits);

    return of(this.profileEdits).pipe(delay(800)); // Simulate save delay
  }

  // ==================== LEAVE METHODS (Mock) ====================

  applyLeave(payload: any): Observable<any> {
    // Mock successful leave application
    return of({ success: true, message: `Leave for ${payload.fromDate} submitted successfully with status: ${payload.status}` }).pipe(delay(800));
  }

  // ==================== INTERNAL HELPER METHOD ====================

  /**
   * Helper to update a specific part of the DashboardData subject
   */
  private updateDashboardData<K extends keyof DashboardData>(key: K, value: DashboardData[K]): void {
    const currentData = this.dashboardDataSubject.getValue();
    const updatedData = { ...currentData, [key]: value };
    this.dashboardDataSubject.next(updatedData);
  }


  // ==================== OLD SERVICE DATA (Keeping for Onboarding) ====================

  // Login is now handled above

  // Old onboarding URLs (no effect in mock)
  // private loginUrl = 'http://13.233.83.106:8080/authenticate';
  // private onboardingUrl = 'http://13.233.83.106:8080/api/onboard';

  // Old Onboarding methods (Keeping them as they were)

  // ✅ Form step-by-step data saving
  saveStep1(data: any) { this.formData = { ...this.formData, ...data }; }
  saveStep2(data: any) { this.formData = { ...this.formData, ...data }; }
  saveStep3(data: any) { this.formData = { ...this.formData, ...data }; }
  saveStep4(data: any) { this.formData = { ...this.formData, ...data }; }
  saveStep5(data: any) { this.formData = { ...this.formData, ...data }; }
  saveStep6(data: any) { this.formData = { ...this.formData, ...data }; }

  // ✅ Flags
  setConstellationAccepted(value: boolean) {
    this.formData.constellationAccepted = value;
  }

  setAgreedToCulture(value: boolean) {
    this.formData.agreedToCulture = value;
  }

  // ✅ Get all form data
  getFormData() {
    return this.formData;
  }

  // ✅ Final submission (Using a simple mock Observable)
  submitFinalOnboarding(): Observable<any> {
    console.log('Final Onboarding Payload (Mock):', this.formData);
    return of('Onboarding submission successful (Mock)').pipe(delay(1000));
  }

  // ==================== UI MESSAGE HELPER METHOD (For components using alerts) ====================
  
  /**
   * Components like Timesheet should call this helper, and the dashboard component
   * (which hosts the message box) should listen to this subject.
   */
  private messageSubject = new BehaviorSubject<{ message: string, type: 'success' | 'error' | 'warning' } | null>(null);

  /**
   * Allows any service or component to dispatch a message to the main dashboard UI.
   */
  dispatchMessage(message: string, type: 'success' | 'error' | 'warning'): void {
    this.messageSubject.next({ message, type });
    // Auto-clear message after 5 seconds
    setTimeout(() => this.messageSubject.next(null), 5000);
  }

  /**
   * Dashboard component subscribes to this observable to display messages.
   */
  getMessageUpdates(): Observable<{ message: string, type: 'success' | 'error' | 'warning' } | null> {
    return this.messageSubject.asObservable();
  }
}
