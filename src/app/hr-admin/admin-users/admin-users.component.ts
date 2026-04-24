import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subscription, interval } from 'rxjs';
import { startWith, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { UserService, EmployeeDTO } from '../../user-service.service';
import { AlertService } from '../../services/alert.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

// ─── Document interfaces ────────────────────────────────────────────────────

export interface EmployeeDocument {
  id: number;
  fileName: string;
  fileType: string;      
  documentType: string;  
  category: string;
  uploadedAt?: string;
  fileUrl?: string;      
  fileData?: string;     
}

// ─── Preview state ──────────────────────────────────────────────────────────
export interface DocPreviewState {
  visible: boolean;
  label: string;
  isPdf: boolean;
  isImage: boolean;
  data: SafeResourceUrl | string | null;
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.css']
})
export class AdminUsersComponent implements OnInit, OnDestroy {

  private readonly BASE_URL = 'https://api.lovahr.com';

  // ─── Employee data ─────────────────────────────────────────────────────
  employees: EmployeeDTO[] = [];
  filteredEmployees: EmployeeDTO[] = [];
  availableManagers: EmployeeDTO[] = [];
  isLoading = true;
  isSubmitting = false;

  // ─── Form state ────────────────────────────────────────────────────────
  userForm: FormGroup;
  showModal = false;
  isEditing = false;
  editingId: number | null = null;
  editingUser: any = null;

  // ─── Filters ───────────────────────────────────────────────────────────
  searchText = '';
  roleFilter = 'All';

  // ─── Documents modal ───────────────────────────────────────────────────
  showDocsModal = false;
  docsEmployee: EmployeeDTO | null = null;
  employeeDocs: EmployeeDocument[] = [];
  isLoadingDocs = false;
  docsLoadError = false;

  // ─── Document preview (inside docs modal) ──────────────────────────────
  preview: DocPreviewState = {
    visible: false, label: '', isPdf: false, isImage: false, data: null
  };
  private _blobUrl: string | null = null;

