import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { switchMap, takeWhile } from 'rxjs/operators';
import { AlertService } from '../services/alert.service';
import Swal from 'sweetalert2';
import { EmployeeExitRequest, ExitRequestDTO, ExitService } from '../services/exit.service';
@Component({
  selector: 'app-exit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './exit.component.html',
  styleUrls: ['./exit.component.css']
})
export class ExitComponent implements OnInit, OnDestroy {
  exitForm: FormGroup;
  userName: string = 'Employee';
  empId: string = '';
  orgCode: string = '';
  
  isSubmitting: boolean = false;
  isLoading: boolean = false;
  
  // Real-time State variables
  currentExitRequest: EmployeeExitRequest | null = null;
  private pollingSub: Subscription | null = null;
  private isAlive: boolean = true;
  
  // Defaults
  noticePeriodDays: number = 60; 
  dailyBasicSalary: number = 0; 

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private exitService: ExitService,
    private alertService: AlertService,
    private cdr: ChangeDetectorRef // Added for Manual UI Refresh
  ) {
    // Form Setup
    this.exitForm = this.fb.group({
      earlyReleaseRequested: [false],
      empId: ['', Validators.required],
      exitType: ['Resignation', Validators.required],
      lastWorkingDate: ['', Validators.required],
      noticeBuyoutAmount: [{ value: 0, disabled: true }],
      noticePeriodDays: [this.noticePeriodDays],
      reason: ['', [Validators.required, Validators.minLength(5)]], // Min length 5 for testing
      resignationDate: [new Date().toISOString().substring(0, 10), Validators.required]
    });
  }

  ngOnInit(): void {
    // 1. Load Session Data
    this.userName = localStorage.getItem('fullName') || 'Employee';
    this.empId = localStorage.getItem('empId') || '';
    this.orgCode = localStorage.getItem('orgCode') || 'ORG001';

    if (!this.empId) {
       this.router.navigate(['/login']);
       return;
    }

    this.exitForm.patchValue({ empId: this.empId });

    // 2. Fetch Data
    this.fetchSalaryDetails();
    this.checkForExistingRequest();
    
    // 3. Listeners & Initial Calc
    this.setupFormListeners();
    this.calculateLWD();
  }

  ngOnDestroy(): void {
    this.isAlive = false;
    this.stopPolling();
  }

  // --- API Calls ---

  fetchSalaryDetails() {
    this.exitService.getCtcDetails(this.empId).subscribe({
      next: (res) => {
        const basicYearly = res.ctcDetail?.basicSalary || 0;
        if (basicYearly > 0) {
           this.dailyBasicSalary = (basicYearly / 12) / 30;
        }
      },
      error: () => this.dailyBasicSalary = 0
    });
  }

  checkForExistingRequest() {
    this.isLoading = true;
    this.exitService.getExitRequestByEmpId(this.empId, this.orgCode).subscribe({
      next: (request) => {
        this.isLoading = false;
        if (request) {
          this.handleRequestSuccess(request); // Use shared handler
        }
      },
      error: () => this.isLoading = false
    });
  }

  // --- Submission Logic (FIXED) ---

  onSubmit(): void {
    if (this.exitForm.invalid) {
      this.alertService.error('Please fill all required fields correctly.');
      this.exitForm.markAllAsTouched();
      return;
    }

    Swal.fire({
      title: 'Confirm Submission',
      text: "Are you sure you want to submit your resignation?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Yes, Submit'
    }).then((result) => {
      if (result.isConfirmed) {
        this.processSubmission();
      }
    });
  }

  processSubmission() {
    this.isSubmitting = true;
    
    // 1. Prepare Clean Payload (Ensure types are correct)
    const payload = this.preparePayload();

    this.exitService.submitResignation(payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        Swal.fire('Success', 'Resignation Submitted Successfully!', 'success');
        
        // 2. Real-time UI Update
        this.handleRequestSuccess(res);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.alertService.error(err.error?.message || 'Submission Failed. Check API.');
      }
    });
  }

  // Correctly formats data for API
  preparePayload(): ExitRequestDTO {
    const raw = this.exitForm.getRawValue();
    
    return {
      empId: this.empId,
      exitType: raw.exitType,
      reason: raw.reason,
      resignationDate: raw.resignationDate, // Already YYYY-MM-DD
      lastWorkingDate: raw.lastWorkingDate, // Already YYYY-MM-DD
      noticePeriodDays: Number(raw.noticePeriodDays) || 60,
      earlyReleaseRequested: Boolean(raw.earlyReleaseRequested),
      noticeBuyoutAmount: Number(raw.noticeBuyoutAmount) || 0 // Ensure 0 if null
    };
  }

  // Updates UI state immediately
  handleRequestSuccess(request: EmployeeExitRequest) {
    console.log('Updating UI with request:', request);
    this.currentExitRequest = request;
    this.exitForm.disable(); // Form lock
    this.populateFormWithExistingData(request);
    
    // Force UI Refresh (Real-time feel)
    this.cdr.detectChanges(); 
    
    // Start Polling for status updates
    this.initRealTimeUpdates(request.id);
  }

  // --- Real-Time Polling ---

  initRealTimeUpdates(requestId: number) {
    this.stopPolling();
    
    this.pollingSub = interval(5000) // 5 seconds polling
      .pipe(
        takeWhile(() => this.isAlive && !!this.currentExitRequest),
        switchMap(() => this.exitService.getExitRequestById(requestId))
      )
      .subscribe({
        next: (data) => {
          if (data) {
            // Update status only if changed
            if (this.currentExitRequest && this.currentExitRequest.status !== data.status) {
                this.currentExitRequest = data;
                this.cdr.detectChanges();
            } else {
                this.currentExitRequest = data;
            }
          }
        }
      });
  }

  stopPolling() {
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
      this.pollingSub = null;
    }
  }

  // --- Helper Methods ---

  populateFormWithExistingData(data: EmployeeExitRequest) {
    this.exitForm.patchValue({
      empId: data.empId,
      exitType: data.exitType,
      resignationDate: data.resignationDate,
      lastWorkingDate: data.lastWorkingDate,
      reason: data.reason,
      noticePeriodDays: data.noticePeriodDays,
      earlyReleaseRequested: data.earlyReleaseRequested,
      noticeBuyoutAmount: data.noticeBuyoutAmount
    });
  }

  setupFormListeners() {
    // Early Release Logic
    this.exitForm.get('earlyReleaseRequested')?.valueChanges.subscribe(isEarly => {
        if (isEarly) {
            this.exitForm.get('noticeBuyoutAmount')?.enable();
            // LWD becomes editable
        } else {
            this.exitForm.get('noticeBuyoutAmount')?.disable();
            this.exitForm.patchValue({ noticeBuyoutAmount: 0 });
            this.calculateLWD(); // Reset LWD
        }
    });

    // Buyout Calculation
    this.exitForm.get('lastWorkingDate')?.valueChanges.subscribe(date => {
        if (this.exitForm.get('earlyReleaseRequested')?.value && date) {
            this.calculateBuyout(date);
        }
    });
  }

  calculateLWD(): void {
    const resDateStr = this.exitForm.get('resignationDate')?.value;
    if (resDateStr) {
        const resDate = new Date(resDateStr);
        const lwd = new Date(resDate);
        lwd.setDate(resDate.getDate() + this.noticePeriodDays);
        this.exitForm.patchValue({
            lastWorkingDate: lwd.toISOString().substring(0, 10)
        });
    }
  }

  calculateBuyout(lwdStr: string): void {
      const resDate = new Date(this.exitForm.get('resignationDate')?.value);
      const standardLWD = new Date(resDate);
      standardLWD.setDate(resDate.getDate() + this.noticePeriodDays);
      
      const actualLWD = new Date(lwdStr);
      const diffTime = standardLWD.getTime() - actualLWD.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 0 && this.dailyBasicSalary > 0) {
          const estimatedBuyout = Math.round(diffDays * this.dailyBasicSalary); 
          this.exitForm.patchValue({ noticeBuyoutAmount: estimatedBuyout }, { emitEvent: false });
      } else {
          this.exitForm.patchValue({ noticeBuyoutAmount: 0 }, { emitEvent: false });
      }
  }

  toggleEarlyRelease() {
      if (this.exitForm.disabled) return;
      const current = this.exitForm.get('earlyReleaseRequested')?.value;
      this.exitForm.patchValue({ earlyReleaseRequested: !current });
  }

  getUserInitial(): string {
    return this.userName ? this.userName.charAt(0).toUpperCase() : 'U';
  }

  onCancel(): void {
      this.router.navigate(['/dashboard']);
  }

  onWithdraw(): void {
    if (!this.currentExitRequest) return;
    
    Swal.fire({
        title: 'Withdraw Resignation?',
        text: "Are you sure you want to withdraw?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, Withdraw'
    }).then((result) => {
        if (result.isConfirmed) {
             this.exitService.withdrawResignation(this.currentExitRequest!.id, this.empId).subscribe({
                next: () => {
                  this.stopPolling();
                  this.currentExitRequest = null;
                  this.exitForm.enable();
                  this.exitForm.reset({
                      empId: this.empId,
                      resignationDate: new Date().toISOString().substring(0, 10),
                      noticePeriodDays: this.noticePeriodDays,
                      exitType: 'Resignation',
                      earlyReleaseRequested: false,
                      noticeBuyoutAmount: 0
                  });
                  this.calculateLWD();
                  Swal.fire('Withdrawn', 'Application withdrawn successfully.', 'success');
                }
             });
        }
    });
  }

  getStatusClass(status: string | undefined): string {
    if (!status) return 'status-pending';
    switch (status.toUpperCase()) {
      case 'APPROVED': return 'status-approved';
      case 'REJECTED': return 'status-rejected';
      case 'WITHDRAWN': return 'status-rejected';
      default: return 'status-pending';
    }
  }
}