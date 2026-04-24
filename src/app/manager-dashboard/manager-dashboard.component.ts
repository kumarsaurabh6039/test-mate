import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl, Validators, FormBuilder, FormGroup } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Subscription, interval, of } from 'rxjs';
import { startWith, switchMap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import Swal from 'sweetalert2';
import { AlertService } from '../services/alert.service';

// Services
import { UserService, HolidayResponse, DashboardData, EmployeeInfoResponse, LeaveBalanceResponse, IndividualAttendanceRecordResponse } from '../user-service.service';
import { LeaveService, LeaveRequest } from '../services/leave.service'; 
import { AttendanceService, AttendanceDTO } from '../services/attendance.service';
import { ProfileService } from '../services/profile.service'; 
import { DashboardTimesheetComponent } from '../dashboard-timesheet/dashboard-timesheet.component';
import { LeavesComponent } from '../leaves/leaves.component'; 
import { DashboardSwipedataComponent } from '../dashboard-swipedata/dashboard-swipedata.component';
import { PayslipComponent } from '../payslip/payslip.component'; 
import { DashboardTeamComponent } from '../dashboard-team/dashboard-team.component';
import { ProfileManageComponent } from '../profile-manage/profile-manage.component';
import { ExitRequestDTO, ExitService, EmployeeExitRequest } from '../services/exit.service';
import { PoshComponent } from '../posh/posh.component';
import { EmployeeTrainingComponent } from '../employee-training/employee-training.component';
import { NotificationService } from '../services/notification.service';

export interface DashboardLeaveRequest extends LeaveRequest {
  avatar?: string;
  appliedDate?: string;
  displayStatus?: string; 
}

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    HttpClientModule, 
    ReactiveFormsModule,
    DashboardTimesheetComponent,
    LeavesComponent,
    DashboardSwipedataComponent,
    ProfileManageComponent,
    DashboardTeamComponent,
    PayslipComponent,
    PoshComponent,
    EmployeeTrainingComponent
  ],
  templateUrl: './manager-dashboard.component.html',
  styleUrls: ['./manager-dashboard.component.css']
})
export class ManagerDashboardComponent implements OnInit, OnDestroy {
  
  // UI Navigation
  activePage: string = 'dashboard'; 
  leaveViewMode: 'apply' | 'approve' = 'apply'; 
  exitViewMode: 'apply' | 'approve' = 'apply'; // Toggle for Exit

  // Data Loading
  loadingDashboardData: boolean = false;
  
  // User Profile
  userName: string = 'Manager';
  userProfileImageUrl: string | null = null;
  employeeInfo: EmployeeInfoResponse | null = null;
  showProfileMenu: boolean = false;
  managerEmpId: string = '';
  orgCode: string = ''; // For Exit service

  // Notifications
  showNotifications: boolean = false;
  notifications: any[] = [];
  unreadCount: number = 0;

  // Profile Modal & Onboarding
  isProfileModalVisible: boolean = false;
  profileActiveTab: 'details' | 'security' = 'details';
  isOnboarded: boolean = false;
  showOnboardingPopup: boolean = false;
  profileSetupAcknowledged: boolean = false;

  // Time & Greeting
  greeting: string = 'Good Morning';
  currentTime: string = '';
  currentDayOfWeek: string = '';
  currentDayOfWeekShort: string = '';
  currentDay: number = 0;
  currentMonth: string = '';
  todayDate: Date = new Date();
  
  // Time Tracking
  timeTrackingTimer: string = '00:00:00';
  totalWorkingHours: string = '00:00';
  breakDurationDisplay: string = '00:00';
  pendingWorkingHours: string = '09:00';
  isWorking: boolean = false;
  clockLog: { in: Date, out?: Date }[] = [];

  // Break Management
  isBreakActive: boolean = false;
  currentBreakType: string | null = null;
  breakStartTime: Date | null = null;
  breakTimerDisplay: string = '00:00:00';
  breakElapsedSeconds: number = 0;
  totalBreakSecondsToday: number = 0;
  
  private readonly CIRCUMFERENCE: number = 2 * Math.PI * 54;
  readonly MAX_TARGET_HOURS: number = 9;
  readonly MAX_TARGET_MINUTES: number = 9 * 60;

  // Leave Balances (Personal)
  casualLeaveUsed: number = 0; casualLeaveTotal: number = 0;
  sickLeaveUsed: number = 0; sickLeaveTotal: number = 0;
  assignmentLeaveUsed: number = 0; assignmentLeaveTotal: number = 0;

  // Manager Approval Data
  allLeavesRequests: DashboardLeaveRequest[] = []; 
  pendingLeaves: DashboardLeaveRequest[] = []; 
  displayedLeaves: DashboardLeaveRequest[] = []; 
  leaveFilter: 'pending' | 'all' = 'pending';
  
  // Exit Request Data (Manager)
  managerExitRequests: EmployeeExitRequest[] = [];
  myExitRequest: EmployeeExitRequest | null = null;
  
  // Flag to stop polling forbidden endpoints - Disabled Org Search for Manager
  private hasOrgExitPermission: boolean = false;

  // Attendance Regularization Data (Manager Specific)
  pendingRegularizations: AttendanceDTO[] = [];
  showRegularizationModal: boolean = false;
  
  stats = { 
    pendingRequests: 0,
    pendingAttendance: 0 
  };
  
