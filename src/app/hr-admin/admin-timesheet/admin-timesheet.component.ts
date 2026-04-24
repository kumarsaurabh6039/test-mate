import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimesheetService, TimesheetDTO } from '../../services/timesheet.service';
import { AttendanceService, AttendanceDTO } from '../../services/attendance.service';
import { UserService, EmployeeDTO } from '../../user-service.service';

@Component({
  selector: 'app-admin-timesheet',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-timesheet.component.html',
  styleUrls: ['./admin-timesheet.component.css']
})
export class AdminTimesheetComponent implements OnInit {
  employees: EmployeeDTO[] = [];
  
  // View Toggle State
  viewMode: 'timesheet' | 'attendance' = 'timesheet';
  
  // Timesheet Data
  allTimesheets: TimesheetDTO[] = [];
  filteredTimesheets: TimesheetDTO[] = [];
  
  // Attendance Summary Data
  allAttendance: AttendanceDTO[] = [];
  filteredAttendance: AttendanceDTO[] = [];
  
  selectedEmpId: string = '';
  // Set default date to Today
  selectedDate: string = new Date().toISOString().slice(0, 10);
  isLoading: boolean = false;

  constructor(
    private timesheetService: TimesheetService,
    private attendanceService: AttendanceService,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.loadInitialData();
  }

  loadInitialData() {
    this.isLoading = true;
    
    this.userService.getAllEmployees().subscribe({
      next: (response: any) => {
        const emps = response.users || response.data || response || [];
        this.employees = Array.isArray(emps) ? emps : [];
      },
      error: () => console.warn('Could not load employees')
    });

    this.refreshData();
  }

  setViewMode(mode: 'timesheet' | 'attendance') {
    this.viewMode = mode;
    this.refreshData();
  }

  refreshData() {
    this.isLoading = true;
    if (this.viewMode === 'timesheet') {
      this.timesheetService.getAllTimesheets().subscribe({
        next: (res: any) => {
          this.allTimesheets = res.timesheets || res.data || res || [];
          this.applyFilters();
          this.isLoading = false;
        },
        error: () => { this.allTimesheets = []; this.isLoading = false; }
      });
    } else {
      // Fetching ALL attendances instead of only pending ones
      this.attendanceService.getAllAttendances().subscribe({ 
        next: (res: any) => {
          this.allAttendance = res.attendances || res.data || res || [];
          this.applyFilters();
          this.isLoading = false;
        },
        error: () => { this.allAttendance = []; this.isLoading = false; }
      });
    }
  }

  applyFilters() {
    if (this.viewMode === 'timesheet') {
      let data = Array.isArray(this.allTimesheets) ? [...this.allTimesheets] : [];
      if (this.selectedEmpId) data = data.filter(t => t.employeeId === this.selectedEmpId);
      if (this.selectedDate) data = data.filter(t => t.workDate === this.selectedDate);
      this.filteredTimesheets = data.sort((a, b) => new Date(b.workDate).getTime() - new Date(a.workDate).getTime());
    } else {
      let data = Array.isArray(this.allAttendance) ? [...this.allAttendance] : [];
      if (this.selectedEmpId) data = data.filter(t => t.empId === this.selectedEmpId);
      if (this.selectedDate) data = data.filter(t => t.date === this.selectedDate);
      this.filteredAttendance = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
  }

  getEmployeeName(empId: string): string {
    const emp = this.employees.find(e => e.empId === empId);
    return emp ? `${emp.firstName} ${emp.surname}` : empId;
  }

  getAttendanceStatusClass(status: string): string {
    if (!status) return 'status-submitted';
    
    switch(status.toUpperCase()) {
      case 'APPROVED':
      case 'PRESENT':
      case 'WORK_FROM_HOME':
        return 'status-approved';
      case 'REJECTED':
      case 'ABSENT':
      case 'LEAVE':
        return 'status-rejected';
      case 'PENDING':
      case 'LATE':
      case 'HALF_DAY':
        return 'status-submitted';
      default: 
        return 'status-submitted';
    }
  }
}