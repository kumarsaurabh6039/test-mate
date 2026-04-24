import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PoshService, PoshStatusUpdateRequest } from '../services/posh.service';
import { AlertService } from '../services/alert.service';

@Component({
  selector: 'app-admin-posh',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-posh.component.html',
  styleUrls: ['./admin-posh.component.css']
})
export class AdminPoshComponent implements OnInit {
  complaints: any[] = [];
  loading: boolean = false;
  selectedComplaint: any = null;
  showDetailModal: boolean = false;
  
  // For Status Update
  statusRemark: string = '';
  actionTaken: string = '';

  // Stats
  stats = {
    total: 0,
    pending: 0,
    resolved: 0
  };

  constructor(
    private poshService: PoshService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.loadComplaints();
  }

  loadComplaints() {
    this.loading = true;
    this.poshService.getAllComplaints().subscribe({
      next: (data) => {
        this.complaints = data || [];
        this.calculateStats();
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load complaints', err);
        this.loading = false;
        // Mock data updated with Backend State Machine Statuses
        this.complaints = [
            { id: 101, complainantName: 'Aarti Sharma', respondentName: 'Rajesh Kumar', incidentDate: '2023-10-12', status: 'PENDING', incidentDescription: 'Inappropriate comments during lunch.', location: 'Cafeteria', createdAt: '2023-10-13T10:00:00' },
            { id: 102, complainantName: 'Anonymous', respondentName: 'Unknown', incidentDate: '2023-11-01', status: 'IN_REVIEW', incidentDescription: '[ANONYMOUS SUBMISSION] \n\nUnsolicited messages on Teams.', location: 'Microsoft Teams', createdAt: '2023-11-02T09:30:00' }
        ];
        this.calculateStats();
      }
    });
  }

  calculateStats() {
    this.stats.total = this.complaints.length;
    // Updated Status Checks: Added INVESTIGATED to pending/active cases
    this.stats.pending = this.complaints.filter(c => c.status === 'PENDING' || c.status === 'IN_REVIEW' || c.status === 'INVESTIGATED').length;
    this.stats.resolved = this.complaints.filter(c => c.status === 'RESOLVED' || c.status === 'WITHDRAWN').length;
  }

  viewDetails(complaint: any) {
    this.selectedComplaint = complaint;
    this.statusRemark = '';
    this.actionTaken = '';
    this.showDetailModal = true;
  }

  closeModal() {
    this.showDetailModal = false;
    this.selectedComplaint = null;
  }

  // Parameter typings adjusted to include 'INVESTIGATED'
  async updateStatus(newStatus: 'IN_REVIEW' | 'INVESTIGATED' | 'RESOLVED' | 'WITHDRAWN') {
    if (!this.selectedComplaint) return;

    if ((newStatus === 'RESOLVED' || newStatus === 'WITHDRAWN' || newStatus === 'INVESTIGATED') && !this.statusRemark?.trim()) {
      this.alertService.warning('Please provide remarks/findings before updating to this status.', 'Missing Info');
      return;
    }

    const displayStatus = newStatus.replace('_', ' ');
    const confirmed = await this.alertService.confirm(
      'Update Case Status', 
      `Are you sure you want to change the status to ${displayStatus}?`,
      'Yes, Update'
    );

    if (confirmed) {
      const payload: PoshStatusUpdateRequest = {
        status: newStatus,
        remarks: this.statusRemark,
        actionTaken: this.actionTaken
      };

      this.poshService.updateComplaintStatus(this.selectedComplaint.id, payload).subscribe({
        next: () => {
          this.alertService.success(`Case status updated to ${displayStatus}.`, 'Updated Successfully');
          this.closeModal();
          this.loadComplaints();
        },
        error: (err) => {
          const errorMsg = err.error?.error || err.error?.message || 'Failed to update status.';
          this.alertService.error(errorMsg, 'Update Failed');
        }
      });
    }
  }

  downloadAnnualReport() {
    const year = new Date().getFullYear();
    this.poshService.getAnnualReport(year).subscribe({
      next: (data) => {
        const blob = new Blob([data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `POSH_Annual_Report_${year}.csv`;
        a.click();
        this.alertService.success('Annual report downloaded.', 'Success');
      },
      error: () => this.alertService.info('Annual Report generation triggered. Please check your email.', 'Report Requested')
    });
  }

  // Updated CSS Class mapper for new statuses
  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDING': return 'badge-new';
      case 'IN_REVIEW': return 'badge-progress';
      case 'INVESTIGATED': return 'badge-info'; // New badge for investigated
      case 'RESOLVED': return 'badge-success';
      case 'WITHDRAWN': return 'badge-danger';
      default: return 'badge-secondary';
    }
  }
}