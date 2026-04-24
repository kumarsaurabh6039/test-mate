import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { forkJoin, of, Subscription, interval } from 'rxjs';
import { catchError, map, startWith, switchMap } from 'rxjs/operators';
import { 
  EmployeeExitRequest, ExitService, ExitApprovalDTO, 
  ExitAssetReturn, ExitClearance, ExitInterview, FinalSettlement, ExitClearanceDTO 
} from '../services/exit.service';

type ModalTab = 'APPROVAL' | 'ASSETS' | 'CLEARANCE' | 'INTERVIEW' | 'SETTLEMENT';

@Component({
  selector: 'app-admin-exit',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './admin-exit.component.html',
  styleUrls: ['./admin-exit.component.css']
})
export class AdminExitComponent implements OnInit, OnDestroy {
  // Main Data
  exitRequests: EmployeeExitRequest[] = [];
  filteredRequests: EmployeeExitRequest[] = [];
  isLoading: boolean = false;
  activeFilter: 'PENDING' | 'HISTORY' = 'PENDING';
  
  // Modal & Tabs
  showProcessModal: boolean = false;
  activeModalTab: ModalTab = 'APPROVAL';
  selectedRequest: EmployeeExitRequest | null = null;
  
  // Sub-Data for Modal
  assets: ExitAssetReturn[] = [];
  clearances: ExitClearance[] = [];
  exitInterview: ExitInterview | null = null;
  settlement: FinalSettlement | null = null;
  
  // Forms
  approvalForm: FormGroup;
  settlementForm: FormGroup;
  paymentForm: FormGroup;
  
  // User Context
  hrEmpId: string = '';
  orgCode: string = '';

  // Helpers
  private pollingSub: Subscription | null = null;
  private employeeNameCache = new Map<string, string>();

