import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// --- Interfaces (Based on Swagger Definition) ---

export interface Organization {
  orgCode: string;
  companyName: string;
  adminName?: string;
  adminEmail?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  subscriptionPlan?: string;
  createdAt?: string;
  industry?: string;
  website?: string;
  companySize?: string;
}

export interface PlatformStats {
  totalOrgs: number;
  activeUsers: number;
  revenue: number;
}

// --- NEW: Single Request Payload based on Swagger ---
export interface OrganizationOnboardRequest {
  city: string;
  companyLogo: string | File; // Updated to allow File object for upload
  companyName: string;
  companySize: string;
  corporateAddress: string;
  country: string;
  currency: string;
  departments: string[];
  hrContactNumber: string;
  hrDesignation: string;
  hrFullName: string;
  hrWorkEmail: string;
  hrJoiningDate?: string; // ADDED
  hrAddress?: string;     // ADDED
  industry: string;
  timezone: string;
  website: string;
}

// Keep these for legacy or partial updates if needed
export interface OrganizationRegistrationRequest {
  adminEmail: string;
  adminName: string;
  companyName: string;
  orgCode: string;
  adminPassword?: string;
  city?: string;
  country?: string;
  companySize?: string;
}

export interface CompanySetupRequest {
  companyName: string;
  companyLogo: string;
  industry: string;
  companySize: string;
  website: string;
}

export interface HeadquartersRequest {
  corporateAddress: string;
  city: string;
  country: string;
  currency: string;
  timezone: string;
}

@Injectable({
  providedIn: 'root'
})
export class OrganizationOnboardingService {
  // NOTE: Ensure this URL is reachable from your browser
  private readonly API_URL = 'https://api.lovahr.com/api';

  constructor(private http: HttpClient) {}

  // --- HELPER: Get Auth Token ---
  // Fix: Agar token nahi hai toh Authorization header na bhejein
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken'); 
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  // --- HELPER: Get Public Headers (No Auth) ---
  private getPublicHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
  }

  // ==========================================
  // 1. SUPER ADMIN DASHBOARD
  // ==========================================

  getAllOrganizations(): Observable<Organization[]> {
    return this.http.get<Organization[]>(`${this.API_URL}/super-admin/organizations`, { headers: this.getHeaders() });
  }

  getPlatformStats(): Observable<PlatformStats> {
    return this.http.get<PlatformStats>(`${this.API_URL}/super-admin/statistics`, { headers: this.getHeaders() });
  }

  updateOrgStatus(orgCode: string, status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE'): Observable<any> {
    const params = new HttpParams().set('status', status);
    return this.http.patch(
      `${this.API_URL}/super-admin/organizations/${orgCode}/status`,
      {},
      { headers: this.getHeaders(), params }
    );
  }

  updateOrganization(orgCode: string, data: any): Observable<any> {
    return this.http.put(`${this.API_URL}/super-admin/organizations/${orgCode}`, data, { headers: this.getHeaders() });
  }

  // ==========================================
  // 2. ORGANIZATION ADMIN (Post-Onboarding)
  // ==========================================

  getOrganizationDetails(orgCode: string): Observable<Organization> {
    return this.http.get<Organization>(`${this.API_URL}/organizations/${orgCode}`, { headers: this.getHeaders() });
  }

  getCurrentOrganization(): Observable<Organization> {
    return this.http.get<Organization>(`${this.API_URL}/organizations/current`, { headers: this.getHeaders() });
  }

  getNextEmployeeId(orgCode: string): Observable<{ nextEmployeeId: string }> {
    return this.http.get<{ nextEmployeeId: string }>(`${this.API_URL}/organizations/${orgCode}/next-employee-id`, { headers: this.getHeaders() });
  }

  // ==========================================
  // 3. ONBOARDING WIZARD (The Setup Flow) - MADE PUBLIC
  // ==========================================

  /**
   * MAIN ONBOARDING METHOD
   * Endpoint: POST /api/super-admin/organizations/onboard
   */
  onboardOrganization(data: OrganizationOnboardRequest): Observable<any> {
    const url = `${this.API_URL}/super-admin/organizations/onboard`;

    // 1. Construct Query Params for ALL text fields
    let params = new HttpParams()
      .set('companyName', data.companyName)
      .set('industry', data.industry)
      .set('companySize', data.companySize)
      .set('website', data.website || '') 
      .set('corporateAddress', data.corporateAddress)
      .set('city', data.city)
      .set('country', data.country)
      .set('currency', data.currency)
      .set('timezone', data.timezone)
      .set('hrFullName', data.hrFullName)
      .set('hrWorkEmail', data.hrWorkEmail)
      .set('hrContactNumber', data.hrContactNumber || '')
      .set('hrDesignation', data.hrDesignation || '')
      .set('hrJoiningDate', data.hrJoiningDate || '') 
      .set('hrAddress', data.hrAddress || '');        

    // Handle Array for Departments
    if (data.departments && data.departments.length > 0) {
      data.departments.forEach(dept => {
        params = params.append('departments', dept);
      });
    }

    // 2. Construct Body (Multipart for Logo)
    const formData = new FormData();
    if (data.companyLogo && data.companyLogo instanceof File) {
       formData.append('companyLogo', data.companyLogo);
    } 
    
    // Fix: Yahan custom headers nahi bhejenge. HttpClient automatically multipart/form-data set kar dega.
    return this.http.post(url, formData, { 
      params: params 
    });
  }

  // --- Legacy/Individual Step Methods (MADE PUBLIC) ---

  // Step 0: Initial Registration
  registerOrganization(data: OrganizationRegistrationRequest): Observable<any> {
    return this.http.post(`${this.API_URL}/organizations/register`, data, { headers: this.getPublicHeaders() });
  }

  // Step 1: Company Branding
  saveCompanyDetails(orgCode: string, data: CompanySetupRequest): Observable<any> {
    return this.http.post(`${this.API_URL}/organizations/${orgCode}/step1/company`, data, { headers: this.getPublicHeaders() });
  }

  // Step 2: Headquarters & Locale
  saveHeadquarters(orgCode: string, data: HeadquartersRequest): Observable<any> {
    return this.http.post(`${this.API_URL}/organizations/${orgCode}/step2/headquarters`, data, { headers: this.getPublicHeaders() });
  }

  // Step 3: Add Department
  addDepartment(orgCode: string, departmentName: string): Observable<any> {
    const params = new HttpParams().set('departmentName', departmentName);
    return this.http.post(
      `${this.API_URL}/organizations/${orgCode}/step3/department`,
      {},
      { headers: this.getPublicHeaders(), params }
    );
  }

  // Step 3 (View): Get All Departments
  getDepartments(orgCode: string): Observable<any> {
    return this.http.get(`${this.API_URL}/organizations/${orgCode}/step3/departments`, { headers: this.getPublicHeaders() });
  }

  // Step 3 (Delete): Remove Department
  removeDepartment(orgCode: string, departmentName: string): Observable<any> {
    return this.http.delete(`${this.API_URL}/organizations/${orgCode}/step3/department/${departmentName}`, { headers: this.getPublicHeaders() });
  }

  // Step 4: Finalize Setup
  completeSetup(orgCode: string): Observable<any> {
    return this.http.post(`${this.API_URL}/organizations/${orgCode}/step4/complete`, {}, { headers: this.getPublicHeaders() });
  }
  
  getOrgCode(currentOrgCode?: string): string {
    return currentOrgCode || 'UNKNOWN';
  }
}