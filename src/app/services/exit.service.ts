import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

// --- Interfaces ---

export interface ExitRequestDTO {
  empId: string;
  exitType: string;
  reason: string;
  resignationDate: string;
  lastWorkingDate: string;
  noticePeriodDays: number;
  earlyReleaseRequested: boolean;
  noticeBuyoutAmount?: number;
}

export interface ExitApprovalDTO {
  approverEmpId: string;
  approvalStatus: 'APPROVED' | 'REJECTED';
  comments: string;
  isRehireEligible?: boolean;
  rehireComments?: string;
}

export interface EmployeeExitRequest {
  id: number;
  empId: string;
  employeeName?: string; // Added for Manager View
  exitType: string;
  reason: string;
  status: string;
  resignationDate: string;
  lastWorkingDate: string;
  noticePeriodDays: number;
  earlyReleaseRequested: boolean;
  noticeBuyoutAmount?: number;
  managerApprovalStatus: string;
  hrApprovalStatus: string;
  hrComments?: string;
  isRehireEligible?: boolean;
  createdAt: string;
}

export interface ExitAssetReturn {
  id: number;
  exitRequestId: number;
  assetId: number;
  assetName?: string;
  returnStatus: 'PENDING' | 'RETURNED' | 'DAMAGED' | 'LOST';
  conditionNotes?: string;
  damageCharge?: number;
  acceptedBy?: string;
  expectedReturnDate: string;
  actualReturnDate?: string;
}

export interface ExitClearance {
  id: number;
  exitRequestId: number;
  department: string;
  clearanceItem: string;
  status: 'PENDING' | 'CLEARED' | 'REJECTED';
  clearedBy?: string;
  comments?: string;
  clearedDate?: string;
}

export interface ExitClearanceDTO {
  department: string;
  clearanceItem: string;
  status: string;
  clearedBy: string;
  comments: string;
}

export interface ExitInterview {
  id: number;
  exitRequestId: number;
  reasonForLeaving: string;
  newOpportunity: string;
  feedback: string;
  suggestions: string;
  wouldRecommend: boolean;
  workEnvironmentRating: number;
  managementRating: number;
  compensationRating: number;
  workLifeBalanceRating: number;
  growthOpportunitiesRating: number;
  interviewDate: string;
}

export interface FinalSettlement {
  id: number;
  exitRequestId: number;
  salaryAmount: number;
  bonusAmount: number;
  gratuityAmount: number;
  leaveEncashmentAmount: number;
  leaveEncashmentDays: number;
  noticePeriodRecovery: number;
  assetDamageCharges: number;
  otherDeductions: number;
  otherDeductionsRemarks: string;
  totalDeductions: number;
  grossPayable: number;
  netPayable: number;
  paymentStatus: 'PENDING' | 'PAID';
  paymentMode?: string;
  paymentReference?: string;
  processedBy?: string;
  paymentDate?: string;
}