  constructor(
    private exitService: ExitService,
    private fb: FormBuilder
  ) {
    this.approvalForm = this.fb.group({
      approvalStatus: ['APPROVED', Validators.required],
      comments: ['', Validators.required],
      isRehireEligible: [true],
      rehireComments: ['']
    });

    this.settlementForm = this.fb.group({
      bonusAmount: [0],
      noticePeriodRecovery: [0],
      assetDamageCharges: [0],
      otherDeductions: [0],
      otherDeductionsRemarks: ['']
    });

    this.paymentForm = this.fb.group({
      paymentMode: ['BANK_TRANSFER', Validators.required],
      paymentReference: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.hrEmpId = localStorage.getItem('empId') || 'HR-ADMIN'; 
    this.orgCode = localStorage.getItem('orgCode') || 'CITRI'; 
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  // --- POLLING & LISTING ---

  startPolling() {
    this.isLoading = true;
    this.pollingSub = interval(15000).pipe(
      startWith(0),
      switchMap(() => this.exitService.getExitRequestsByOrg(this.orgCode).pipe(catchError(() => of([]))))
    ).subscribe((requests: EmployeeExitRequest[]) => {
      this.hydrateRequestsWithNames(requests);
    });
  }

  stopPolling() {
    if (this.pollingSub) { this.pollingSub.unsubscribe(); this.pollingSub = null; }
  }

  hydrateRequestsWithNames(requests: EmployeeExitRequest[]) {
    const unknownRequests = requests.filter(req => !req.employeeName && !this.employeeNameCache.has(req.empId));
    if (unknownRequests.length === 0) {
      this.updateRequestsList(requests);
      return;
    }

    const uniqueEmpIds = [...new Set(unknownRequests.map(r => r.empId))];
    const observables = uniqueEmpIds.map(empId => 
      this.exitService.getEmployeeBasicDetails(empId).pipe(
        map(emp => ({ empId, name: `${emp.firstName} ${emp.surname}` })),
        catchError(() => of({ empId, name: 'Unknown' }))
      )
    );

    forkJoin(observables).subscribe(results => {
      results.forEach(res => this.employeeNameCache.set(res.empId, res.name));
      this.updateRequestsList(requests);
    });
  }

  updateRequestsList(requests: EmployeeExitRequest[]) {
    this.exitRequests = requests.map(req => ({
      ...req,
      employeeName: this.employeeNameCache.get(req.empId) || req.employeeName || 'Unknown'
    }));
    this.filterRequests();
    this.isLoading = false;
  }

  setFilter(filter: 'PENDING' | 'HISTORY') {
    this.activeFilter = filter;
    this.filterRequests();
  }

  filterRequests() {
    const sorted = [...this.exitRequests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (this.activeFilter === 'PENDING') {
      this.filteredRequests = sorted.filter(r => ['PENDING', '', null].includes(r.hrApprovalStatus?.toUpperCase() || ''));
    } else {
      this.filteredRequests = sorted.filter(r => ['APPROVED', 'REJECTED'].includes(r.hrApprovalStatus?.toUpperCase() || ''));
    }
  }

  // --- MODAL MANAGEMENT ---

  openManageModal(req: EmployeeExitRequest) {
    this.stopPolling();
    this.selectedRequest = req;
    this.activeModalTab = 'APPROVAL'; // Default tab
    
    // Init Approval Form
    this.approvalForm.patchValue({
      approvalStatus: req.hrApprovalStatus || 'APPROVED',
      comments: req.hrComments || '',
      isRehireEligible: req.isRehireEligible !== false, // Default true
      rehireComments: ''
    });

    this.showProcessModal = true;
  }

  closeModal() {
    this.showProcessModal = false;
    this.selectedRequest = null;
    this.assets = [];
    this.clearances = [];
    this.settlement = null;
    this.exitInterview = null;
    this.startPolling();
  }

  switchTab(tab: ModalTab) {
    if (!this.selectedRequest) return;
    this.activeModalTab = tab;
    
    // Lazy Load Data
    switch (tab) {
      case 'ASSETS': this.loadAssets(); break;
      case 'CLEARANCE': this.loadClearances(); break;
      case 'INTERVIEW': this.loadInterview(); break;
      case 'SETTLEMENT': this.loadSettlement(); break;
    }
  }

  // --- TAB 1: APPROVAL LOGIC ---

  submitApproval() {
    if (this.approvalForm.invalid || !this.selectedRequest) return;
    const dto: ExitApprovalDTO = {
      approverEmpId: this.hrEmpId,
      ...this.approvalForm.value
    };

    this.exitService.approveExitByHR(this.selectedRequest.id, dto).subscribe({
      next: (res) => {
        Swal.fire('Success', `Exit request ${dto.approvalStatus.toLowerCase()}`, 'success');
        this.selectedRequest = res; // Update local ref
      },
      error: () => Swal.fire('Error', 'Failed to submit approval', 'error')
    });
  }

  // --- TAB 2: ASSETS LOGIC ---

  loadAssets() {
    if (!this.selectedRequest) return;
    this.exitService.getAssetReturns(this.selectedRequest.id).subscribe(res => this.assets = res);
  }

  updateAsset(asset: ExitAssetReturn, status: string) {
    // For Damage/Lost, we might ask for notes/charges using a prompt
    if (status === 'DAMAGED' || status === 'LOST') {
      Swal.fire({
        title: 'Report Damage/Loss',
        html: '<input id="swal-notes" class="swal2-input" placeholder="Notes"><input id="swal-charge" type="number" class="swal2-input" placeholder="Damage Charge (Amount)">',
        showCancelButton: true,
        preConfirm: () => {
          return {
            notes: (document.getElementById('swal-notes') as HTMLInputElement).value,
            charge: (document.getElementById('swal-charge') as HTMLInputElement).value
          };
        }
      }).then((result) => {
        if (result.isConfirmed) {
          this.executeAssetUpdate(asset, status, result.value.notes, result.value.charge);
        }
      });
    } else {
      this.executeAssetUpdate(asset, status);
    }
  }

  executeAssetUpdate(asset: ExitAssetReturn, status: string, notes?: string, charge?: number) {
    this.exitService.recordAssetReturn(asset.id, this.hrEmpId, status, notes, charge).subscribe({
      next: () => {
        this.loadAssets(); // Refresh
        Swal.fire('Updated', 'Asset status updated', 'success');
      },
      error: () => Swal.fire('Error', 'Failed to update asset', 'error')
    });
  }

  // --- TAB 3: CLEARANCE LOGIC ---

  loadClearances() {
    if (!this.selectedRequest) return;
    this.exitService.getClearances(this.selectedRequest.id).subscribe(res => this.clearances = res);
  }

  updateClearance(clearance: ExitClearance, status: string) {
    // If Admin/HR needs to force update a clearance (usually Department Heads do this, but HR Admin has override)
    const dto: ExitClearanceDTO = {
      department: clearance.department,
      clearanceItem: clearance.clearanceItem,
      status: status,
      clearedBy: this.hrEmpId,
      comments: `Updated by HR Admin`
    };

    this.exitService.updateClearance(clearance.id, dto).subscribe({
      next: () => {
        this.loadClearances();
        Swal.fire('Updated', 'Clearance status updated', 'success');
      },
      error: () => Swal.fire('Error', 'Failed to update clearance', 'error')
    });
  }

  // --- TAB 4: INTERVIEW LOGIC ---

  loadInterview() {
    if (!this.selectedRequest) return;
    this.exitService.getExitInterview(this.selectedRequest.id).subscribe({
      next: (res) => this.exitInterview = res,
      error: () => this.exitInterview = null // No interview submitted yet
    });
  }

  // --- TAB 5: SETTLEMENT LOGIC ---

  loadSettlement() {
    if (!this.selectedRequest) return;
    this.exitService.getSettlement(this.selectedRequest.id).subscribe({
      next: (res) => {
        this.settlement = res;
        this.patchSettlementForm(res);
      },
      error: () => {
        // Not generated yet? Try to calculate
        this.calculateSettlement();
      }
    });
  }

  calculateSettlement() {
    if (!this.selectedRequest) return;
    Swal.fire({ title: 'Calculating...', didOpen: () => Swal.showLoading() });
    
    this.exitService.calculateSettlement(this.selectedRequest.id).subscribe({
      next: (res) => {
        this.settlement = res;
        this.patchSettlementForm(res);
        Swal.close();
      },
      error: (err) => Swal.fire('Error', 'Could not calculate settlement. Ensure exit is Approved.', 'error')
    });
  }

  patchSettlementForm(data: FinalSettlement) {
    this.settlementForm.patchValue({
      bonusAmount: data.bonusAmount,
      noticePeriodRecovery: data.noticePeriodRecovery,
      assetDamageCharges: data.assetDamageCharges,
      otherDeductions: data.otherDeductions,
      otherDeductionsRemarks: data.otherDeductionsRemarks
    });
  }

  updateSettlement() {
    if (!this.settlement) return;
    const dto = this.settlementForm.value;
    
    this.exitService.updateSettlement(this.settlement.id, dto).subscribe({
      next: (res) => {
        this.settlement = res;
        Swal.fire('Saved', 'Settlement details updated', 'success');
      },
      error: () => Swal.fire('Error', 'Update failed', 'error')
    });
  }

  processPayment() {
    if (!this.settlement || this.paymentForm.invalid) return;
    
    Swal.fire({
      title: 'Confirm Payment?',
      text: `Process final payout of ${this.settlement.netPayable}? This cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Pay Now'
    }).then((result) => {
      if (result.isConfirmed && this.settlement) {
        const { paymentMode, paymentReference } = this.paymentForm.value;
        this.exitService.processPayment(this.settlement.id, paymentMode, paymentReference, this.hrEmpId).subscribe({
          next: (res) => {
            this.settlement = res;
            Swal.fire('Paid', 'Full & Final Settlement Completed', 'success');
          },
          error: () => Swal.fire('Error', 'Payment processing failed', 'error')
        });
      }
    });
  }

  // --- UTILS ---
  
  getStatusClass(status: string): string {
    if (!status) return 'badge-warning';
    switch(status.toUpperCase()) {
      case 'APPROVED': case 'CLEARED': case 'RETURNED': case 'PAID': return 'badge-success';
      case 'REJECTED': case 'DAMAGED': case 'LOST': return 'badge-danger';
      default: return 'badge-warning';
    }
  }
}