import { Component, OnInit, Injectable, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, of, combineLatest } from 'rxjs';
import { switchMap, shareReplay, catchError, tap, map, startWith } from 'rxjs/operators';
import { AlertService } from '../services/alert.service';

const API_CONFIG = {
  BASE_URL: 'https://api.lovahr.com/api/super-admin',
  SALES_API_URL: 'https://api.lovahr.com/api/contact-sales',
  HEADERS: {
    CONTENT_TYPE: 'application/json'
  }
};

const ORG_STATUS = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  INACTIVE: 'INACTIVE',
  PENDING: 'PENDING'
};

@Injectable({
  providedIn: 'root'
})
export class OrganizationAdminService {
  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    return new HttpHeaders({
      'Content-Type': API_CONFIG.HEADERS.CONTENT_TYPE,
      'Authorization': `Bearer ${token}` // Super Admin token
    });
  }

  getAllOrganizations(): Observable<any[]> {
    return this.http.get<any>(`${API_CONFIG.BASE_URL}/organizations`, { headers: this.getHeaders() }).pipe(
      map(response => {
        if (response && Array.isArray(response.organizations)) return response.organizations;
        if (Array.isArray(response)) return response;
        if (response && Array.isArray(response.data)) return response.data;
        return []; 
      })
    );
  }

  getPlatformStats(): Observable<any> {
    return this.http.get<any>(`${API_CONFIG.BASE_URL}/statistics`, { headers: this.getHeaders() }).pipe(
      map(res => {
        const statsObj = res?.statistics || res?.data || res;
        const userCount = statsObj?.totalUsers || statsObj?.activeUsers || statsObj?.userCount || res?.totalUsers || 0;
        return { totalUsers: userCount, ...statsObj };
      }),
      catchError(() => of({ totalUsers: 0 }))
    );
  }

  updateOrgStatus(code: string, status: string): Observable<any> {
    const params = new HttpParams().set('status', status);
    return this.http.put(`${API_CONFIG.BASE_URL}/organizations/${code}/status`, {}, { 
      headers: this.getHeaders(),
      params: params 
    });
  }

  // --- Sales Inquiries APIs ---
  getSalesInquiries(statusFilter: string): Observable<any[]> {
    let url = API_CONFIG.SALES_API_URL;
    
    // Status query parameter add karein agar ALL nahi hai
    if (statusFilter && statusFilter !== 'ALL') {
      url += `/status?status=${statusFilter}`;
    }

    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
      map(response => {
        // Robust mapping: Data kisi bhi standard format me aaye, array extract ho jayega
        if (Array.isArray(response)) return response;
        if (response?.data && Array.isArray(response.data)) return response.data;
        if (response?.content && Array.isArray(response.content)) return response.content;
        if (response?.inquiries && Array.isArray(response.inquiries)) return response.inquiries;
        return [];
      })
    );
  }

  updateInquiryStatus(id: number, status: string): Observable<any> {
    const params = new HttpParams().set('status', status);
    return this.http.put(`${API_CONFIG.SALES_API_URL}/${id}/status`, {}, {
      headers: this.getHeaders(),
      params: params
    });
  }
}

@Component({
  selector: 'app-super-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './super-admin.component.html',
  styleUrls: ['./super-admin.component.css']
})
export class SuperAdminComponent implements OnInit {
  
  activeTab: 'organizations' | 'inquiries' = 'organizations';

  private refreshTrigger$ = new BehaviorSubject<void>(undefined);
  private searchQuery$ = new BehaviorSubject<string>(''); 
  private inquiryStatusFilter$ = new BehaviorSubject<string>('ALL');
  
  organizations$: Observable<any[]>;
  inquiries$: Observable<any[]>;
  stats$: Observable<any>;
  isLoading = false;
  
  isProfileOpen = false;

