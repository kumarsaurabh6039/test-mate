import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError, forkJoin, BehaviorSubject, of } from 'rxjs';
import { catchError, map, switchMap, startWith, tap } from 'rxjs/operators';

// =========================================================================
// INTERFACES (Full Preservation)
// =========================================================================

export interface UpdateUserPayload {
  email?: string;
  empId?: string;
  id?: number;
  oldPassword?: string;
  onboarded?: boolean;
  password?: string;
  role?: string;
  userName?: string;
}

export interface ActivateAccountPayload {
  confirmPassword: string;
  email: string;
  initialPassword: string;
  newPassword: string;
}

export interface LeaveBalanceResponse {
  id: number;
  employeeId: string;
  consumed: number;
  available: number;
  total: number;
  accrued: number;
  annualQuota: number;
  leaveType: string;
}

export interface AttendanceSummaryResponse {
  date: string; 
  firstLogin: string; 
  lastLogout: string; 
  duration: string; 
}

export interface IndividualAttendanceRecordResponse {
  id: number;
  empId: string;
  date: string; 
  loginTime: string; 
  logoutTime: string | null; 
  totalHoursWorked?: number;
  irregularAttendance?: boolean;
  managerApprovalStatus?: string | null;
}

export interface EmployeeInfoResponse {
  id: number;
  surname: string;
  firstName: string;
  middleName: string;
  nickName: string;
  empId: string; 
  gender: string;
  age: number;
  department: string;
  joiningDate: string; 
  personalEmailId: string;
  mobileNumber: string;
  birthday: string; 
  profileImageUrl?: string; 
  holidays?: HolidayResponse[];
  workEmail?: string;
  phone?: string;
  designation?: string; 
  role?: string;
  reportingTo?: string;
  workShift?: string;
  address?: string;
  managerEmpId?: string;
  location?: string;
  onboarded?: boolean;
  isOnboarded?: boolean;
}

export interface EmployeeDTO extends EmployeeInfoResponse {}

export interface HolidayResponse {
  id?: number;
  date: string;
  name: string;
  description: string;
  optional?: boolean; 
  isOptional?: boolean; 
  orgCode?: string;
  year?: number;
  day?: string;
  location?: string;
}

export interface HolidayRequest {
  date: string;
  description: string;
  isOptional: boolean;
  name: string;
  orgCode: string;
}

export interface HolidayCreateRequest extends HolidayRequest {}

export interface PayrollInfoResponse {
  id?: number;
  empId: string;
  bankAccountNumber: string;
  bankName: string;
  ifscCode: string;
  bankingLocation: string;
  panNumber: string;
  uanNumber: string;
  extraField1: string | null;
  extraField2: string | null;
  monthlySalary?: number | null;
  pfAccountNumber?: string | null;
}

export interface AssetResponse {
  id: number;
  name: string;
  type: string; 
  serialNumber: string;
  status: 'ASSIGNED' | 'AVAILABLE' | 'DAMAGED' | 'IN_USE' | 'REQUESTED' | 'PENDING' | 'LOST'; 
  description?: string;
  location?: string;
  assignedTo?: string; 
  employeeId?: string; 
  color?: string; 
  icon?: string; 
}

export interface AssetRequest {
  id?: number;
  name: string;
  description?: string;
  serialNumber: string;
  type: string;
  location: string;
  status: string;
}

export interface AssetCreateRequest extends AssetRequest {
  orgCode?: string;
}

export interface AssetAssignPayload {
  assetId: number;
  assetName?: string;
  assetType?: string;
  assignedBy: string;
  assignedDate?: string;
  employeeId: string;
  employeeName?: string;
  status?: string;
}

export interface AssetAssignRequest extends AssetAssignPayload {}

export interface TimesheetReq {
  id?: number;
  employeeId: string;
  workDate: string; 
  totalHours: number;
  remarks: string;
  checkInTime: { hour: number, minute: number, second: number, nano: number };
  checkOutTime: { hour: number, minute: number, second: number, nano: number };
  status?: string;
}

export interface TimesheetRes {
  id: number;
  employeeId: string;
  workDate: string;
  totalHours: number;
  remarks: string;
  status: string;
  checkInTime: { hour: number, minute: number, second: number, nano: number };
  checkOutTime: { hour: number, minute: number, second: number, nano: number };
}

export interface DashboardData {
  leaveBalances: LeaveBalanceResponse[];
  attendancesummary: AttendanceSummaryResponse[];
  holidays: HolidayResponse[];
  employeeInfo: EmployeeInfoResponse;
  payroll: PayrollInfoResponse; 
  attendances: IndividualAttendanceRecordResponse[];
}

export interface LeaveRequestResponse {
  id: number;
  empId: string;
  employeeName?: string; 
  leaveType: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
}

export interface TeamAttendanceSummary {
    id: number;
    empId: string;
    name: string;
    designation: string;
    status: 'Present' | 'Absent' | 'Leave';
    checkInTime: string | null;
    totalHours: string;
}

export interface ManagerDashboardData {
    pendingLeaves: LeaveRequestResponse[];
    teamAttendance: TeamAttendanceSummary[];
}

export interface TeamRequest {
  teamName?: string;
  name?: string;
  description: string;
  manager?: string;
  managerEmpId?: string;
  members?: string[];
  memberEmpIds?: string[]; 
}

export interface TeamCreateRequest extends TeamRequest {
  orgCode: string;
}

export interface TeamResponseDTO {
  id: number;
  teamName: string;
  name?: string;
  description: string;
  managerEmpId: string;
  memberEmpIds: string[];
}

export interface TeamMemberResponse {
    id: number;
    empId: string;
    name: string;
    designation: string;
    email: string;
    phone: string; 
    status: 'Online' | 'Offline' | 'In Meeting' | 'Active';
    imageUrl: string;
    color: string; 
}

export interface ProfileResponse {
    id: number;
    profileImageUrl: string;
}

