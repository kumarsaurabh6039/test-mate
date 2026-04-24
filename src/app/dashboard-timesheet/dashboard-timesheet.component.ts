import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../user-service.service';
import { TimesheetService, TimesheetDTO, TimesheetCreateRequest } from '../services/timesheet.service';
import { AlertService } from '../services/alert.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-dashboard-timesheet',
  templateUrl: './dashboard-timesheet.component.html',
  styleUrls: ['./dashboard-timesheet.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class DashboardTimesheetComponent implements OnInit {
  isLoading = false;
  timesheets: TimesheetDTO[] = [];
  
  // Default to today's date for filter
  filterDate: string = new Date().toISOString().slice(0, 10);

  isEditing = false;
  editingId: number | null = null;
  
  // Form fields
  formDate: string = new Date().toISOString().slice(0, 10);
  // Removed formHours
  formRemarks: string = '';
  formStatus: string = 'Submitted';

  constructor(
    private userService: UserService,
    private timesheetService: TimesheetService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.loadTimesheets();
  }

  loadTimesheets(): void {
    this.isLoading = true;
    const myId = this.userService.getEmpIdFromToken();
    if (!myId) { 
        this.isLoading = false; 
        return; 
    }

    this.timesheetService.getAllTimesheets().subscribe({
        next: (response: any) => {
            // ROBUST EXTRACTION
            let data: TimesheetDTO[] = [];
            if (response && Array.isArray(response.timesheets)) {
                data = response.timesheets;
            } else if (response && Array.isArray(response.data)) {
                data = response.data;
            } else if (Array.isArray(response)) {
                data = response;
            }

            // Client-side Filtering
            let filtered = data.filter(t => t.employeeId === myId);
            
            // Apply Date Filter if set
            if (this.filterDate) {
                filtered = filtered.filter(t => t.workDate === this.filterDate);
            }
            
            this.timesheets = filtered.sort((a, b) => new Date(b.workDate).getTime() - new Date(a.workDate).getTime());
            this.isLoading = false;
        },
        error: (err: HttpErrorResponse) => {
            console.error('Error fetching timesheets', err);
            this.isLoading = false;
        }
    });
  }

  submitTimesheet(): void {
    const empId = this.userService.getEmpIdFromToken();
    if (!empId) {
        this.alertService.error('User session not found. Please login again.');
        return;
    }

    // Prepare payload: Hours set to 0 as per request (Work Update Only)
    const payload: TimesheetCreateRequest = {
        empId: empId,
        date: this.formDate,
        checkInTime: '', 
        checkOutTime: '', 
        hoursWorked: 0, // Placeholder value since hours are no longer tracked
        remarks: this.formRemarks || 'Work Update',
        status: this.formStatus,
        taskDescription: this.formRemarks || 'Work Update',
        projectName: 'General'
    };

    this.isLoading = true;

    if (this.isEditing && this.editingId) {
        this.timesheetService.updateTimesheet(this.editingId, payload).subscribe({
            next: () => {
                this.resetForm();
                this.loadTimesheets();
                this.alertService.success('Update submitted successfully!');
            },
            error: (err: HttpErrorResponse) => {
                console.error('Update failed', err);
                this.isLoading = false;
                this.alertService.error('Failed to update entry.');
            }
        });
    } else {
        this.timesheetService.createTimesheet(payload).subscribe({
            next: () => {
                this.resetForm();
                this.loadTimesheets();
                this.alertService.success('Work update submitted successfully!');
            },
            error: (err: HttpErrorResponse) => {
                console.error('Create failed', err);
                this.isLoading = false;
                this.alertService.error('Failed to submit entry.');
            }
        });
    }
  }

  async deleteTimesheet(id: number) {
    const confirmed = await this.alertService.confirm(
      'Delete Entry?', 
      'Are you sure you want to delete this work update?'
    );

    if (confirmed) {
        this.isLoading = true;
        this.timesheetService.deleteTimesheet(id).subscribe({
            next: () => {
                this.loadTimesheets();
                this.alertService.success('Entry deleted successfully');
            },
            error: (err: HttpErrorResponse) => {
                console.error('Delete failed', err);
                this.isLoading = false;
                this.alertService.error('Failed to delete entry');
            }
        });
    }
  }

  editTimesheet(log: TimesheetDTO): void {
    this.isEditing = true;
    this.editingId = log.id;
    this.formDate = log.workDate;
    // Removed formHours assignment
    this.formRemarks = log.remarks;
    this.formStatus = log.status;
    
    const formEl = document.querySelector('.entry-form');
    if(formEl) formEl.scrollIntoView({ behavior: 'smooth' });
  }

  resetForm(): void {
    this.isEditing = false;
    this.editingId = null;
    // Always reset to today's date
    this.formDate = new Date().toISOString().slice(0, 10);
    this.formRemarks = '';
    this.formStatus = 'Submitted';
  }
}