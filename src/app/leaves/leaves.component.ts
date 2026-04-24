import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { HttpClientModule, HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { UserService, DashboardData, LeaveBalanceResponse } from '../user-service.service'; 
import { LeaveService, LeaveRequest } from '../services/leave.service';
import { AlertService } from '../services/alert.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-leaves',
  templateUrl: './leaves.component.html',
  styleUrls: ['./leaves.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule]
})
export class LeavesComponent implements OnInit, OnDestroy {
  isLoading: boolean = true;
  isSubmitting: boolean = false;
  leaveBalances: LeaveBalanceResponse[] = [];
  leaveRequests: LeaveRequest[] = []; 
  
  showLeaveModal: boolean = false;
  leaveForm = {
    leaveType: 'CASUAL',
    fromDate: '',
    toDate: '',
    reason: ''
  };
  
  today: string = '';
  errorMessage: string = '';
  private empId = 'EMP001';

  private balancePollingSub?: Subscription;
  private historyPollingSub?: Subscription;
  private dashboardSub?: Subscription;

  constructor(
    private userService: UserService, 
    private leaveService: LeaveService,
    private alertService: AlertService,
    private cdr: ChangeDetectorRef
  ) {
    this.today = new Date().toISOString().split('T')[0];
  }

  ngOnInit(): void {
    const storedId = localStorage.getItem('empId');
    if (storedId) this.empId = storedId;

    this.initialLoad();
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.balancePollingSub?.unsubscribe();
    this.historyPollingSub?.unsubscribe();
    this.dashboardSub?.unsubscribe();
  }

  private initialLoad(): void {
    this.isLoading = true;
    
    // Fetch leave requests immediately on page load
    this.leaveService.getLeaveRequestsByEmpId(this.empId).subscribe({
      next: (requests) => {
        this.leaveRequests = requests;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = "Failed to load leave history.";
        this.cdr.detectChanges();
      }
    });

    // Fetch initial leave balances
    this.leaveService.getLeaveBalance(this.empId).subscribe(balances => {
        if(balances) {
            this.leaveBalances = balances.map(b => ({
                id: b.id,
                employeeId: b.empId,
                leaveType: b.leaveType,
                total: b.total,
                consumed: b.consumed,
                available: b.remaining,
                accrued: b.total,
                annualQuota: b.total
            }));
        }
    });
  }

  private startPolling(): void {
    // Polling for balance updates
    this.balancePollingSub = this.leaveService.startLeaveBalancePolling(this.empId).subscribe();
    
    // Polling for full history and status updates (Provides a real-time feel)
    this.historyPollingSub = this.leaveService.startLeaveHistoryPolling(this.empId).subscribe(requests => {
      if (requests && JSON.stringify(this.leaveRequests) !== JSON.stringify(requests)) {
        this.leaveRequests = requests;
        this.cdr.detectChanges();
      }
    });
  }

  submitLeaveApplication(): void {
    if (!this.leaveForm.fromDate || !this.leaveForm.toDate || !this.leaveForm.reason) {
      this.alertService.warning('Please fill all fields');
      return;
    }

    this.isSubmitting = true;
    this.leaveService.applyLeave(this.empId, this.leaveForm).subscribe({
      next: () => {
        this.alertService.success('Application submitted successfully!');
        this.showLeaveModal = false;
        this.isSubmitting = false;
        this.resetLeaveForm();
        
        // Refresh the list immediately so the new request appears in the table
        this.leaveService.getLeaveRequestsByEmpId(this.empId).subscribe(res => {
            this.leaveRequests = res;
            this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.alertService.error(err.error?.message || 'Submission failed');
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }
    });
  }

  cancelLeaveRequest(leaveRequestId: number): void {
    const leave = this.leaveRequests.find(r => r.leaveRequestId === leaveRequestId);
    if (!leave) return;

    this.leaveService.cancelLeaveRequest(leaveRequestId, this.empId, leave).subscribe({
      next: () => {
        this.alertService.success('Leave cancelled successfully');
        
        // Refresh history to reflect the cancellation
        this.leaveService.getLeaveRequestsByEmpId(this.empId).subscribe(res => {
            this.leaveRequests = res;
            this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.alertService.error(err.error?.message || 'Failed to cancel leave');
      }
    });
  }

  resetLeaveForm(): void {
    this.leaveForm = { leaveType: 'CASUAL', fromDate: '', toDate: '', reason: '' };
  }

  calculateDays(fromDate: string, toDate: string): number {
    if (!fromDate || !toDate) return 0;
    const diff = Math.abs(new Date(toDate).getTime() - new Date(fromDate).getTime());
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  }

  getLeaveStatusClass(status: string): string {
    const s = status?.toUpperCase();
    if (s === 'APPROVED') return 'status-approved';
    if (s === 'PENDING' || s === 'APPLIED') return 'status-pending';
    if (s === 'REJECTED' || s === 'CANCELLED') return 'status-rejected';
    return 'status-default';
  }
}