export interface PayslipResponse {
    id: number;
    employeeId: string;
    payPeriod: string;
    payDate: string;
    paidDays: number;
    lopDays: number;
    basic: number;
    hra: number;
    conveyanceAllowance: number;
    medicalAllowance: number;
    bonus: number;
    esop: number;
    specialAllowances: number;
    otherEarnings: number;
    pf: number;
    gratuity: number;
    tax: number;
    insurances: number;
    otherDeductions: number;
    grossPay: number;
    netPay: number;
    totalDeductions: number;
}

export interface CreatePayslipRequest {
  employeeId: string;
  payDate?: string;
  payPeriod?: string;
}

export interface OnboardingRequestDTO {
  email: string;
  firstName: string;
  surname: string;
  department?: string;
  empId?: string;
  location?: string;
  manager?: string;
  role?: string;
  mobileNumber?: string;
  designation?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  getToken() {
    throw new Error('Method not implemented.');
  }
  
  private baseUrl = 'https://api.lovahr.com';
  
  // URLs
  private loginUrl = `${this.baseUrl}/authenticate`;
  private refreshTokenUrl = `${this.baseUrl}/refresh-token`;
  private activateAccountUrl = `${this.baseUrl}/api/users/activate-account`; 
  private onboardUserUrl = `${this.baseUrl}/api/employees/onboard`; 
  private onboardInitUrl = `${this.baseUrl}/api/employees/onboard/init`; 
  private updateUserUrl = `${this.baseUrl}/users/update`; 
  private allEmployeesUrl = `${this.baseUrl}/api/employees`;
  private userInfoUrl = `${this.baseUrl}/api/employees/{employeeId}/details`;
  private onboardingUrl = `${this.baseUrl}/api/onboard`;
  private createEmployeeUrl = `${this.baseUrl}/api/employees`; 
  private employeeInfoTemplateUrl = `${this.baseUrl}/api/employees/:employeeId/details`;
  private profileTemplateUrl = `${this.baseUrl}/api/employees/{id}/profile`; 
  
  private clockInUrl = `${this.baseUrl}/api/attendances/login`;
  private clockOutUrl = `${this.baseUrl}/api/attendances/logout`;
  private applyLeaveUrl = `${this.baseUrl}/api/leave-requests/apply/{employeeId}`;
  private leaveBalanceTemplateUrl = `${this.baseUrl}/api/leave-balances/{employeeId}`;
  private attendanceByEmployeeTemplateUrl = `${this.baseUrl}/api/attendances/employee/{empId}`;
  private attendanceSummaryTemplateUrl = `${this.baseUrl}/api/attendances/summary/{empId}`;
  private holidayAllUrl = `${this.baseUrl}/api/holidays`;
  
  private assetsBaseUrl = `${this.baseUrl}/api/assets`; 
  private assetsByIdUrl = `${this.baseUrl}/api/assets/{id}`; 
  private assetsEmployeeUrl = `${this.baseUrl}/api/assets/employee/{empId}`;
  private assetsAssignUrl = `${this.baseUrl}/api/assets/{id}/assign`; 
  
  private allPayslipsUrl = `${this.baseUrl}/api/payslips`;
  private createPayslipUrl = `${this.baseUrl}/api/payslips`; 
  private payslipByEmployeeTemplateUrl = `${this.baseUrl}/api/payslips/employee/{employeeId}`; 
  private timesheetUrl = `${this.baseUrl}/api/timesheets`;

  private teamsUrl = `${this.baseUrl}/api/teams`;
  
  private ctcUrl = `${this.baseUrl}/api/ctc`;
  private payrollRunAllUrl = `${this.baseUrl}/api/payroll/run`;

  // Initialize formData with structure
  private formData: any = {
    personalDetails: {},
    addressDetails: {},
    emergencyContact: {},
    bankingDetails: {},
    documents: {},
    agreedToCulture: false,
    constellationAccepted: false
  };
  
  private authToken: string | null = null;
  private messageSubject = new BehaviorSubject<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  
  // REAL-TIME REFRESH TRIGGER
  private refreshTrigger = new BehaviorSubject<void>(undefined);
  private profilePicSubject = new BehaviorSubject<string | null>(null);

  constructor(private http: HttpClient) {
    this.loadAuthToken();
    this.loadLocalProfilePic(); 
    this.recoverState(); // Restore data on load
  }

  // --- Data Persistence Logic (Safe Storage) ---
  private persistState() {
    try {
      const dataToSave = JSON.parse(JSON.stringify(this.formData));

      // Strip profile photo
      if (dataToSave.addressDetails && dataToSave.addressDetails.uploadedImage) {
        delete dataToSave.addressDetails.uploadedImage;
      }
      if (dataToSave.step2 && dataToSave.step2.uploadedImage) {
        delete dataToSave.step2.uploadedImage;
      }

      // Strip base64 fileData from Paper Boats documents (step4/bankingDetails).
      // Without this, 5 MB+ base64 strings overflow localStorage silently,
      // wiping out all previously saved step data (including surname/firstName).
      const stripDocBase64 = (obj: any) => {
        if (obj && obj.documents && typeof obj.documents === 'object') {
          Object.keys(obj.documents).forEach(k => {
            if (obj.documents[k] && obj.documents[k].fileData) {
              delete obj.documents[k].fileData;
            }
          });
        }
      };
      stripDocBase64(dataToSave.step4);
      stripDocBase64(dataToSave.bankingDetails);

      localStorage.setItem('onboarding_temp_data', JSON.stringify(dataToSave));
      console.log('State persisted to localStorage (images/docs excluded)');
    } catch (e) {
      console.error('Failed to persist onboarding state:', e);
    }
  }

  private recoverState() {
    const saved = localStorage.getItem('onboarding_temp_data');
    if (saved) {
      try {
        const parsedData = JSON.parse(saved);
        this.formData = { ...this.formData, ...parsedData };
        console.log('Onboarding state restored:', this.formData);
      } catch (e) {
        console.error('Failed to restore onboarding state', e);
      }
    }
  }

  // --- Real Time Helpers ---
  public get refresh$() {
    return this.refreshTrigger.asObservable();
  }

  public triggerRefresh(): void {
    this.refreshTrigger.next();
  }

