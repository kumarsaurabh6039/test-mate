import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription, interval } from 'rxjs';
import { UserService, HolidayResponse } from '../../user-service.service';
import { AlertService } from '../../services/alert.service';
import { LeaveService, LeaveType } from '../../services/leave.service';
import { AdminNotificationComponent } from 'src/app/admin-notification/admin-notification.component';

@Component({
  selector: 'app-admin-holidays',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule,
    AdminNotificationComponent
  ],
  templateUrl: './admin-holidays.component.html',
  styleUrls: ['./admin-holidays.component.css']
})
export class AdminHolidaysComponent implements OnInit, OnDestroy {
  activeTab: 'holidays' | 'leaves' | 'notifications' = 'holidays';
  
  holidays: HolidayResponse[] = [];
  leaveTypes: LeaveType[] = [];
  
  holidayForm: FormGroup;
  leaveTypeForm: FormGroup;
  
  showModal = false;
  isEditing = false;
  currentId: number | null = null;
  orgCode = 'DEFAULT';
  isLoading = false; 
  
  private subs = new Subscription();

  constructor(
    private fb: FormBuilder, 
    private userService: UserService, 
    private leaveService: LeaveService,
    private alert: AlertService
  ) {
    this.holidayForm = this.fb.group({
      name: ['', Validators.required],
      date: ['', Validators.required],
      location: ['', Validators.required],
      description: [''],
      optional: [false]
    });

    this.leaveTypeForm = this.fb.group({
      name: ['', Validators.required],
      annualQuota: [0, [Validators.required, Validators.min(1)]]
    });
  }

  ngOnInit() {
    this.userService.getOrgCode().subscribe(c => this.orgCode = c || 'DEFAULT');
    
    // Initial data load
    this.loadHolidays();

    // Polling logic
    this.subs.add(
      interval(30000).subscribe(() => {
        if (this.activeTab !== 'notifications') {
           this.refreshData();
        }
      })
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  refreshData() {
    if (this.activeTab === 'holidays') {
      this.loadHolidays();
    } else if (this.activeTab === 'leaves') {
      this.loadLeaveTypes();
    }
  }

  setTab(tab: 'holidays' | 'leaves' | 'notifications') {
    this.activeTab = tab;
    if (tab !== 'notifications') {
      this.refreshData();
    }
  }

  loadHolidays() {
    this.isLoading = true;
    this.userService.getAllHolidays().subscribe({
      next: (response: any) => {
        const data: HolidayResponse[] = Array.isArray(response) ? response : (response?.holidays || []);
        this.holidays = data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  loadLeaveTypes() {
    this.isLoading = true;
    this.leaveService.getAllLeaveTypes().subscribe({
      next: (data) => {
        this.leaveTypes = data;
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  openCreate() {
    this.isEditing = false;
    this.currentId = null;
    this.holidayForm.reset({ optional: false, location: 'Global' });
    this.leaveTypeForm.reset({ annualQuota: 0 });
    this.showModal = true;
  }

  openEditHoliday(h: HolidayResponse) {
    this.isEditing = true;
    this.currentId = h.id || null;

    // HTML5 input type="date" exact YYYY-MM-DD format maangta hai.
    // Agar date '2026-04-23T00:00:00' jaisi aaye toh sirf shuru ke 10 characters le lo
    let formattedDate = '';
    if (h.date && h.date.length >= 10) {
      formattedDate = h.date.substring(0, 10);
    }

    this.holidayForm.patchValue({
      name: h.name || '',
      date: formattedDate, // Ab ye form mein ekdum sahi se fill hoga
      location: h.location || 'Global',
      description: h.description || '',
      optional: this.isHolidayOptional(h)
    });
    this.showModal = true;
  }

  openEditLeaveType(lt: LeaveType) {
    this.isEditing = true;
    this.currentId = lt.id || null;
    this.leaveTypeForm.patchValue({
      name: lt.name,
      annualQuota: lt.annualQuota
    });
    this.showModal = true;
  }

  deleteLeaveType(id: number) {
    if (confirm('Are you sure you want to delete this leave type?')) {
      this.leaveService.deleteLeaveType(id).subscribe({
        next: () => {
          this.alert.success('Leave type deleted');
          this.loadLeaveTypes();
        },
        error: () => this.alert.error('Failed to delete')
      });
    }
  }

  submit() {
    if (this.activeTab === 'holidays') {
      this.handleHolidaySubmit();
    } else if (this.activeTab === 'leaves') {
      this.handleLeaveTypeSubmit();
    }
  }

  handleHolidaySubmit() {
    if (this.holidayForm.invalid) return;
    
    const formValues = this.holidayForm.value;
    const isOpt = formValues.optional === true || formValues.optional === 'true';

    let obs;

    // Swagger ke anusaar, Create aur Update ke payload variables alag hain
    if (this.isEditing && this.currentId) {
        // Update ke waqt: 'isOptional' variable chahiye
        const updatePayload = {
            name: formValues.name,
            date: formValues.date,
            location: formValues.location,
            description: formValues.description,
            isOptional: isOpt
        };
        obs = this.userService.updateHoliday(this.currentId, updatePayload);
    } else {
        // Create ke waqt: 'optional' variable chahiye
        const createPayload = {
            name: formValues.name,
            date: formValues.date,
            location: formValues.location,
            description: formValues.description,
            optional: isOpt
        };
        obs = this.userService.createHoliday(createPayload);
    }

    obs.subscribe({
      next: () => {
        this.showModal = false;
        this.alert.success(this.isEditing ? 'Holiday updated' : 'Holiday added');
        this.loadHolidays();
      },
      error: () => this.alert.error('Operation failed')
    });
  }

  handleLeaveTypeSubmit() {
    if (this.leaveTypeForm.invalid) return;
    const payload: LeaveType = { ...this.leaveTypeForm.value, orgCode: this.orgCode };

    const obs = (this.isEditing && this.currentId)
      ? this.leaveService.updateLeaveType(this.currentId, payload)
      : this.leaveService.createLeaveType(payload);

    obs.subscribe({
      next: () => {
        this.showModal = false;
        this.alert.success(this.isEditing ? 'Leave type updated' : 'Leave type created');
        this.loadLeaveTypes();
      },
      error: () => this.alert.error('Failed to save leave type')
    });
  }

  // Backend optional ya isOptional dono mein se koi bhi bheje, usko check karne ke liye
  isHolidayOptional(h: any): boolean {
    if (!h) return false;
    return h.optional === true || h.optional === 'true' || h.isOptional === true || h.isOptional === 'true';
  }
}