  constructor(
    private api: OrganizationAdminService,
    private router: Router,
    private alertService: AlertService
  ) {
    // 1. Organizations Stream
    const rawOrgsStream$ = this.refreshTrigger$.pipe(
      tap(() => { if (this.activeTab === 'organizations') this.isLoading = true; }),
      switchMap(() => this.api.getAllOrganizations().pipe(
        tap(() => this.isLoading = false),
        catchError(err => {
          this.isLoading = false;
          this.handleError(err);
          return of([]); 
        })
      )),
      shareReplay(1) 
    );

    // 2. Sales Inquiries API Fetch Stream (Decoupled from search)
    // Yeh stream sirf refresh pe ya status filter change hone par API call karegi
    const rawInquiriesStream$ = combineLatest([this.refreshTrigger$, this.inquiryStatusFilter$]).pipe(
      tap(() => { if (this.activeTab === 'inquiries') this.isLoading = true; }),
      switchMap(([_, status]) => this.api.getSalesInquiries(status).pipe(
        tap(() => this.isLoading = false),
        catchError(err => {
          this.isLoading = false;
          this.handleError(err);
          return of([]);
        })
      )),
      shareReplay(1) // Duplicate requests block karne ke liye
    );

    // 3. Sales Inquiries Search Stream (Client-side filtering)
    // Isse search bar me type karne se backend par baar-baar request nahi jayegi
    this.inquiries$ = combineLatest([rawInquiriesStream$, this.searchQuery$]).pipe(
      map(([inquiries, query]) => {
        if (!query || query.trim() === '') return inquiries;
        const q = query.toLowerCase().trim();
        return inquiries.filter((inq: any) => 
          inq.fullName?.toLowerCase().includes(q) || 
          inq.companyName?.toLowerCase().includes(q) ||
          inq.workEmail?.toLowerCase().includes(q)
        );
      })
    );

    // 4. Client-side search logic for Organizations
    this.organizations$ = combineLatest([rawOrgsStream$, this.searchQuery$]).pipe(
      map(([orgs, query]) => {
        if (!query || query.trim() === '') return orgs;
        
        const q = query.toLowerCase().trim();
        return orgs.filter(org => 
          org.companyName?.toLowerCase().includes(q) || 
          org.orgCode?.toLowerCase().includes(q)
        );
      })
    );

    // 5. Stats Stream
    const statsApiStream$ = this.refreshTrigger$.pipe(
      switchMap(() => this.api.getPlatformStats())
    );

    this.stats$ = combineLatest([
      rawOrgsStream$.pipe(startWith([])), 
      statsApiStream$.pipe(startWith({ totalUsers: 0 }))
    ]).pipe(
      map(([orgs, stats]) => ({
        totalOrgs: orgs?.length || 0, 
        totalUsers: stats?.totalUsers || 0,
        ...stats
      }))
    );
  }

  ngOnInit() {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-profile')) {
      this.isProfileOpen = false;
    }
  }

  switchTab(tab: 'organizations' | 'inquiries') {
    this.activeTab = tab;
    this.searchQuery$.next(''); // Tab badalne par search clear karein
    
    // Sirf tabhi filter reset karein jab inquiries tab open ho
    if (tab === 'inquiries') {
      this.inquiryStatusFilter$.next('ALL');
    }
  }

  toggleProfileMenu(event: Event) {
    event.stopPropagation();
    this.isProfileOpen = !this.isProfileOpen;
  }

  logout() {
    localStorage.clear();
    localStorage.setItem('logout-event', 'logout' + Math.random());
    this.router.navigate(['/login']);
    this.alertService.info('Logging out...', 'Session Ended');
  }

  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery$.next(value);
  }

  onInquiryFilterChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.inquiryStatusFilter$.next(value);
  }

  refreshData() {
    this.refreshTrigger$.next();
  }

  triggerOnboarding() {
    this.router.navigate(['/company-onboarding']);
  }

  async toggleStatus(org: any) {
    if (!org.orgCode) return;
    const newStatus = org.status === ORG_STATUS.ACTIVE ? ORG_STATUS.SUSPENDED : ORG_STATUS.ACTIVE;
    const actionText = org.status === ORG_STATUS.ACTIVE ? 'Suspend' : 'Activate';
    
    const isConfirmed = await this.alertService.confirm(
      `Confirm ${actionText}`,
      `Are you sure you want to ${actionText.toLowerCase()} access for ${org.companyName}?`,
      `Yes, ${actionText}`
    );

    if (isConfirmed) {
      this.api.updateOrgStatus(org.orgCode, newStatus).subscribe({
        next: () => {
          this.alertService.success(`Organization has been ${newStatus.toLowerCase()}.`);
          this.refreshData(); 
        },
        error: (err) => this.handleError(err)
      });
    }
  }

  updateInquiryStatus(inquiry: any, event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const newStatus = selectElement.value;
    const oldStatus = inquiry.status;

    inquiry.status = newStatus; // Optimistic update on UI
    this.api.updateInquiryStatus(inquiry.id, newStatus).subscribe({
      next: () => {
        this.alertService.success(`Inquiry marked as ${newStatus}`);
      },
      error: (err) => {
        inquiry.status = oldStatus; // Revert karein agar API fail ho
        selectElement.value = oldStatus;
        this.handleError(err);
      }
    });
  }

  private handleError(err: HttpErrorResponse) {
    console.error('API Error:', err);
    let errorMsg = err.error?.message || 'An unexpected error occurred.';
    this.alertService.error(errorMsg, 'Operation Failed');
  }
}