  dispatchMessage(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    this.messageSubject.next({ message, type });
    setTimeout(() => this.messageSubject.next(null), 5000); 
  }

  getMessageUpdates(): Observable<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null> {
    return this.messageSubject.asObservable();
  }
  
  isHR(): boolean { return localStorage.getItem('role') === 'HR'; }
  isEmployee(): boolean { return localStorage.getItem('role') === 'EMPLOYEE'; }
  isManager(): boolean { return localStorage.getItem('role') === 'MANAGER'; }

  private getAuthHeaders(): HttpHeaders {
    this.loadAuthToken(); 
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    if (this.authToken) {
      headers = headers.set('Authorization', 'Bearer ' + this.authToken);
    }
    return headers;
  }

  storeToken(token: string): void {
    this.authToken = token;
    localStorage.setItem('authToken', token);
  }

  storeUserDetails(empId: string, role: string): void {
    localStorage.setItem('empId', empId);
    localStorage.setItem('role', role);
  }

  private loadAuthToken(): void {
    this.authToken = localStorage.getItem('authToken');
  }

  getEmpId(): string | null {
      return localStorage.getItem('empId');
  }

  getAuthOnboardedStatus(): boolean | null {
      const val = localStorage.getItem('isOnboarded');
      if (val === null) return null;
      return val === 'true';
  }

  clearAuthToken(): void {
    this.authToken = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('empId');
    localStorage.removeItem('role');
    localStorage.removeItem('isOnboarded'); 
    localStorage.removeItem('orgCode');
    localStorage.removeItem('onboarding_temp_data');
  }

  // --- Data Handling Methods ---
  getData() {
    return this.formData;
  }

  getFormData() { 
    return this.formData; 
  }

  saveStep1(data: any) {
    this.formData.step1 = data;
    this.formData.personalDetails = { ...this.formData.personalDetails, ...data };
    this.persistState();
  }

  setPersonalDetails(details: any) { 
    this.formData.personalDetails = details;
    this.persistState();
  }

  saveStep2(data: any) {
    this.formData.step2 = data;
    this.formData.addressDetails = data;
    this.persistState();
  }

  setAddressDetails(details: any) { 
    this.formData.addressDetails = details;
    this.persistState(); 
  }

  saveStep3(data: any) {
    this.formData.step3 = data;
    this.formData.emergencyContact = data;
    this.persistState();
  }

  setEmergencyContact(contact: any) { 
    this.formData.emergencyContact = contact;
    this.persistState(); 
  }

  saveStep4(data: any) {
    this.formData.step4 = data;
    this.formData.bankingDetails = data;
    this.persistState();
  }

  setBankingDetails(details: any) { 
    this.formData.bankingDetails = details;
    this.persistState(); 
  }

  saveStep5(data: any) {
    this.formData.step5 = data;
    this.formData.documents = data;
    this.persistState();
  }

  setDocuments(documents: any) { 
    this.formData.documents = documents;
    this.persistState(); 
  }

  setAgreedToCulture(value: boolean) { 
    this.formData.agreedToCulture = value;
    this.persistState();
  }

  setConstellationAccepted(value: boolean) {
    this.formData.constellationAccepted = value;
    this.persistState();
  }

  clearFormData() { 
    this.formData = {}; 
    localStorage.removeItem('onboarding_temp_data');
  }
  
  // --- Updated Submit Logic (Robust & Safe) ---
  submitFinalOnboarding(): Observable<any> {
    const headers = this.getAuthHeaders();
    console.log('Final Submission - Raw FormData:', this.formData);

    // personalDetails is initialized as {} so it is always truthy even when empty.
    // Prefer step1 (saved by SignUpStep1Component) if it has actual data.
    const personal = (this.formData.step1 && this.formData.step1.surname)
      ? this.formData.step1
      : (this.formData.personalDetails && this.formData.personalDetails.surname)
        ? this.formData.personalDetails
        : {};
    const step2 = this.formData.addressDetails || this.formData.step2 || {}; 
    const emergency = this.formData.emergencyContact || this.formData.step3 || {};
    const bankInfo = this.formData.documents || this.formData.step5 || this.formData.bankingDetails || {}; 

    const missingFields = [];
    
    if (!step2.department) missingFields.push('Department (Step 2)');
    if (!bankInfo.bankAccountNumber && !bankInfo.accountNumber) missingFields.push('Bank Account Number (Stream of Trust)');

    if (missingFields.length > 0) {
        const err = `Data Missing: ${missingFields.join(', ')}. Please go back and fill these sections.`;
        console.error(err);
        this.dispatchMessage(err, 'error');
        return throwError(() => new Error(err));
    }

    const toNumber = (val: any) => {
        if (val === null || val === undefined || val === '') return 0;
        const num = Number(val);
        return isNaN(num) ? 0 : num;
    };

    const toStr = (val: any) => val ? String(val).trim() : '';
    const toStrOrNull = (val: any) => (val && String(val).trim().length > 0) ? String(val).trim() : null;

    const finalPayload = {
      age: toNumber(personal.age),
      firstName: toStr(personal.firstName),
      surname: toStr(personal.surname),
      middleName: toStr(personal.middleName),
      nickName: toStr(personal.nickName),
      gender: toStr(personal.gender),
      designation: toStr(step2.designation || step2.department),
      
      // Default to today's date if joiningDate is not present in step2 data
      joiningDate: toStr(step2.joiningDate || new Date().toISOString().split('T')[0]),
      
      birthday: toStr(step2.birthday),
      personalEmailId: toStrOrNull(step2.personalEmailId),
      mobileNumber: toStrOrNull(step2.mobileNumber),
      location: toStr(step2.location || bankInfo.bankingLocation || 'India'),
      emergencyName: toStr(emergency.emergencyName || emergency.name),
      emergencyContact: toStr(emergency.emergencyContact || emergency.contactNumber),
      relationship: toStr(emergency.relationship), 
      familyMember1: toStr(emergency.familyMembers?.[0]?.familyMemberName || emergency.familyMember1),
      familyMember2: toStr(emergency.familyMembers?.[1]?.familyMemberName),
      familyMembers: Array.isArray(emergency.familyMembers) 
        ? emergency.familyMembers.map((m: any) => ({
            familyMemberName: toStr(m.familyMemberName),
            age: toNumber(m.age),
            gender: toStr(m.gender),
            relationship: toStr(m.relationship)
          }))
        : [],
      bankAccountNumber: toStrOrNull(bankInfo.bankAccountNumber || bankInfo.accountNumber),
      bankName: toStr(bankInfo.bankName),
      ifscCode: toStrOrNull(bankInfo.ifscCode),
      bankingLocation: toStr(bankInfo.bankingLocation),
      panNumber: toStrOrNull(bankInfo.panNumber),
      uanNumber: toStrOrNull(bankInfo.uanNumber),
    };

    console.log('Payload sending to Backend:', finalPayload);
    localStorage.removeItem('onboarding_temp_data');

    // Send all scalar fields as URL query parameters.
    let params = new HttpParams();
    const fields: Record<string, any> = {
      age:              finalPayload.age,
      firstName:        finalPayload.firstName,
      surname:          finalPayload.surname,
      middleName:       finalPayload.middleName,
      nickName:         finalPayload.nickName,
      gender:           finalPayload.gender,
      designation:      finalPayload.designation,
      joiningDate:      finalPayload.joiningDate,
      birthday:         finalPayload.birthday,
      personalEmailId:  finalPayload.personalEmailId,
      mobileNumber:     finalPayload.mobileNumber,
      location:         finalPayload.location,
      emergencyName:    finalPayload.emergencyName,
      emergencyContact: finalPayload.emergencyContact,
      relationship:     finalPayload.relationship,
      familyMember1:    finalPayload.familyMember1,
      familyMember2:    finalPayload.familyMember2,
      bankAccountNumber: finalPayload.bankAccountNumber,
      bankName:         finalPayload.bankName,
      ifscCode:         finalPayload.ifscCode,
      bankingLocation:  finalPayload.bankingLocation,
      panNumber:        finalPayload.panNumber,
      uanNumber:        finalPayload.uanNumber,
    };
    Object.keys(fields).forEach(key => {
      const v = fields[key];
      if (v !== null && v !== undefined && v !== '') {
        params = params.set(key, String(v));
      }
    });

    console.log('Query params being sent:', params.toString());

    return this.http.put(this.onboardingUrl, null, { headers, params, responseType: 'text' }).pipe(
      map(response => {
        try {
          return JSON.parse(response);
        } catch (e) {
          return response;
        }
      })
    );
  }