export interface EmployeeBasicDTO {
  empId: string;
  firstName: string;
  surname: string;
  designation?: string;
  department?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ExitService {
  private apiUrl = 'https://api.lovahr.com/api'; 

  constructor(private http: HttpClient) {}

  // --- EMPLOYEE ACTIONS ---

  submitResignation(dto: ExitRequestDTO): Observable<EmployeeExitRequest> {
    return this.http.post<EmployeeExitRequest>(`${this.apiUrl}/employee-exit/submit-resignation`, dto);
  }

  withdrawResignation(exitRequestId: number, empId: string): Observable<EmployeeExitRequest> {
    const params = new HttpParams().set('empId', empId);
    return this.http.post<EmployeeExitRequest>(`${this.apiUrl}/employee-exit/${exitRequestId}/withdraw`, {}, { params });
  }

  getExitRequestByEmpId(empId: string, orgCode: string): Observable<EmployeeExitRequest | null> {
    // Assuming backend filters by empId or returns all for org. 
    // Optimization: If API supports /employee-exit/employee/{empId}, use that.
    // For now, using Org filter and finding locally.
    return this.getExitRequestsByOrg(orgCode).pipe(
      map(requests => {
        const myRequest = requests.find(r => r.empId === empId && r.status !== 'WITHDRAWN');
        return myRequest || null;
      }),
      catchError(err => {
        console.error('Error fetching exit requests:', err);
        return throwError(() => err);
      })
    );
  }

  // --- MANAGER ACTIONS (NEW) ---

  getExitRequestsForManager(managerEmpId: string): Observable<EmployeeExitRequest[]> {
    return this.http.get<EmployeeExitRequest[]>(`${this.apiUrl}/employee-exit/manager/${managerEmpId}`);
  }

  // Manager Approval Logic (Using update endpoint or specific approval endpoint)
  approveExitByManager(exitRequestId: number, managerEmpId: string, status: 'APPROVED' | 'REJECTED', comments: string): Observable<EmployeeExitRequest> {
    // Note: If a specific endpoint /manager-approval doesn't exist, check backend.
    // Assuming a pattern similar to HR approval or using a generic update.
    // For this implementation, I will assume a PUT endpoint exists for manager actions.
    const body = {
        managerEmpId: managerEmpId,
        approvalStatus: status,
        managerComments: comments
    };
    // Placeholder URL - Adjust based on actual Backend Route
    return this.http.put<EmployeeExitRequest>(`${this.apiUrl}/employee-exit/${exitRequestId}/manager-approval`, body);
  }

  // --- CORE EXIT REQUESTS (Admin/HR) ---

  getExitRequestsByOrg(orgCode: string): Observable<EmployeeExitRequest[]> {
    return this.http.get<EmployeeExitRequest[]>(`${this.apiUrl}/employee-exit/organization/${orgCode}`);
  }

  getExitRequestById(id: number): Observable<EmployeeExitRequest> {
    return this.http.get<EmployeeExitRequest>(`${this.apiUrl}/employee-exit/${id}`);
  }

  approveExitByHR(exitRequestId: number, dto: ExitApprovalDTO): Observable<EmployeeExitRequest> {
    return this.http.post<EmployeeExitRequest>(`${this.apiUrl}/employee-exit/${exitRequestId}/hr-approval`, dto);
  }

  // --- ASSETS MANAGEMENT ---

  getAssetReturns(exitRequestId: number): Observable<ExitAssetReturn[]> {
    return this.http.get<ExitAssetReturn[]>(`${this.apiUrl}/employee-exit/${exitRequestId}/assets`);
  }

  recordAssetReturn(assetReturnId: number, acceptedBy: string, returnStatus: string, conditionNotes?: string, damageCharge?: number): Observable<ExitAssetReturn> {
    let params = new HttpParams()
      .set('acceptedBy', acceptedBy)
      .set('returnStatus', returnStatus);
    
    if (conditionNotes) params = params.set('conditionNotes', conditionNotes);
    if (damageCharge) params = params.set('damageCharge', damageCharge.toString());

    return this.http.put<ExitAssetReturn>(`${this.apiUrl}/employee-exit/assets/${assetReturnId}/return`, {}, { params });
  }

  // --- CLEARANCES ---

  getClearances(exitRequestId: number): Observable<ExitClearance[]> {
    return this.http.get<ExitClearance[]>(`${this.apiUrl}/employee-exit/${exitRequestId}/clearances`);
  }

  updateClearance(clearanceId: number, dto: ExitClearanceDTO): Observable<ExitClearance> {
    return this.http.put<ExitClearance>(`${this.apiUrl}/employee-exit/clearances/${clearanceId}`, dto);
  }

  // --- EXIT INTERVIEW ---

  getExitInterview(exitRequestId: number): Observable<ExitInterview> {
    return this.http.get<ExitInterview>(`${this.apiUrl}/employee-exit/${exitRequestId}/exit-interview`);
  }

  // --- SETTLEMENT (F&F) ---

  getSettlement(exitRequestId: number): Observable<FinalSettlement> {
    return this.http.get<FinalSettlement>(`${this.apiUrl}/employee-exit/${exitRequestId}/settlement`);
  }

  calculateSettlement(exitRequestId: number): Observable<FinalSettlement> {
    return this.http.post<FinalSettlement>(`${this.apiUrl}/employee-exit/${exitRequestId}/calculate-settlement`, {});
  }

  updateSettlement(settlementId: number, dto: Partial<FinalSettlement>): Observable<FinalSettlement> {
    return this.http.put<FinalSettlement>(`${this.apiUrl}/employee-exit/settlement/${settlementId}`, dto);
  }

  processPayment(settlementId: number, paymentMode: string, paymentReference: string, processedBy: string): Observable<FinalSettlement> {
    const params = new HttpParams()
      .set('paymentMode', paymentMode)
      .set('paymentReference', paymentReference)
      .set('processedBy', processedBy);
    return this.http.post<FinalSettlement>(`${this.apiUrl}/employee-exit/settlement/${settlementId}/process-payment`, {}, { params });
  }

  // --- UTILS ---
  
  getEmployeeBasicDetails(empId: string): Observable<EmployeeBasicDTO> {
    return this.http.get<EmployeeBasicDTO>(`${this.apiUrl}/employees/empid/${empId}`);
  }

  getCtcDetails(empId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/ctc/employee/${empId}`);
  }
}