  // Calendar & Schedule
  calendarDays: any[] = [];
  
  fullScheduleDetails: { 
    date: string, 
    desc: string, 
    type: 'attendance' | 'holiday' | 'leave' | 'payday' | 'meeting', 
    canApplyLeave?: boolean, 
    dayOfWeekShort?: string, 
    dayOfMonth?: string 
  }[] = [];
  
  scheduleDetails: typeof this.fullScheduleDetails = [];
  selectedMonthYear: string = '';
  displayedWeekStart: Date = new Date();
  selectedScheduleDate: Date | null = null;
  selectedDateForLeave: Date | null = null;
  
  nextHolidays: HolidayResponse[] = [];
  allHolidays: HolidayResponse[] = [];
  
  // Attendance Records
  attendanceRecords: IndividualAttendanceRecordResponse[] = [];
  showAttendanceDetailsModal: boolean = false;
  showLeaveApplicationModal: boolean = false;

  // Video
  showVideo: boolean = false;
  youtubeVideoId: string = 'Z3KnTeDqGEo';
  safeVideoUrl: SafeResourceUrl | null = null;

  // Forms
  leaveTypeControl = new FormControl('', Validators.required);
  leaveReasonControl = new FormControl('', Validators.required);
  
  // --- Exit / Resignation Form State ---
  exitForm: FormGroup;
  isExitSubmitting: boolean = false;
  readonly NOTICE_PERIOD_DAYS = 60;
  
  globalMessage: { message: string, type: string } | null = null;

  // Subscriptions
  private pollingSub?: Subscription;
  private timeSubscription?: Subscription;
  private msgSub?: Subscription;
  private profilePicSubscription?: Subscription;
  private notificationPollingSub?: Subscription;

  // Browser Back Button Disable Karne Ke Liye HostListener
  @HostListener('window:popstate', ['$event'])
  onPopState(event: Event) {
    // Back button press hone par current URL ko fir se history me push kar dete hain
    window.history.pushState(null, '', window.location.href);
  }