  // ------------------------------------

  login(credentials: { userName: string; password: string }): Observable<any> {
    const payload = {
      userName: credentials.userName,
      password: credentials.password
    };
    return this.http.post(this.loginUrl, payload).pipe(
      map((response: any) => {
        if (response && response.token) {
          this.storeToken(response.token);
          if (response.isOnboarded !== undefined) localStorage.setItem('isOnboarded', String(response.isOnboarded));
          else if (response.onboarded !== undefined) localStorage.setItem('isOnboarded', String(response.onboarded));
          if (response.empId) localStorage.setItem('empId', response.empId);
          if (response.role) localStorage.setItem('role', response.role);
          if (response.orgCode) localStorage.setItem('orgCode', response.orgCode);
        }
        return response;
      }),
      catchError(this.handleError.bind(this)) 
    );
  }

  refreshToken(): Observable<any> {
    return this.http.post(this.refreshTokenUrl, {}, { headers: this.getAuthHeaders() }).pipe(
      tap((response: any) => {
        if (response && response.token) {
          this.storeToken(response.token);
          console.log('Token refreshed successfully via API');
        }
      }),
      catchError(this.handleError.bind(this))
    );
  }

  getOrgCode(): Observable<string> {
    const storedOrgCode = localStorage.getItem('orgCode');
    if (storedOrgCode) return of(storedOrgCode);
    return of('DEFAULT'); 
  }

  getOnboardInit(): Observable<any> {
    return this.http.get<any>(this.onboardInitUrl, { headers: this.getAuthHeaders() }).pipe(
        catchError(this.handleError.bind(this))
    );
  }
  
  getNextEmployeeId(): Observable<string> {
    return this.getOnboardInit().pipe(
        map(res => res.empId || 'EMP-000')
    );
  }

  updateUser(userPayload: UpdateUserPayload): Observable<any> {
    return this.http.put(this.updateUserUrl, userPayload, { 
      headers: this.getAuthHeaders(), 
      responseType: 'text' 
    }).pipe(
      tap(() => {
        this.dispatchMessage('User updated successfully!', 'success');
        this.triggerRefresh();
      }),
      catchError(this.handleError.bind(this))
    );
  }