  // ─── Real-time subscription ────────────────────────────────────────────
  private subs = new Subscription();

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private alert: AlertService,
    private http: HttpClient,
    private sanitizer: DomSanitizer
  ) {
    this.userForm = this.fb.group({
      firstName:   ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100), Validators.pattern(/^[a-zA-Z .\-']+$/)]],
      surname:     ['', [Validators.required, Validators.minLength(1), Validators.maxLength(100), Validators.pattern(/^[a-zA-Z .\-']+$/)]],
      email:       ['', [Validators.required, Validators.maxLength(254), Validators.pattern(/^[a-z0-9][a-z0-9._-]*@[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/)]],
      address:     ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
      empId:       [{ value: '', disabled: true }, Validators.required],
      joiningDate: ['', Validators.required],
      role:        ['EMPLOYEE', [Validators.required, Validators.pattern(/^(EMPLOYEE|HR|MANAGER)$/)]],
      department:  ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100), Validators.pattern(/^(?!\d+$)[a-zA-Z][a-zA-Z0-9 &.\-]*$/)]],
      designation: ['', [Validators.maxLength(100)]],
      location:    ['Head Office', [Validators.maxLength(200)]],
      managerEmpId: ['', [Validators.maxLength(150)]]
    });
  }

  get f() { return this.userForm.controls; }

  // ─── Lifecycle ───────────────────────────────────────────────────────────

  ngOnInit() {
    this.subs.add(
      interval(30000).pipe(startWith(0)).subscribe(() => this.loadData())
    );
    this.subs.add(
      this.userService.refresh$.subscribe(() => this.loadData())
    );
  }

  ngOnDestroy() { this.subs.unsubscribe(); }

  // ─── Auth helper ─────────────────────────────────────────────────────────

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': 'Bearer ' + token } : {})
    });
  }

  // ─── Employee data ────────────────────────────────────────────────────────

  loadData() {
    this.userService.getAllEmployees().subscribe({
      next: (data) => {
        this.employees = data;
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  // ─── Onboarding modal ────────────────────────────────────────────────────

  openOnboardingModal() {
    this.isEditing = false;
    this.editingId = null;
    this.editingUser = null;
    this.userForm.reset({
      role: 'EMPLOYEE', location: 'Head Office', managerEmpId: '',
      joiningDate: new Date().toISOString().substring(0, 10)
    });
    this.userForm.patchValue({ empId: 'Generating...' });
    this.showModal = true;
    this.userService.getOnboardInit().subscribe(res => {
      const id = typeof res === 'string' ? res : (res?.empId || 'EMP-' + Math.floor(Math.random() * 10000));
      this.userForm.patchValue({ empId: id });
      this.loadManagers(id);
    });
  }

  openEditUser(user: EmployeeDTO) {
    this.isEditing = true;
    this.editingId = user.id;
    this.editingUser = user;
    
    let formattedDate = user.joiningDate || '';
    if (formattedDate && formattedDate.length > 10) {
      formattedDate = formattedDate.substring(0, 10);
    }

    // Safety check nested object property vs string property
    const currentManagerId = user.managerEmpId || (user as any).manager?.empId || '';

    this.userForm.patchValue({
      firstName:   user.firstName,
      surname:     user.surname,
      email:       user.personalEmailId || (user as any).email,
      address:     user.address || '',
      empId:       user.empId,
      joiningDate: formattedDate,
      department:  user.department,
      designation: user.designation,
      role:        user.role,
      location:    user.location,
      managerEmpId: currentManagerId
    });
    this.showModal = true;
    this.loadManagers(user.empId, currentManagerId);
  }

  loadManagers(empId: string, currentManagerId?: string) {
    this.userService.getEligibleManagers(empId).subscribe({
      next:  (managers) => {
         // Agar assigned manager API list me nahi hai, toh manually add karein taaki dropdown properly select kar le
         if (currentManagerId && !managers.some(m => m.empId === currentManagerId)) {
           managers.push({
             empId: currentManagerId,
             firstName: 'Current',
             surname: 'Manager'
           } as EmployeeDTO);
         }
         
         this.availableManagers = managers;
         
         // Timeout zaroori hai taaki Angular ka dropdown DOM <options> pehle render kar de, uske baad patchValue ho
         if (currentManagerId) {
            setTimeout(() => {
              this.userForm.patchValue({ managerEmpId: currentManagerId });
            });
         }
      },
      error: () => { this.availableManagers = []; }
    });
  }

  submit() {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      this.alert.warning('Please fill all required fields correctly.', 'Validation Error');
      return;
    }
    this.isSubmitting = true;
    const formValues = this.userForm.getRawValue();

    if (this.isEditing) {
      // FIX FOR 400 MALFORMED JSON:
      // Merge existing employee fields to prevent missing data validation errors in backend
      const updatePayload = {
        ...this.editingUser,
        id: this.editingId,
        empId: formValues.empId,
        firstName: formValues.firstName,
        surname: formValues.surname,
        personalEmailId: formValues.email, // Form "email" mapped to actual entity "personalEmailId"
        address: formValues.address,
        joiningDate: formValues.joiningDate,
        department: formValues.department,
        designation: formValues.designation,
        role: formValues.role,
        location: formValues.location,
        manager: formValues.managerEmpId ? { empId: formValues.managerEmpId } : null
      };

      this.userService.updateEmployeeProfile(formValues.empId, updatePayload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.showModal = false;
          this.alert.success('Profile updated successfully!');
          this.loadData();
        },
        error: (err) => {
          this.isSubmitting = false;
          const msg = err.error?.message || err.message || 'Failed to update profile.';
          this.alert.error(msg, 'Update Failed');
        }
      });
      
    } else {
      // POST API OnboardingRequestDTO expect karta hai, jismein `manager` simply ek string hoti hai.
      const onboardPayload = {
        firstName: formValues.firstName,
        surname: formValues.surname,
        email: formValues.email,
        address: formValues.address,
        empId: formValues.empId,
        joiningDate: formValues.joiningDate,
        department: formValues.department,
        designation: formValues.designation,
        role: formValues.role,
        location: formValues.location,
        manager: formValues.managerEmpId || null
      };

      this.userService.onboardEmployee(onboardPayload).subscribe({
        next: (res: any) => {
          this.isSubmitting = false;
          if (res.emailValid === false) {
            this.alert.error('Onboarding Failed: The email address is invalid.', 'Invalid Email');
            return;
          }
          if (res.emailSent === false) {
            this.alert.warning('User onboarded, but the credentials email could not be sent.');
          } else {
            this.alert.success('Employee onboarded and credentials sent successfully!');
          }
          this.showModal = false;
          this.loadData();
        },
        error: (err) => {
          this.isSubmitting = false;
          const msg = err.error?.message || err.message || 'System error during onboarding.';
          this.alert.error(msg, 'Onboarding Failed');
        }
      });
    }
  }

  // ─── Filters ─────────────────────────────────────────────────────────────

  applyFilters() {
    let data = this.employees;
    if (this.roleFilter !== 'All') {
      data = data.filter(u => u.role === this.roleFilter);
    }
    if (this.searchText.trim()) {
      const term = this.searchText.toLowerCase();
      data = data.filter(u =>
        u.firstName?.toLowerCase().includes(term) ||
        u.surname?.toLowerCase().includes(term) ||
        u.empId?.toLowerCase().includes(term) ||
        u.department?.toLowerCase().includes(term) ||
        u.personalEmailId?.toLowerCase().includes(term) ||
        (u as any).email?.toLowerCase().includes(term) ||
        (u as any).mobileNumber?.toLowerCase().includes(term)
      );
    }
    this.filteredEmployees = data;
  }

  setFilter(role: string) { this.roleFilter = role; this.applyFilters(); }

  // ─── See Documents ────────────────────────────────────────────────────────

  openDocsModal(user: EmployeeDTO): void {
    this.docsEmployee = user;
    this.employeeDocs = [];
    this.docsLoadError = false;
    this.isLoadingDocs = true;
    this.showDocsModal = true;
    this.closeDocPreview();

    const url = `${this.BASE_URL}/api/views-documents`;
    this.http.get<any[]>(url, { headers: this.getAuthHeaders() }).pipe(
      catchError(() => of([]))
    ).subscribe(docs => {
      this.isLoadingDocs = false;
      
      const allDocs = Array.isArray(docs) ? docs : [];
      const userDocs = allDocs.filter(d => d.empId === user.empId);

      this.employeeDocs = userDocs.map(d => {
        let ext = '';
        const linkToParse = d.documentLink || d.documentName || '';
        if (linkToParse) {
          const cleanLink = linkToParse.split('?')[0]; 
          ext = cleanLink.split('.').pop()?.toLowerCase() || '';
        }
        
        let fType = 'application/pdf'; 
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
          fType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
        }

        return {
          id: d.id,
          fileName: d.documentName || d.documentType || 'Document',
          fileType: fType,
          documentType: d.documentType,
          category: d.documentCategory,
          uploadedAt: d.uploadTimestamp,
          fileUrl: d.documentLink
        };
      });

      if (this.employeeDocs.length === 0) {
        this.docsLoadError = false; 
      }
    });
  }

  closeDocsModal(): void {
    this.showDocsModal = false;
    this.docsEmployee = null;
    this.employeeDocs = [];
    this.closeDocPreview();
    document.body.style.overflow = '';
  }

  // ─── Document preview (within docs modal) ────────────────────────────────

  openDocPreview(doc: EmployeeDocument): void {
    this.closeDocPreview(); 
    this.preview.label   = doc.documentType || doc.fileName;
    this.preview.isPdf   = doc.fileType === 'application/pdf';
    this.preview.isImage = doc.fileType?.startsWith('image/') ?? false;

    if (doc.fileUrl) {
      if (this.preview.isPdf) {
        this.preview.data = this.sanitizer.bypassSecurityTrustResourceUrl(doc.fileUrl);
      } else {
        this.preview.data = doc.fileUrl;
      }
    } else if (doc.fileData) {
      if (this.preview.isPdf) {
        const base64 = doc.fileData.includes(',') ? doc.fileData.split(',')[1] : doc.fileData;
        const bytes  = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const blob   = new Blob([bytes], { type: 'application/pdf' });
        this._blobUrl   = URL.createObjectURL(blob);
        this.preview.data = this.sanitizer.bypassSecurityTrustResourceUrl(this._blobUrl);
      } else {
        this.preview.data = doc.fileData.startsWith('data:')
          ? doc.fileData
          : `data:${doc.fileType};base64,${doc.fileData}`;
      }
    } else {
      this.preview.data = null;
    }

    this.preview.visible = true;
  }

  closeDocPreview(): void {
    if (this._blobUrl) { URL.revokeObjectURL(this._blobUrl); this._blobUrl = null; }
    this.preview = { visible: false, label: '', isPdf: false, isImage: false, data: null };
  }

  getDocIcon(doc: EmployeeDocument): string {
    if (!doc.fileType) return 'fa-file';
    if (doc.fileType === 'application/pdf') return 'fa-file-pdf';
    if (doc.fileType.startsWith('image/')) return 'fa-file-image';
    return 'fa-file';
  }

  getDocIconClass(doc: EmployeeDocument): string {
    if (!doc.fileType) return '';
    if (doc.fileType === 'application/pdf') return 'doc-icon-pdf';
    if (doc.fileType.startsWith('image/')) return 'doc-icon-img';
    return '';
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }
}