  constructor(
    private userService: UserService,
    private leaveService: LeaveService,
    private attendanceService: AttendanceService,
    private profileService: ProfileService,
    private router: Router,
    private alertService: AlertService,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
    private fb: FormBuilder,
    private exitService: ExitService, // INJECT EXIT SERVICE
    private notificationService: NotificationService // INJECT NOTIFICATION SERVICE
  ) {
    this.safeVideoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${this.youtubeVideoId}?autoplay=1`);
    
    // Initialize Exit Form
    this.exitForm = this.fb.group({
      earlyReleaseRequested: [false],
      empId: [''], // Will be filled from localStorage or data
      exitType: ['Resignation', Validators.required],
      lastWorkingDate: ['', Validators.required],
      noticeBuyoutAmount: [{ value: 0, disabled: true }], 
      noticePeriodDays: [this.NOTICE_PERIOD_DAYS],
      reason: ['', [Validators.required, Validators.minLength(10)]],
      resignationDate: [new Date().toISOString().substring(0, 10), Validators.required]
    });
  }

  ngOnInit(): void {
    // Initialization par ek dummy state push karte hain taaki back navigation trap ho jaye
    window.history.pushState(null, '', window.location.href);

    const storedId = this.userService.getEmpId();
    const storedOrg = localStorage.getItem('orgCode') || 'ORG001';
    this.orgCode = storedOrg;

    if (storedId) {
        this.managerEmpId = storedId;
        this.loadPersonalDashboardData();
        this.initRealTimeData();
        this.initRealTimeNotifications(this.managerEmpId);
    } else {
        this.router.navigate(['/login']);
    }

    // --- PROFILE IMAGE SYNC LOGIC ---
    this.profilePicSubscription = this.profileService.profileImage$.subscribe(url => {
        this.userProfileImageUrl = url;
        this.cdr.detectChanges(); 
    });
    
    const savedImage = localStorage.getItem('userProfileImage');
    if (savedImage && savedImage !== 'null') {
        this.userProfileImageUrl = savedImage;
        this.profileService.updateImageState(savedImage);
    }
    
    const cachedName = localStorage.getItem('cachedUserName');
    if (cachedName) {
        this.userName = cachedName;
    }
    
    this.loadTodayBreakTime();
    this.updateClock();
    
    this.timeSubscription = interval(1000).subscribe(() => {
        this.updateClock();
        if (this.isWorking || this.isBreakActive || this.clockLog.length > 0) {
           this.calculateTimeTracking();
        }
    });

    const now = new Date();
    this.displayedWeekStart = new Date(now.getFullYear(), now.getMonth(), 1); 
    this.selectedScheduleDate = now; 
    
    this.msgSub = this.userService.getMessageUpdates().subscribe(msg => {
        this.globalMessage = msg;
        this.cdr.detectChanges(); 
    });

    // --- EXIT FORM LISTENERS ---
    this.setupExitFormListeners();
  }

  ngOnDestroy(): void {
    if (this.pollingSub) this.pollingSub.unsubscribe();
    if (this.timeSubscription) this.timeSubscription.unsubscribe();
    if (this.msgSub) this.msgSub.unsubscribe();
    if (this.profilePicSubscription) this.profilePicSubscription.unsubscribe();
    if (this.notificationPollingSub) this.notificationPollingSub.unsubscribe();
  }

  // --- NAYA HOST LISTENER: Cross-tab logout fix ke liye ---
  @HostListener('window:storage', ['$event'])
  onStorageChange(event: StorageEvent) {
    // Agar kisi aur tab se token remove ya clear ho jata hai
    if (event.key === 'authToken' && !event.newValue) {
      this.userService.clearAuthToken();
      this.profileService.clearProfileData();
      this.router.navigate(['/login']);
    }
    // Storage clear hone par (event.key null return karta hai)
    if (event.key === null && !localStorage.getItem('authToken')) {
      this.userService.clearAuthToken();
      this.profileService.clearProfileData();
      this.router.navigate(['/login']);
    }
  }

  // --- NOTIFICATION LOGIC ---
  initRealTimeNotifications(empId: string) {
    this.notificationPollingSub = this.notificationService.startNotificationPolling(empId, 30000).subscribe({
        next: (notifs: any[]) => {
            this.notifications = notifs.map(n => ({
                ...n,
                type: this.getNotificationUIType(n.type),
                read: n.status === 'READ' || n.status === 'ARCHIVED',
            })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            this.updateUnreadCount();
            this.cdr.detectChanges();
        },
        error: (err) => console.error('Error fetching real-time notifications:', err)
    });
  }

  getNotificationUIType(backendType: string): string {
      const successTypes = ['LEAVE_APPROVED', 'TIMESHEET_APPROVED', 'PAYSLIP_GENERATED'];
      const warningTypes = ['LEAVE_REJECTED', 'TIMESHEET_REJECTED'];
      if (successTypes.includes(backendType)) return 'success';
      if (warningTypes.includes(backendType)) return 'warning';
      return 'info';
  }

  updateUnreadCount() {
    this.unreadCount = this.notifications.filter(n => !n.read).length;
  }

  toggleNotifications(event?: Event) {
    if (event) event.stopPropagation();
    this.showNotifications = !this.showNotifications;
    this.showProfileMenu = false;
  }

  markAllAsReadRealtime() {
    const empId = this.managerEmpId || localStorage.getItem('empId') || 'EMP-001';
    this.notificationService.markAllAsRead(empId).subscribe({
        next: () => {
            this.notifications.forEach(n => n.read = true);
            this.updateUnreadCount();
            this.cdr.detectChanges();
        },
        error: (err) => console.error('Error marking all as read:', err)
    });
  }

  markSingleAsRead(notification: any, event: Event) {
      event.stopPropagation();
      if (notification.read) return;

      const empId = this.managerEmpId || localStorage.getItem('empId') || 'EMP-001';
      this.notificationService.markAsRead(notification.id, empId).subscribe({
          next: () => {
              notification.read = true;
              this.updateUnreadCount();
              this.cdr.detectChanges();
          },
          error: (err) => console.error('Error marking notification as read:', err)
      });
  }

  // --- EXIT FORM LOGIC ---
  private setupExitFormListeners(): void {
    const empId = localStorage.getItem('empId') || this.managerEmpId || 'EMP-001'; 
    this.exitForm.patchValue({ empId: empId });
    this.calculateLWD();

    this.exitForm.get('earlyReleaseRequested')?.valueChanges.subscribe(isEarly => {
        if (isEarly) {
            this.exitForm.get('noticeBuyoutAmount')?.enable();
        } else {
            this.exitForm.get('noticeBuyoutAmount')?.disable();
            this.exitForm.patchValue({ noticeBuyoutAmount: 0 });
            this.calculateLWD();
        }
    });

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
        lwd.setDate(resDate.getDate() + this.NOTICE_PERIOD_DAYS);
        this.exitForm.patchValue({ lastWorkingDate: lwd.toISOString().substring(0, 10) });
    }
  }

  calculateBuyout(lwdStr: string): void {
      const resDate = new Date(this.exitForm.get('resignationDate')?.value);
      const standardLWD = new Date(resDate);
      standardLWD.setDate(resDate.getDate() + this.NOTICE_PERIOD_DAYS);
      const actualLWD = new Date(lwdStr);
      const diffTime = standardLWD.getTime() - actualLWD.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
          const estimatedBuyout = diffDays * 2000; // Mock Calculation
          this.exitForm.patchValue({ noticeBuyoutAmount: estimatedBuyout }, { emitEvent: false });
      } else {
          this.exitForm.patchValue({ noticeBuyoutAmount: 0 }, { emitEvent: false });
      }
  }

  toggleEarlyRelease(): void {
      const current = this.exitForm.get('earlyReleaseRequested')?.value;
      this.exitForm.patchValue({ earlyReleaseRequested: !current });
  }

  onExitSubmit(): void {
    if (this.exitForm.invalid) {
        this.exitForm.markAllAsTouched();
        this.userService.dispatchMessage('Please correct the errors in the form.', 'warning');
        return;
    }
    this.isExitSubmitting = true;
    const formVal = this.exitForm.getRawValue();
    const payload: ExitRequestDTO = {
        empId: formVal.empId,
        exitType: formVal.exitType,
        reason: formVal.reason,
        resignationDate: formVal.resignationDate,
        lastWorkingDate: formVal.lastWorkingDate,
        noticePeriodDays: Number(formVal.noticePeriodDays),
        earlyReleaseRequested: Boolean(formVal.earlyReleaseRequested),
        noticeBuyoutAmount: Number(formVal.noticeBuyoutAmount) || 0
    };

    this.exitService.submitResignation(payload).subscribe({
        next: (response) => {
            this.isExitSubmitting = false;
            this.userService.dispatchMessage('Resignation application submitted successfully.', 'success');
            this.myExitRequest = response; 
            
            // SAVE ID TO STORAGE (Fix for 403 Error on reload)
            if (response && response.id) {
                localStorage.setItem('lastExitRequestId', response.id.toString());
            }
        },
        error: (err) => {
            this.isExitSubmitting = false;
            this.userService.dispatchMessage(err.error?.message || 'Failed to submit resignation.', 'error');
        }
    });
  }
  
  onWithdrawExit(): void {
    if (!this.myExitRequest) return;
    Swal.fire({
        title: 'Withdraw?',
        text: 'Are you sure you want to withdraw your resignation?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, Withdraw'
    }).then(res => {
        if(res.isConfirmed) {
            this.exitService.withdrawResignation(this.myExitRequest!.id, this.managerEmpId).subscribe({
                next: () => {
                    this.myExitRequest = null;
                    localStorage.removeItem('lastExitRequestId'); // Clear saved ID
                    this.exitForm.reset({
                      empId: this.managerEmpId,
                      resignationDate: new Date().toISOString().substring(0, 10),
                      noticePeriodDays: this.NOTICE_PERIOD_DAYS,
                      exitType: 'Resignation',
                      earlyReleaseRequested: false
                    });
                    this.calculateLWD();
                    this.alertService.success('Resignation Withdrawn');
                }
            });
        }
    });
  }

  onCancelExit(): void { this.activePage = 'dashboard'; }
  setActivePage(page: string) { 
      this.activePage = page; 
      if (page === 'exit') { 
          this.setupExitFormListeners(); 
          // Fetch my own exit request status
          this.loadMyExitStatus();
          // Fetch team requests if needed
          if (this.exitViewMode === 'approve') this.loadManagerExitRequests();
      }
  }
  
  setLeaveMode(mode: 'apply' | 'approve') { this.leaveViewMode = mode; }
  setExitMode(mode: 'apply' | 'approve') { 
      this.exitViewMode = mode; 
      if(mode === 'approve') this.loadManagerExitRequests();
      if(mode === 'apply') this.loadMyExitStatus();
  }

  // --- REAL TIME POLLING ---
  initRealTimeData() {
      // Load initially once
      this.loadManagerTeamData(); 
      this.loadPendingRegularizations();
      this.loadManagerExitRequests(); 

      this.pollingSub = interval(15000).pipe(
          startWith(0),
          switchMap(() => {
              // Fetch Manager Data in background
              this.loadManagerTeamData(); 
              this.loadPendingRegularizations();
              if(this.activePage === 'exit') {
                  this.loadManagerExitRequests();
                  this.loadMyExitStatus();
              }
              // Fetch Personal Data
              return this.userService.getEmployeeDashboardData().pipe(catchError(() => of(null)));
          })
      ).subscribe((data) => {
          if(data) this.processDashboardData(data as DashboardData);
      });
  }
  
  loadMyExitStatus() {
      if(!this.managerEmpId) return;

      // 1. Try to get specific request ID from storage
      const savedRequestId = localStorage.getItem('lastExitRequestId');
      
      if (savedRequestId) {
          this.exitService.getExitRequestById(+savedRequestId).subscribe({
              next: (req) => {
                  if (req && req.empId === this.managerEmpId && req.status !== 'WITHDRAWN') {
                      this.myExitRequest = req;
                  } else {
                      this.myExitRequest = null;
                      localStorage.removeItem('lastExitRequestId'); // Clean up invalid ID
                  }
              },
              error: () => {
                  // If ID fetch fails (e.g. 404), assume no active request.
                  // DO NOT call fetchExitStatusFrom Org() because it causes 403 for managers.
                  this.myExitRequest = null;
              }
          });
      } else {
          // If no ID in storage, assume no request.
          // We avoid calling organization search for Managers to prevent 403 Forbidden errors.
          this.myExitRequest = null;
      }
  }

  loadManagerExitRequests() {
      if(!this.managerEmpId) return;
      this.exitService.getExitRequestsForManager(this.managerEmpId).subscribe({
          next: (reqs) => {
              this.managerExitRequests = reqs;
          },
          error: (err) => console.error('Error loading exit requests', err)
      });
  }
  
  approveExit(req: EmployeeExitRequest) {
      Swal.fire({
          title: 'Approve Exit?',
          text: `Approve resignation for ${req.employeeName || req.empId}?`,
          input: 'text',
          inputPlaceholder: 'Enter comments (optional)',
          showCancelButton: true,
          confirmButtonText: 'Approve'
      }).then((result) => {
          if (result.isConfirmed) {
              const comments = result.value || 'Approved by Manager';
              this.exitService.approveExitByManager(req.id, this.managerEmpId, 'APPROVED', comments).subscribe({
                  next: () => {
                      this.alertService.success('Exit Approved');
                      this.loadManagerExitRequests();
                  },
                  error: (err) => this.alertService.error('Failed to approve')
              });
          }
      });
  }
  
  rejectExit(req: EmployeeExitRequest) {
      Swal.fire({
          title: 'Reject Exit?',
          text: 'Reason for rejection:',
          input: 'text',
          inputValidator: (value) => !value ? 'You need to write a reason!' : null,
          showCancelButton: true,
          confirmButtonText: 'Reject',
          confirmButtonColor: '#d33'
      }).then((result) => {
          if (result.isConfirmed) {
               this.exitService.approveExitByManager(req.id, this.managerEmpId, 'REJECTED', result.value).subscribe({
                  next: () => {
                      this.alertService.success('Exit Rejected');
                      this.loadManagerExitRequests();
                  },
                  error: (err) => this.alertService.error('Failed to reject')
              });
          }
      });
  }

  loadPersonalDashboardData() {
    this.loadingDashboardData = true;
    this.userService.getEmployeeDashboardData().subscribe({
        next: (data: DashboardData) => {
            this.processDashboardData(data);
            this.loadingDashboardData = false;
        },
        error: () => {
            this.loadingDashboardData = false;
            this.resetDashboardState();
        }
    });
  }

  loadPendingRegularizations() {
    this.attendanceService.getPendingRegularizations().subscribe({
      next: (res) => {
        this.pendingRegularizations = res.attendances || [];
        this.stats.pendingAttendance = this.pendingRegularizations.length;
      },
      error: (err) => {
        console.error('Error fetching pending regularizations:', err);
      }
    });
  }

  openRegularizationModal() { this.showRegularizationModal = true; }
  closeRegularizationModal() { this.showRegularizationModal = false; }

  approveRegularization(item: AttendanceDTO) {
    Swal.fire({
      title: 'Approve Attendance?',
      text: `Approve clock-in for ${item.employeeName || item.empId}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10B981',
      confirmButtonText: 'Approve'
    }).then((result) => {
      if (result.isConfirmed) {
        this.attendanceService.regularizeAttendance(item.id).subscribe({
          next: () => {
            this.alertService.success('Attendance approved');
            this.loadPendingRegularizations();
          },
          error: (err) => this.alertService.error(err.error?.message || 'Action failed')
        });
      }
    });
  }

  rejectRegularization(item: AttendanceDTO) {
    Swal.fire({
      title: 'Reject Attendance?',
      text: `Reject request for ${item.employeeName || item.empId}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      confirmButtonText: 'Reject'
    }).then((result) => {
      if (result.isConfirmed) {
        this.attendanceService.rejectAttendance(item.id).subscribe({
          next: () => {
            this.alertService.success('Attendance rejected');
            this.loadPendingRegularizations();
          },
          error: (err) => this.alertService.error(err.error?.message || 'Action failed')
        });
      }
    });
  }

  processDashboardData(data: DashboardData) {
    if (data.employeeInfo) {
        this.employeeInfo = data.employeeInfo;
        const firstName = data.employeeInfo.firstName || '';
        const surname = data.employeeInfo.surname || '';
        if (firstName || surname) {
            this.userName = `${firstName} ${surname}`.trim();
            localStorage.setItem('cachedUserName', this.userName); 
        }
        if (data.employeeInfo.empId) {
            this.exitForm.patchValue({ empId: data.employeeInfo.empId });
        }
        const backendUrl = (data.employeeInfo as any).profilePictureUrl || data.employeeInfo.profileImageUrl;
        if (backendUrl && !backendUrl.includes('placeholder')) {
             this.profileService.updateImageState(backendUrl);
        }
        const authStatus = this.userService.getAuthOnboardedStatus();
        this.isOnboarded = authStatus !== null ? authStatus : (data.employeeInfo.onboarded || false);
        if (!this.isOnboarded) {
            this.showOnboardingPopup = true;
            this.profileSetupAcknowledged = false;
        }
    }

    if (data.leaveBalances) {
        data.leaveBalances.forEach((leave: LeaveBalanceResponse) => {
            const type = leave.leaveType?.toLowerCase();
            if (type?.includes('casual')) { this.casualLeaveUsed = leave.consumed; this.casualLeaveTotal = leave.total; }
            if (type?.includes('sick')) { this.sickLeaveUsed = leave.consumed; this.sickLeaveTotal = leave.total; }
            if (type?.includes('annual')) { this.assignmentLeaveUsed = leave.consumed; this.assignmentLeaveTotal = leave.total; }
        });
    }

    this.attendanceRecords = data.attendances || [];
    if (data.attendances) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        const todayRecords = data.attendances.filter(r => r.date === todayStr);
        this.clockLog = [];
        this.isWorking = false;
        todayRecords.forEach(record => {
            const login = new Date(record.loginTime);
            let logout: Date | undefined = record.logoutTime ? new Date(record.logoutTime) : undefined;
            this.clockLog.push({ in: login, out: logout });
            if (!record.logoutTime) this.isWorking = true;
        });
        this.calculateTimeTracking();
    }
    
    this.allHolidays = data.holidays || [];
    const today = new Date(); today.setHours(0,0,0,0);
    this.nextHolidays = this.allHolidays
        .filter(h => new Date(h.date) >= today)
        .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 3);
    
    this.populateCalendar(this.displayedWeekStart);
    this.buildSchedule(data);
  }

  resetDashboardState() {
      if (!this.isOnboarded) {
          this.showOnboardingPopup = true;
          this.profileSetupAcknowledged = false;
      }
  }

  acknowledgeOnboarding() {
    this.showOnboardingPopup = false;
    this.profileSetupAcknowledged = true;
  }

  setupProfile() { this.router.navigate(['/onboarding']); }
  openProfileModal(tab: 'details' | 'security'): void { this.profileActiveTab = tab; this.isProfileModalVisible = true; this.showProfileMenu = false; }
  closeProfileModal(): void { this.isProfileModalVisible = false; }

  toggleProfileMenu(event: Event): void {
    event.stopPropagation();
    this.showProfileMenu = !this.showProfileMenu;
    this.showNotifications = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.showProfileMenu) {
      this.showProfileMenu = false;
    }
    if (this.showNotifications) {
      this.showNotifications = false;
    }
  }

  // --- NEW METHOD FOR TRAINING NAVIGATION ---
  navigateToTraining(): void {
    this.activePage = 'training';
    this.showProfileMenu = false;
  }

  // --- NEW METHOD FOR HELP NAVIGATION ---
  navigateToHelp(): void {
      this.activePage = 'help';
      this.showProfileMenu = false; // Close dropdown
  }

  private getTodayDateKey(): string {
      const now = new Date();
      return `mgr_break_time_${now.getFullYear()}_${now.getMonth()}_${now.getDate()}`;
  }

  private loadTodayBreakTime(): void {
      const key = this.getTodayDateKey();
      const saved = localStorage.getItem(key);
      this.totalBreakSecondsToday = saved ? parseInt(saved, 10) : 0;
  }

  private saveTodayBreakTime(): void {
      localStorage.setItem(this.getTodayDateKey(), this.totalBreakSecondsToday.toString());
  }

  startBreak(type: string) {
    if (this.isBreakActive) {
        this.alertService.error(`Already on ${this.currentBreakType} break.`);
        return;
    }
    this.isBreakActive = true;
    this.currentBreakType = type;
    this.breakStartTime = new Date();
    this.breakElapsedSeconds = 0;
    this.alertService.success(`${type} break started.`);
  }

  endBreak() {
    if (!this.isBreakActive) return;
    this.totalBreakSecondsToday += this.breakElapsedSeconds;
    this.saveTodayBreakTime();
    this.alertService.success(`${this.currentBreakType} break ended.`);
    this.isBreakActive = false;
    this.currentBreakType = null;
    this.breakStartTime = null;
    this.breakTimerDisplay = '00:00:00';
  }

  loadManagerTeamData() {
    this.leaveService.getManagerLeaveRequests(this.managerEmpId).subscribe((data: LeaveRequest[]) => {
        if (data) this.mapLeaveRequests(data);
    });
  }

  mapLeaveRequests(data: LeaveRequest[]): void {
    this.allLeavesRequests = data.map(leave => ({
            ...leave,
            displayStatus: leave.status ? leave.status.toUpperCase() : 'PENDING'
    }));
    this.pendingLeaves = this.allLeavesRequests.filter(l => l.displayStatus === 'PENDING' || l.displayStatus === 'APPLIED');
    this.stats.pendingRequests = this.pendingLeaves.length;
    this.filterLeaves(this.leaveFilter);
  }

  filterLeaves(filter: 'pending' | 'all'): void {
    this.leaveFilter = filter;
    this.displayedLeaves = (filter === 'pending') ? this.pendingLeaves : [...this.allLeavesRequests].sort((a,b) => b.leaveRequestId - a.leaveRequestId);
  }

  approveLeave(leave: DashboardLeaveRequest): void {
    Swal.fire({
      title: 'Approve Leave?',
      text: `Approve for ${leave.employeeName}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Approve'
    }).then((result) => {
      if (result.isConfirmed) {
        this.leaveService.approveLeaveRequest(leave.leaveRequestId, this.managerEmpId, leave).subscribe({
            next: () => { this.alertService.success('Approved'); this.loadManagerTeamData(); },
            error: (err) => this.alertService.error(err.error?.message || 'Failed')
        });
      }
    });
  }

  rejectLeave(leave: DashboardLeaveRequest): void {
     Swal.fire({
      title: 'Reject Leave?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Reject'
    }).then((result) => {
      if (result.isConfirmed) {
        this.leaveService.rejectLeaveRequest(leave.leaveRequestId, this.managerEmpId).subscribe({
            next: () => { this.alertService.info('Rejected'); this.loadManagerTeamData(); },
            error: (err) => this.alertService.error(err.error?.message || 'Failed')
        });
      }
    });
  }

  updateClock() {
    const now = new Date();
    this.todayDate = now;
    this.currentTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    this.currentDayOfWeek = now.toLocaleString('en-US', { weekday: 'long' });
    this.currentDayOfWeekShort = now.toLocaleString('en-US', { weekday: 'short' });
    this.currentDay = now.getDate();
    this.currentMonth = now.toLocaleString('en-US', { month: 'long' });

    const hour = now.getHours();
    if (hour >= 5 && hour < 12) this.greeting = 'Good Morning';
    else if (hour >= 12 && hour < 17) this.greeting = 'Good Afternoon';
    else this.greeting = 'Good Evening';

    if (this.isBreakActive && this.breakStartTime) {
        this.breakElapsedSeconds = Math.floor((now.getTime() - this.breakStartTime.getTime()) / 1000);
        this.breakTimerDisplay = this.formatSecondsToHHMMSS(this.breakElapsedSeconds);
    }
  }

  calculateTimeTracking() {
      const now = new Date();
      let grossSeconds = 0;
      this.clockLog.forEach(session => {
          const start = session.in.getTime();
          const end = session.out ? session.out.getTime() : now.getTime();
          grossSeconds += (end - start) / 1000;
      });

      let totalBreakSecs = this.totalBreakSecondsToday + (this.isBreakActive ? this.breakElapsedSeconds : 0);
      this.breakDurationDisplay = this.formatSecondsToHHMM(totalBreakSecs);

      const actualWorkSeconds = Math.max(0, grossSeconds - totalBreakSecs);
      this.timeTrackingTimer = this.formatSecondsToHHMMSS(grossSeconds);
      this.totalWorkingHours = this.formatSecondsToHHMM(actualWorkSeconds);
      this.pendingWorkingHours = this.formatSecondsToHHMM(Math.max(0, (this.MAX_TARGET_HOURS * 3600) - actualWorkSeconds));
  }
  
  private formatTime(num: number): string { return num < 10 ? '0' + num : num.toString(); }

  private formatSecondsToHHMM(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${this.formatTime(hours)}:${this.formatTime(minutes)}`;
  }

  private formatSecondsToHHMMSS(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${this.formatTime(hours)}:${this.formatTime(minutes)}:${this.formatTime(seconds)}`;
  }

  clockIn() { 
      if (!this.isWorking) {
          this.loadingDashboardData = true; // Added loading state to pause UI
          this.userService.recordClockIn().subscribe({
              next: () => { 
                  this.isWorking = true; 
                  this.alertService.success('Clocked in successfully!'); 
                  this.loadPersonalDashboardData(); 
              },
              error: () => {
                  this.loadingDashboardData = false;
                  this.alertService.error('Failed to clock in.');
              }
          });
      }
  }
  
  clockOut() { 
      if (this.isWorking) {
          this.loadingDashboardData = true; // Added loading state to pause UI
          this.userService.recordClockOut().subscribe({
              next: () => { 
                  this.isWorking = false; 
                  // Manually stop the timer visually by updating the last record
                  if (this.clockLog.length > 0) {
                      const lastEntry = this.clockLog[this.clockLog.length - 1];
                      if (!lastEntry.out) {
                          lastEntry.out = new Date();
                      }
                  }
                  this.calculateTimeTracking();
                  
                  this.alertService.success('Clocked out successfully!'); 
                  // Data reload will happen, removing the loading overlay when fresh data (with logout time) arrives
                  this.loadPersonalDashboardData(); 
              },
              error: () => {
                  this.loadingDashboardData = false;
                  this.alertService.error('Failed to clock out.');
              }
          });
      }
  }

  viewAttendance() { 
      this.openAttendanceDetailsModal(); 
  }

  openAttendanceDetailsModal() {
    const today = new Date();
    const currentMonth = this.displayedWeekStart.getMonth();
    const currentYear = this.displayedWeekStart.getFullYear();

    const attendanceList = Array.isArray(this.attendanceRecords) ? this.attendanceRecords : [];
    this.attendanceRecords = attendanceList.filter(record => {
      const recordDate = new Date(record.date);
      const isSameMonthAndYear = recordDate.getFullYear() === currentYear && recordDate.getMonth() === currentMonth;
      if (isSameMonthAndYear) {
        if (recordDate.getFullYear() === today.getFullYear() && recordDate.getMonth() === today.getMonth()) {
          return recordDate.getDate() <= today.getDate();
        }
        return true;
      }
      return false;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    this.showAttendanceDetailsModal = true;
  }

  closeAttendanceDetailsModal() {
    this.showAttendanceDetailsModal = false;
  }

  getLeaveStrokeDasharray(used: number, total: number) { return `${2 * Math.PI * 15}, ${2 * Math.PI * 15}`; }
  getLeaveStrokeDashoffset(used: number, total: number) { 
      const pct = total > 0 ? used/total : 0; 
      return (2 * Math.PI * 15) * (1 - pct); 
  }
  formatLeaveCount(n: number) { return n < 10 ? '0'+n : n.toString(); }
  
  get workingTimeStrokeDasharray() { return `${this.CIRCUMFERENCE}, ${this.CIRCUMFERENCE}`; }
  get workingTimeStrokeDashoffset() { 
      const [h, m] = this.totalWorkingHours.split(':').map(Number);
      const totalMinutes = (h * 60) + m;
      return `${this.CIRCUMFERENCE * (1 - Math.min(1, totalMinutes / this.MAX_TARGET_MINUTES))}`;
  }

  getStatusBadgeClass(status: string): string {
    switch (status?.toUpperCase()) {
      case 'APPROVED': return 'badge-approved';
      case 'REJECTED': return 'badge-rejected';
      case 'WITHDRAWN': return 'badge-rejected';
      default: return 'badge-pending';
    }
  }

  getLeaveTypeDisplay(type: string): string { return type ? type.replace(/_/g, ' ') : 'Leave'; }
  getUserInitial() { return this.userName.charAt(0).toUpperCase(); }
  
  logout() { 
    this.userService.clearAuthToken();
    this.profileService.clearProfileData(); // Clear profile data
    this.router.navigate(['/login']); 
  }

  populateCalendar(baseDate: Date) {
      this.calendarDays = []; 
      const year = baseDate.getFullYear();
      const month = baseDate.getMonth();
      const today = new Date(); today.setHours(0,0,0,0);
      
      this.selectedMonthYear = baseDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      
      const firstDayOfMonth = new Date(year, month, 1);
      const lastDayOfMonth = new Date(year, month + 1, 0);
      const startDayOfWeek = firstDayOfMonth.getDay(); 
      const daysInMonth = lastDayOfMonth.getDate();
      
      for (let i = 0; i < startDayOfWeek; i++) {
          this.calendarDays.push({ date: '', disabled: true, selected: false, fullDate: null });
      }
      
      for(let day=1; day<=daysInMonth; day++) {
          const d = new Date(year, month, day);
          const isToday = d.getTime() === today.getTime();
          const holiday = this.allHolidays.find(h => {
             const hDate = new Date(h.date);
             return hDate.getDate() === day && hDate.getMonth() === month && hDate.getFullYear() === year;
          });
          this.calendarDays.push({ 
              date: day, 
              disabled: false, 
              selected: isToday, 
              fullDate: d, 
              isHoliday: !!holiday, 
              holidayDesc: holiday?.description 
          });
      }
  }

  navigateCalendar(dir: number) {
      const d = new Date(this.displayedWeekStart);
      d.setMonth(d.getMonth() + dir);
      d.setDate(1);
      this.displayedWeekStart = d;
      this.populateCalendar(d);
      this.selectedScheduleDate = null;
      this.updateDisplayedScheduleDetails();
  }

  onDateSelect(date: Date | null) {
      if(date) {
          this.selectedDateForLeave = date;
          this.selectedScheduleDate = date;
          this.updateDisplayedScheduleDetails();
      }
  }

  isCalendarDaySelectedForLeave(day: any): boolean {
    if (!this.selectedDateForLeave || day.disabled || !day.fullDate) return false;
    return this.selectedDateForLeave.toDateString() === day.fullDate.toDateString();
  }

  buildSchedule(data: DashboardData) {
      this.fullScheduleDetails = [];
      const currentMonth = this.displayedWeekStart.getMonth();
      const currentYear = this.displayedWeekStart.getFullYear();
      const getDayShort = (d: Date) => d.toLocaleString('en-US', { weekday: 'short' }).toUpperCase();
      const getDayMonth = (d: Date) => d.getDate().toString();
      
      const paydayDate = new Date(currentYear, currentMonth, 27);
      this.fullScheduleDetails.push({ 
          date: paydayDate.toISOString().slice(0, 10), 
          desc: 'Pay Day<br>Your Pay is credited!', 
          type: 'payday', 
          canApplyLeave: false,
          dayOfWeekShort: getDayShort(paydayDate), 
          dayOfMonth: getDayMonth(paydayDate) 
      });

      if(data.holidays) {
          data.holidays.forEach(h => {
             const hDate = new Date(h.date);
             this.fullScheduleDetails.push({ 
                 date: h.date, 
                 desc: `Holiday: ${h.description}`, 
                 type: 'holiday', 
                 canApplyLeave: false,
                 dayOfWeekShort: getDayShort(hDate), 
                 dayOfMonth: getDayMonth(hDate) 
             });
          });
      }

      this.attendanceRecords.forEach(r => {
           const rDate = new Date(r.date);
           this.fullScheduleDetails.push({ 
               date: r.date, 
               desc: `Login: ${new Date(r.loginTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`, 
               type: 'attendance', 
               canApplyLeave: false,
               dayOfWeekShort: getDayShort(rDate), 
               dayOfMonth: getDayMonth(rDate) 
           });
      });
      
      const meetingDate = new Date(currentYear, currentMonth, 1);
      this.fullScheduleDetails.push({
          date: meetingDate.toISOString().slice(0, 10),
          desc: 'Standup Call<br>Monthly sync',
          type: 'meeting',
          canApplyLeave: false,
          dayOfWeekShort: getDayShort(meetingDate),
          dayOfMonth: getDayMonth(meetingDate)
      });

      this.updateDisplayedScheduleDetails();
  }

  updateDisplayedScheduleDetails() {
     if (this.selectedScheduleDate) {
        const targetISO = this.selectedScheduleDate.toISOString().slice(0, 10);
        this.scheduleDetails = this.fullScheduleDetails.filter(i => i.date === targetISO);
        
        if (this.scheduleDetails.length === 0) {
            this.scheduleDetails.push({
               date: targetISO, 
               desc: 'No schedule or leave applied.', 
               type: 'meeting', 
               canApplyLeave: true,
               dayOfWeekShort: this.selectedScheduleDate.toLocaleString('en-US', { weekday: 'short' }).toUpperCase(),
               dayOfMonth: this.selectedScheduleDate.getDate().toString()
            });
        }
     } else {
        const start = new Date(this.displayedWeekStart.getFullYear(), this.displayedWeekStart.getMonth(), 1);
        const end = new Date(this.displayedWeekStart.getFullYear(), this.displayedWeekStart.getMonth() + 1, 0);
        this.scheduleDetails = this.fullScheduleDetails.filter(i => {
            const d = new Date(i.date);
            return d >= start && d <= end;
        });
     }
     this.scheduleDetails.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  openLeaveApplicationModal(d: any) { this.selectedDateForLeave = new Date(d); this.showLeaveApplicationModal=true; }
  closeLeaveApplicationModal() { this.showLeaveApplicationModal=false; }
  submitLeaveApplication() { this.alertService.success('Leave applied successfully'); this.closeLeaveApplicationModal(); }
  
  // Video playback fix jaisa ki employee dashboard mein hai
  playVideo() {
    this.showVideo = true;
    this.cdr.detectChanges();
  }
}