  activateAccount(payload: ActivateAccountPayload): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post(this.activateAccountUrl, payload, { headers, responseType: 'text' }).pipe(
      tap(() => {
        this.dispatchMessage('Account activated successfully!', 'success');
      }),
      catchError(this.handleError.bind(this))
    );
  }

  getEmpIdFromToken(): string | null {
    const storedEmpId = localStorage.getItem('empId');
    if (storedEmpId) return storedEmpId;
    if (!this.authToken) this.loadAuthToken();
    if (this.authToken) {
      try {
        const payload = JSON.parse(atob(this.authToken.split('.')[1]));
        const empIdFromToken = payload.empId || payload.employeeId || null;
        if (empIdFromToken) localStorage.setItem('empId', empIdFromToken);
        return empIdFromToken;
      } catch (e) {
        console.error('Error decoding token:', e);
        return null;
      }
    }
    return null;
  }

  private getLocalISOStringWithoutZ(date: Date): string {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, -1);
  }

  loadLocalProfilePic() {
    const empId = this.getEmpIdFromToken();
    if(empId) {
      const storedPic = localStorage.getItem(`profile_pic_${empId}`);
      this.profilePicSubject.next(storedPic);
    }
  }

  getProfilePicUpdate(): Observable<string | null> {
    return this.profilePicSubject.asObservable();
  }

  uploadProfilePicLocally(file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      const empId = this.getEmpIdFromToken();
      if(empId) {
        localStorage.setItem(`profile_pic_${empId}`, base64String);
        this.profilePicSubject.next(base64String); 
        this.dispatchMessage('Profile picture updated successfully!', 'success');
      }
    };
    reader.readAsDataURL(file);
  }

  public getEmployeeDashboardData(): Observable<DashboardData> {
    return this.getUserInfo();
  }

  public getUserInfo(): Observable<DashboardData> {
    return this.refreshTrigger.pipe(
      startWith(undefined), 
      switchMap(() => {
        const employeeId = this.getEmpIdFromToken();
        if (!employeeId) {
            this.dispatchMessage('Session expired. Please log in.', 'error');
            return of(null as any);
        }
        const url = this.userInfoUrl.replace('{employeeId}', employeeId);
        return this.http.get<DashboardData>(url, { headers: this.getAuthHeaders() }).pipe(
          catchError((err) => {
             this.handleError(err);
             return of(null as any);
          })
        );
      })
    );
  }

  onboardEmployee(userPayload: OnboardingRequestDTO): Observable<any> {
    return this.onboardUser(userPayload);
  }

  onboardUser(userPayload: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(this.onboardUserUrl, userPayload, { headers }).pipe(
      tap((response: any) => {
        this.dispatchMessage('User onboarded successfully!', 'success');
        localStorage.setItem('isOnboarded', 'true'); 
        this.triggerRefresh();
      }),
      catchError(this.handleError.bind(this))
    );
  }

  createEmployee(employeeData: any): Observable<any> {
    return this.http.post(this.createEmployeeUrl, employeeData, { headers: this.getAuthHeaders() }).pipe(
        tap(() => {
            this.dispatchMessage('Employee created successfully!', 'success');
            this.triggerRefresh();
        }),
        catchError(this.handleError.bind(this))
    );
  }

  // --- CTC METHODS ---

  createCtc(ctcData: any): Observable<any> {
    return this.http.post(this.ctcUrl, ctcData, { headers: this.getAuthHeaders() }).pipe(
        tap(() => {
            this.dispatchMessage('CTC Created Successfully', 'success');
            this.triggerRefresh();
        }),
        catchError(this.handleError.bind(this))
    );
  }

  getCtcByEmployeeId(employeeId: string): Observable<any> {
    const url = `${this.ctcUrl}/employee/${employeeId}`;
    return this.http.get<any>(url, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  updateCtc(id: number, ctcData: any): Observable<any> {
    const url = `${this.ctcUrl}/${id}`;
    return this.http.put<any>(url, ctcData, { headers: this.getAuthHeaders() }).pipe(
      tap(() => {
        this.dispatchMessage('CTC Updated Successfully', 'success');
        this.triggerRefresh();
      }),
      catchError(this.handleError.bind(this))
    );
  }

  // --- PAYROLL RUN METHODS ---

  runPayrollAll(month: number, year: number): Observable<any> {
    const url = `${this.payrollRunAllUrl}?month=${month}&year=${year}`;
    return this.http.post(url, {}, { headers: this.getAuthHeaders() }).pipe(
      tap(() => {
          this.dispatchMessage('Bulk payroll run initiated successfully', 'success');
          this.triggerRefresh();
      }),
      catchError(this.handleError.bind(this))
    );
  }

  runPayrollForAll(month: number, year: number): Observable<any> {
      return this.runPayrollAll(month, year);
  }

  runPayroll(empId: string, month: number, year: number): Observable<any> {
    const url = `${this.baseUrl}/api/payroll/run/${empId}?month=${month}&year=${year}`;
    return this.http.post(url, {}, { headers: this.getAuthHeaders() }).pipe(
      tap(() => {
          this.dispatchMessage(`Payroll run successfully for ${empId}`, 'success');
          this.triggerRefresh();
      }),
      catchError(this.handleError.bind(this))
    );
  }
  
  runPayrollForEmployee(empId: string, month: number, year: number): Observable<any> {
      return this.runPayroll(empId, month, year);
  }
  
  // --- ATTENDANCE & LEAVE ---

  recordClockIn(): Observable<any> {
    const employeeId = this.getEmpIdFromToken();
    if (!employeeId) return throwError(() => new Error('Employee ID not found.'));
    const now = new Date();
    const payload = {
      empId: employeeId,
      date: now.toISOString().slice(0, 10), 
      loginTime: this.getLocalISOStringWithoutZ(now)
    };
    return this.http.post(this.clockInUrl, payload, { headers: this.getAuthHeaders() }).pipe(
      tap(() => { this.dispatchMessage('Clock-In Successful!', 'success'); this.triggerRefresh(); }),
      catchError(this.handleError.bind(this))
    );
  }

  recordClockOut(): Observable<any> {
    const employeeId = this.getEmpIdFromToken();
    if (!employeeId) return throwError(() => new Error('Employee ID not found.'));
    const payload = { empId: employeeId, logoutTime: this.getLocalISOStringWithoutZ(new Date()) };
    return this.http.post(this.clockOutUrl, payload, { headers: this.getAuthHeaders() }).pipe(
      tap(() => { this.dispatchMessage('Clock-Out Successful!', 'success'); this.triggerRefresh(); }),
      catchError(this.handleError.bind(this))
    );
  }

  applyLeave(employeeId: string, leaveRequest: any): Observable<any> {
    const url = this.applyLeaveUrl.replace('{employeeId}', employeeId);
    return this.http.post(url, leaveRequest, { headers: this.getAuthHeaders() }).pipe(
      tap(() => {
        this.dispatchMessage('Leave Application Submitted!', 'success');
        this.triggerRefresh(); 
      }),
      catchError(this.handleError.bind(this))
    );
  }

  // --- TEAMS ---

  getAllTeams(): Observable<TeamResponseDTO[]> {
    return this.http.get<any>(this.teamsUrl, { headers: this.getAuthHeaders() }).pipe(
      map(response => {
        let data = [];
        if (Array.isArray(response)) data = response;
        else if (response && Array.isArray(response.teams)) data = response.teams;
        else if (response && Array.isArray(response.data)) data = response.data;
        return data;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  createTeam(teamData: TeamCreateRequest): Observable<TeamResponseDTO> {
    return this.http.post<TeamResponseDTO>(this.teamsUrl, teamData, { headers: this.getAuthHeaders() }).pipe(
        tap(() => {
            this.dispatchMessage('Team Created Successfully!', 'success');
            this.triggerRefresh();
        }),
        catchError(this.handleError.bind(this))
    );
  }

  updateTeam(id: number, teamData: any): Observable<TeamResponseDTO> {
    const url = `${this.teamsUrl}/${id}`; 
    return this.http.put<TeamResponseDTO>(url, teamData, { headers: this.getAuthHeaders() }).pipe(
      tap(() => {
        this.dispatchMessage('Team Updated Successfully!', 'success');
        this.triggerRefresh();
      }),
      catchError(this.handleError.bind(this))
    );
  }

  deleteTeam(id: number): Observable<any> {
    const url = `${this.teamsUrl}/${id}`;
    return this.http.delete(url, { headers: this.getAuthHeaders() }).pipe(
      tap(() => {
        this.dispatchMessage('Team Deleted Successfully!', 'success');
        this.triggerRefresh();
      }),
      catchError(this.handleError.bind(this))
    );
  }

  getTeamMembers(): Observable<TeamMemberResponse[]> {
      const empId = this.getEmpIdFromToken();
      if (!empId) return of([]);
      const teamsUrl = `${this.baseUrl}/api/teams/employee/${empId}`;
      const allEmployeesUrl = this.allEmployeesUrl;
      return forkJoin({
          teams: this.http.get<TeamResponseDTO[]>(teamsUrl, { headers: this.getAuthHeaders() }).pipe(catchError(() => of([]))),
          employees: this.http.get<EmployeeInfoResponse[]>(allEmployeesUrl, { headers: this.getAuthHeaders() }).pipe(catchError(() => of([])))
      }).pipe(
          map(({ teams, employees }) => {
              if (!teams || teams.length === 0) return [];
              const uniqueMemberIds = new Set<string>();
              teams.forEach(team => {
                  if (team.memberEmpIds) team.memberEmpIds.forEach(id => uniqueMemberIds.add(id));
                  if (team.managerEmpId) uniqueMemberIds.add(team.managerEmpId);
              });
              return employees.filter(emp => uniqueMemberIds.has(emp.empId)).map(emp => ({
                  id: emp.id,
                  empId: emp.empId,
                  name: `${emp.firstName} ${emp.surname}`,
                  designation: emp.designation || 'Team Member',
                  email: emp.workEmail || emp.personalEmailId,
                  phone: emp.mobileNumber || 'N/A',
                  status: 'Active',
                  imageUrl: emp.profileImageUrl || `https://ui-avatars.com/api/?name=${emp.firstName}+${emp.surname}&background=E0E7FF&color=4338CA`,
                  color: 'online'
              } as TeamMemberResponse));
          }),
          catchError(this.handleError.bind(this))
      );
  }

  // --- EMPLOYEES ---

  getAllEmployees(): Observable<EmployeeInfoResponse[]> {
    return this.http.get<any>(this.allEmployeesUrl, { headers: this.getAuthHeaders() }).pipe(
      map(response => {
        if (Array.isArray(response)) return response;
        if (response && Array.isArray(response.users)) return response.users; 
        if (response && Array.isArray(response.data)) return response.data;
        if (response && Array.isArray(response.employees)) return response.employees;
        return [];
      }),
      catchError(this.handleError.bind(this))
    );
  }

  getEmployeeInfo(): Observable<EmployeeInfoResponse> {
    const employeeId = this.getEmpIdFromToken();
    if (!employeeId) return throwError(() => new Error('Employee ID not found.'));
    const url = this.employeeInfoTemplateUrl.replace(':employeeId', employeeId);
    return this.http.get<EmployeeInfoResponse>(url, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError.bind(this))
    );
  }
  
  updateEmployeeProfile(empIdOrPayload: any, payload?: any): Observable<EmployeeInfoResponse> {
      let finalPayload = payload;
      let empId = empIdOrPayload;
      if (typeof empIdOrPayload === 'object' && !payload) {
          finalPayload = empIdOrPayload;
          empId = finalPayload.empId;
      }
      const url = `${this.baseUrl}/api/employees/${empId}/profile`; 
      return this.http.put<EmployeeInfoResponse>(url, finalPayload, { headers: this.getAuthHeaders() }).pipe(
          tap(() => { this.dispatchMessage('Profile updated successfully.', 'success'); this.triggerRefresh(); }),
          catchError(this.handleError.bind(this))
      );
  }

  getEmployeeProfile(): Observable<ProfileResponse> {
    const employeeId = this.getEmpIdFromToken();
    if (!employeeId) return of({ id: -1, profileImageUrl: '' } as ProfileResponse); 
    const url = this.profileTemplateUrl.replace('{id}', employeeId); 
    return this.http.get<ProfileResponse>(url, { headers: this.getAuthHeaders() }).pipe(
        catchError(() => of({ id: -1, profileImageUrl: '' } as ProfileResponse))
    );
  }

  // --- LEAVE & ATTENDANCE ---

  getLeaveBalances(): Observable<LeaveBalanceResponse[]> {
    const employeeId = this.getEmpIdFromToken();
    if (!employeeId) return throwError(() => new Error('Employee ID not found.'));
    const url = this.leaveBalanceTemplateUrl.replace('{employeeId}', employeeId);
    return this.http.get<LeaveBalanceResponse[]>(url, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  getAttendanceRecords(): Observable<IndividualAttendanceRecordResponse[]> {
    const employeeId = this.getEmpIdFromToken();
    if (!employeeId) return throwError(() => new Error('Employee ID not found.'));
    const url = this.attendanceByEmployeeTemplateUrl.replace('{empId}', employeeId);
    return this.http.get<IndividualAttendanceRecordResponse[]>(url, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  getAttendanceSummary(): Observable<AttendanceSummaryResponse[]> {
    const employeeId = this.getEmpIdFromToken();
    if (!employeeId) return throwError(() => new Error('Employee ID not found.'));
    const url = this.attendanceSummaryTemplateUrl.replace('{empId}', employeeId);
    return this.http.get<AttendanceSummaryResponse[]>(url, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // --- HOLIDAYS ---

  getAllHolidays(): Observable<HolidayResponse[]> {
    return this.http.get<any>(this.holidayAllUrl, { headers: this.getAuthHeaders() }).pipe(
      map(response => {
        if (Array.isArray(response)) return response;
        if (response && Array.isArray(response.holidays)) return response.holidays;
        if (response && Array.isArray(response.data)) return response.data;
        return [];
      }),
      catchError(this.handleError.bind(this))
    );
  }

  createHoliday(holidayData: any): Observable<any> {
    return this.http.post(this.holidayAllUrl, holidayData, { headers: this.getAuthHeaders() }).pipe(
      tap(() => { this.dispatchMessage('Holiday Created Successfully', 'success'); this.triggerRefresh(); }),
      catchError(this.handleError.bind(this))
    );
  }

  updateHoliday(id: number, holidayData: any): Observable<any> {
    const url = `${this.holidayAllUrl}/${id}`;
    return this.http.put(url, holidayData, { headers: this.getAuthHeaders() }).pipe(
      tap(() => { this.dispatchMessage('Holiday Updated Successfully', 'success'); this.triggerRefresh(); }),
      catchError(this.handleError.bind(this))
    );
  }

  // --- PAYSLIPS ---

  getPayslips(employeeId: string): Observable<PayslipResponse[]> {
    if (!employeeId) return throwError(() => new Error('Employee ID not found.'));
    const url = this.payslipByEmployeeTemplateUrl.replace('{employeeId}', employeeId);
    return this.http.get<PayslipResponse[]>(url, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError.bind(this))
    );
  }
  
  getAllPayslips(): Observable<PayslipResponse[]> {
    return this.http.get<PayslipResponse[]>(this.allPayslipsUrl, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  createPayslip(payslipData: CreatePayslipRequest): Observable<any> {
    return this.http.post(this.createPayslipUrl, payslipData, { headers: this.getAuthHeaders() }).pipe(
      tap(() => { this.dispatchMessage(`Payslip created for ${payslipData.employeeId}`, 'success'); this.triggerRefresh(); }),
      catchError(this.handleError.bind(this))
    );
  }

  // --- MANAGER OPERATIONS ---

  getManagerLeaveRequests(managerEmpId: string): Observable<LeaveRequestResponse[]> {
    const url = `${this.baseUrl}/api/leave-requests/manager/${managerEmpId}`;
    return this.http.get<LeaveRequestResponse[]>(url, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  approveLeave(leaveRequestId: number, managerEmpId: string): Observable<any> {
    const url = `${this.baseUrl}/api/leave-requests/approve/${leaveRequestId}/manager/${managerEmpId}`;
    return this.http.put(url, {}, { headers: this.getAuthHeaders() }).pipe(
      tap(() => { this.dispatchMessage('Leave Approved Successfully', 'success'); this.triggerRefresh(); }),
      catchError(this.handleError.bind(this))
    );
  }

  rejectLeave(leaveRequestId: number, managerEmpId: string): Observable<any> {
    const url = `${this.baseUrl}/api/leave-requests/cancel/${leaveRequestId}/manager/${managerEmpId}`;
    return this.http.put(url, {}, { headers: this.getAuthHeaders() }).pipe(
      tap(() => { this.dispatchMessage('Leave Rejected Successfully', 'success'); this.triggerRefresh(); }),
      catchError(this.handleError.bind(this))
    );
  }

  getTeamAttendanceSummary(): Observable<TeamAttendanceSummary[]> {
    const managerId = this.getEmpIdFromToken();
    if (!managerId) return throwError(() => new Error('Manager ID not found.'));
    return this.http.get<TeamAttendanceSummary[]>(`${this.baseUrl}/api/attendances/team-summary`, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError.bind(this))
    );
  }
  
  public getManagerDashboardData(): Observable<ManagerDashboardData> {
    return this.refreshTrigger.pipe(
      startWith(undefined), 
      switchMap(() => {
        if (!this.isManager() && !this.isHR()) return of({ pendingLeaves: [], teamAttendance: [] });
        const managerId = this.getEmpIdFromToken() || '';
        return forkJoin({
          pendingLeaves: this.getManagerLeaveRequests(managerId), 
          teamAttendance: this.getTeamAttendanceSummary().pipe(catchError(() => of([]))),
        }).pipe(
          map((results) => ({ pendingLeaves: results.pendingLeaves, teamAttendance: results.teamAttendance } as ManagerDashboardData)),
          catchError(() => of({ pendingLeaves: [], teamAttendance: [] } as ManagerDashboardData))
        );
      })
    );
  }

  // --- ASSETS ---

  getAllAssets(): Observable<AssetResponse[]> {
    return this.http.get<any>(this.assetsBaseUrl, { headers: this.getAuthHeaders() }).pipe(
      map(response => {
        let data: AssetResponse[] = [];
        if (Array.isArray(response)) data = response;
        else if (response && Array.isArray(response.assets)) data = response.assets;
        else if (response && Array.isArray(response.data)) data = response.data;
        return data;
      }),
      map((assets: AssetResponse[]) => assets.map(asset => this.enrichAssetWithUI(asset))),
      catchError(this.handleError.bind(this))
    );
  }

  getEmployeeAssets(empId: string): Observable<AssetResponse[]> {
      const url = this.assetsEmployeeUrl.replace('{empId}', empId);
      return this.http.get<any>(url, { headers: this.getAuthHeaders() }).pipe(
          map(response => {
            let data: AssetResponse[] = [];
            if (Array.isArray(response)) data = response;
            else if (response && Array.isArray(response.assets)) data = response.assets;
            else if (response && Array.isArray(response.data)) data = response.data;
            return data;
          }),
          map((assets: AssetResponse[]) => assets.map(asset => this.enrichAssetWithUI(asset))),
          catchError(this.handleError.bind(this))
      );
  }

  createAsset(payload: AssetRequest): Observable<AssetResponse> {
    return this.http.post<AssetResponse>(this.assetsBaseUrl, payload, { headers: this.getAuthHeaders() }).pipe(
      tap(() => { this.dispatchMessage('Asset created successfully', 'success'); this.triggerRefresh(); }),
      catchError(this.handleError.bind(this))
    );
  }

  updateAsset(assetId: number, payload: any): Observable<AssetResponse> {
    const url = this.assetsByIdUrl.replace('{id}', assetId.toString());
    return this.http.put<AssetResponse>(url, payload, { headers: this.getAuthHeaders() }).pipe(
       tap(() => { this.dispatchMessage('Asset updated successfully', 'success'); this.triggerRefresh(); }),
       catchError(this.handleError.bind(this))
    );
  }

  assignAsset(assetId: number, payload: AssetAssignPayload): Observable<any> {
    const url = this.assetsAssignUrl.replace('{id}', assetId.toString());
    return this.http.post(url, payload, { headers: this.getAuthHeaders() }).pipe(
      tap(() => { this.dispatchMessage(`Asset assigned to ${payload.employeeId}`, 'success'); this.triggerRefresh(); }),
      catchError(this.handleError.bind(this))
    );
  }

  returnAsset(assetId: number): Observable<any> {
    const url = this.assetsByIdUrl.replace('{id}', assetId.toString());
    const payload = { status: 'AVAILABLE', assignedTo: null, employeeId: null, assignedBy: null };
    return this.http.put<AssetResponse>(url, payload, { headers: this.getAuthHeaders() }).pipe(
       tap(() => { this.dispatchMessage('Asset returned successfully', 'success'); this.triggerRefresh(); }),
       catchError(this.handleError.bind(this))
    );
  }

  deleteAsset(assetId: number): Observable<any> {
    const url = this.assetsByIdUrl.replace('{id}', assetId.toString());
    return this.http.delete(url, { headers: this.getAuthHeaders() }).pipe(
      tap(() => { this.dispatchMessage('Asset deleted successfully', 'success'); this.triggerRefresh(); }),
      catchError(this.handleError.bind(this))
    );
  }

  private enrichAssetWithUI(asset: AssetResponse): AssetResponse {
    const type = (asset.type || 'unknown').toLowerCase();
    let color = 'bg-gray-500'; let icon = 'fas fa-box';
    if (type.includes('laptop')) { color = 'bg-blue-500'; icon = 'fas fa-laptop'; }
    else if (type.includes('phone')) { color = 'bg-green-500'; icon = 'fas fa-mobile-alt'; }
    else if (type.includes('monitor')) { color = 'bg-yellow-500'; icon = 'fas fa-desktop'; }
    else if (type.includes('chair')) { color = 'bg-orange-500'; icon = 'fas fa-chair'; }
    return { ...asset, color, icon, status: asset.status || 'AVAILABLE' };
  }

  // --- DOCUMENTS LOGIC ---

  uploadDocument(file: File, documentType: string, documentCategory: string, comment?: string): Observable<any> {
    const url = `${this.baseUrl}/api/views-documents/upload`;
    const formData = new FormData();
    formData.append('file', file);

    // Attach comment to formData just in case backend expects it here
    if (comment) {
      formData.append('comment', comment);
      formData.append('remark', comment);
      formData.append('description', comment);
    }

    // Add other details as query parameters according to Swagger
    let params = new HttpParams();
    if (documentType) params = params.set('documentType', documentType);
    if (documentCategory) params = params.set('documentCategory', documentCategory);
    if (comment) {
      params = params.set('comment', comment);
      params = params.set('remark', comment);
      params = params.set('description', comment);
    }

    // Browser will automatically set boundary headers for multipart/form-data
    // We only need to set the Authorization header without fixing 'Content-Type'
    let headers = new HttpHeaders();
    const token = localStorage.getItem('authToken');
    if (token) {
      headers = headers.set('Authorization', 'Bearer ' + token);
    }

    return this.http.post(url, formData, { headers, params }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // --- TIMESHEETS ---

  getAllTimesheets(): Observable<TimesheetRes[]> {
    return this.http.get<TimesheetRes[]>(this.timesheetUrl, { headers: this.getAuthHeaders() }).pipe(catchError(this.handleError.bind(this)));
  }

  createTimesheet(data: TimesheetReq): Observable<TimesheetRes> {
    return this.http.post<TimesheetRes>(this.timesheetUrl, data, { headers: this.getAuthHeaders() }).pipe(
      tap(() => { this.dispatchMessage('Timesheet submitted successfully!', 'success'); this.triggerRefresh(); }),
      catchError(this.handleError.bind(this))
    );
  }

  updateTimesheet(id: number, data: TimesheetReq): Observable<TimesheetRes> {
    const url = `${this.timesheetUrl}/${id}`;
    return this.http.put<TimesheetRes>(url, data, { headers: this.getAuthHeaders() }).pipe(
      tap(() => { this.dispatchMessage('Timesheet updated successfully!', 'success'); this.triggerRefresh(); }),
      catchError(this.handleError.bind(this))
    );
  }

  deleteTimesheet(id: number): Observable<any> {
    const url = `${this.timesheetUrl}/${id}`;
    return this.http.delete(url, { headers: this.getAuthHeaders() }).pipe(
      tap(() => { this.dispatchMessage('Timesheet deleted successfully!', 'success'); this.triggerRefresh(); }),
      catchError(this.handleError.bind(this))
    );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unexpected error occurred!';
    if (error.error instanceof ErrorEvent) errorMessage = `Network error: ${error.error.message}`;
    else {
       if (error.status === 401 || error.status === 403) errorMessage = 'Authentication failed. Please log in.';
       else if(error.error && typeof error.error === 'string') errorMessage = error.error;
       else if(error.error && error.error.message) errorMessage = error.error.message;
       else errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    if(error.status !== 404 && !error.url?.includes('poll')) this.dispatchMessage(errorMessage, 'error');
    return throwError(() => new Error(errorMessage));
  }
}