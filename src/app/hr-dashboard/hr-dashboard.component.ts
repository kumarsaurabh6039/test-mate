import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subscription, interval, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router, ActivatedRoute } from '@angular/router'; 
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpErrorResponse } from '@angular/common/http';
import { 
  AssetResponse, 
  DashboardData, 
  EmployeeInfoResponse, 
  HolidayResponse, 
  IndividualAttendanceRecordResponse, 
  TeamResponseDTO, 
  UserService, 
  AssetAssignPayload,
  LeaveBalanceResponse 
} from '../user-service.service';

import { DashboardTimesheetComponent } from '../dashboard-timesheet/dashboard-timesheet.component';
import { LeavesComponent } from '../leaves/leaves.component'; 
import { DashboardSwipedataComponent } from '../dashboard-swipedata/dashboard-swipedata.component';
import { HrAdminComponent } from '../hr-admin/hr-admin.component'; 
import { ProfileManageComponent } from '../profile-manage/profile-manage.component';
import { ProfileService } from '../services/profile.service';
import { PayslipComponent } from '../payslip/payslip.component';
import { DashboardAssetsComponent } from '../dashboard-assets/dashboard-assets.component';
import { DashboardTeamComponent } from '../dashboard-team/dashboard-team.component';
import { LeaveService } from '../services/leave.service'; 
import { PoshComponent } from '../posh/posh.component';
import { EmployeeTrainingComponent } from '../employee-training/employee-training.component';
import { NotificationService } from '../services/notification.service';

interface EmployeeUI extends EmployeeInfoResponse {
  status: 'Present' | 'Absent' | 'On Leave' | 'Offline';
  avatar: string;
}

@Component({
  selector: 'app-hr-dashboard',
  templateUrl: './hr-dashboard.component.html',
  styleUrls: ['./hr-dashboard.component.css'],
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    FormsModule,
    DashboardTimesheetComponent,
    DashboardSwipedataComponent,
    LeavesComponent,
    HrAdminComponent, 
    ProfileManageComponent,
    PayslipComponent,
    DashboardAssetsComponent,
    DashboardTeamComponent,
    PoshComponent,
    EmployeeTrainingComponent
  ]
})
export class HrDashboardComponent implements OnInit, OnDestroy {
  activePage: string = 'home'; 
  showAdminView: boolean = false;
  
  searchControl = new FormControl('');
  greeting: string = '';
  userName: string = 'HR User'; 
  userProfileImageUrl: string | null = null;
  currentDayOfWeek: string = '';
  currentDayOfWeekShort: string = '';
  currentMonth: string = '';
  currentDay: number = 0;
  currentTime: string = '';
  todayDate: Date = new Date();
  
  showProfileMenu: boolean = false;
  isProfileModalVisible: boolean = false;
  profileActiveTab: 'details' | 'security' = 'details';

  showNotifications: boolean = false;
  notifications: any[] = [];
  unreadCount: number = 0;

  isOnboarded: boolean = false;
  showOnboardingPopup: boolean = false;
  profileSetupAcknowledged: boolean = false;

  timeTrackingTimer: string = '00:00:00';
  totalWorkingHours: string = '00:00';
  breakDurationDisplay: string = '00:00';
  pendingWorkingHours: string = '09:00';
  isWorking: boolean = false;
  clockLog: { in: Date, out?: Date }[] = [];
  firstLoginTime: Date | null = null;
  
  private readonly CIRCLE_RADIUS: number = 54;
  private readonly CIRCUMFERENCE: number = 2 * Math.PI * this.CIRCLE_RADIUS;
  readonly MAX_TARGET_HOURS: number = 9;
  readonly MAX_TARGET_MINUTES: number = this.MAX_TARGET_HOURS * 60;

  isBreakActive: boolean = false;
  currentBreakType: string | null = null;
  breakStartTime: Date | null = null;
  breakTimerDisplay: string = '00:00:00';
  breakElapsedSeconds: number = 0;
  totalBreakSecondsToday: number = 0;

  casualLeaveUsed: number = 0; casualLeaveTotal: number = 0;
  sickLeaveUsed: number = 0; sickLeaveTotal: number = 0;
  assignmentLeaveUsed: number = 0; assignmentLeaveTotal: number = 0;
  unpaidLeaveUsed: number = 0; unpaidLeaveTotal: number = 0;

  nextHolidays: HolidayResponse[] = [];
  allHolidays: HolidayResponse[] = []; 
  calendarDays: { date: number | string; disabled: boolean; selected: boolean; fullDate: Date | null; isHoliday?: boolean; holidayDesc?: string }[] = [];
  selectedMonthYear: string = '';
  displayedWeekStart: Date = new Date();
  
  fullScheduleDetails: { 
    date: string, 
    desc: string, 
    type: 'attendance' | 'holiday' | 'leave' | 'payday' | 'meeting', 
    canApplyLeave?: boolean, 
    dayOfWeekShort?: string, 
    dayOfMonth?: string 
  }[] = [];
  
  scheduleDetails: typeof this.fullScheduleDetails = [];
  selectedScheduleDate: Date | null = null;
  selectedDateForLeave: Date | null = null;

  showVideo: boolean = false;
  safeVideoUrl: SafeResourceUrl | null = null;
  youtubeVideoId: string = 'Z3KnTeDqGEo'; 

  showCreateTeamModal = false;
  showEditTeamModal = false;
  showLeaveApplicationModal = false;
  showAttendanceDetailsModal = false;
  showAllHolidaysModal = false; 
  showCtcModal = false; 
  showOnboardingModal = false;
  
  showCreateAssetModal = false;
  isEditingAsset = false;
  currentAssetId: number | null = null;
  showAssignAssetModal = false;
  assetForm: FormGroup;
  assets: AssetResponse[] = [];
  filteredAssets: AssetResponse[] = []; 
  requestedAssets: AssetResponse[] = []; 
  assetSearchText: string = '';
  selectedAsset: AssetResponse | null = null;
  selectedAssigneeName: string = ''; 
  assetStats = { total: 0, assigned: 0, available: 0, requests: 0 };
  isGlobalAssignment: boolean = false;
  selectedAssetIdForGlobal: number | null = null;

  attendanceRecords: IndividualAttendanceRecordResponse[] = [];

  createTeamForm: FormGroup;
  employeeForm: FormGroup;
  detailedCtcForm: FormGroup; 
  leaveTypeControl = new FormControl('', Validators.required);
  leaveReasonControl = new FormControl('', Validators.required);
  
  exitForm: FormGroup;
  isExitSubmitting: boolean = false;
  readonly NOTICE_PERIOD_DAYS = 60;

  teams: TeamResponseDTO[] = [];
  allEmployees: EmployeeUI[] = [];
  userRoleFilter: string = 'All';
  employeeInfo: EmployeeInfoResponse | null = null;
  editingTeam: TeamResponseDTO | null = null;
  selectedMemberIds: string[] = []; 
  memberSearchText: string = ''; 
  expandedTeamIds: number[] = [];
  loadingDashboardData = false;
  
  globalMessage: { message: string, type: string } | null = null;
  
  private msgSub: Subscription | undefined;
  private timeSubscription?: Subscription;
  private profilePicSubscription?: Subscription;
  private leaveBalanceSub?: Subscription;
  private notificationPollingSub?: Subscription; 
  private routeSub?: Subscription;

  // Browser Back Button Disable Karne Ke Liye HostListener
  @HostListener('window:popstate', ['$event'])
  onPopState(event: Event) {
    // Back button press hone par current URL ko fir se history me push kar dete hain
    window.history.pushState(null, '', window.location.href);
  }

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private router: Router,
    private activatedRoute: ActivatedRoute, 
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private profileService: ProfileService,
    private leaveService: LeaveService,
    private notificationService: NotificationService 
  ) {
    this.assetForm = this.fb.group({
      name: ['', Validators.required],
      type: ['Laptop', Validators.required],
      serialNumber: ['', Validators.required],
      location: ['Head Office'],
      description: [''],
      status: ['AVAILABLE']
    });

    this.createTeamForm = this.fb.group({
      teamName: ['', Validators.required],
      description: ['', Validators.required],
      manager: ['', Validators.required]
    });

    this.employeeForm = this.fb.group({
      userName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      empId: ['', Validators.required],
      role: ['EMPLOYEE', Validators.required],
      managerEmpId: [''],
      department: ['', Validators.required]
    });

    this.detailedCtcForm = this.fb.group({
      employeeId: ['', Validators.required],
      monthly: [true],
      basicPay: [0, [Validators.required, Validators.min(0)]],
      hra: [0, [Validators.required, Validators.min(0)]],
      specialAllowances: [0, [Validators.min(0)]],
      conveyanceAllowance: [0, [Validators.min(0)]],
      medicalAllowance: [0, [Validators.min(0)]],
      bonus: [0, [Validators.min(0)]],
      otherEarnings: [0, [Validators.min(0)]],
      pf: [0, [Validators.min(0)]],
      tax: [0, [Validators.min(0)]],
      insurances: [0, [Validators.min(0)]],
      esop: [0, [Validators.min(0)]],
      gratuity: [0, [Validators.min(0)]],
      otherDeductions: [0, [Validators.min(0)]]
    });

    this.exitForm = this.fb.group({
      earlyReleaseRequested: [false],
      empId: [''], 
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

    const savedImage = localStorage.getItem('userProfileImage');
    if (savedImage && savedImage !== 'null') {
        this.userProfileImageUrl = savedImage;
        this.profileService.updateImageState(savedImage);
    }

    const cachedName = localStorage.getItem('cachedUserName');
    if (cachedName) {
        this.userName = cachedName;
    }

    this.profilePicSubscription = this.profileService.profileImage$.subscribe(pic => {
      if (pic) {
        this.userProfileImageUrl = pic;
        localStorage.setItem('userProfileImage', pic);
        this.cdr.detectChanges(); 
      }
    });

    this.msgSub = this.userService.getMessageUpdates().subscribe(msg => {
        this.globalMessage = msg;
        this.cdr.detectChanges(); 
    });

    this.routeSub = this.activatedRoute.queryParams.subscribe(params => {
        const mode = params['mode'];
        if (mode === 'admin') {
            this.showAdminView = true;
        } else {
            this.showAdminView = false;
        }

        const view = params['view'];
        if (view) {
            this.activePage = view;
        } else {
            this.activePage = 'home';
        }
        this.handleViewChange(this.activePage);
        this.cdr.detectChanges();
    });

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

    this.loadDashboardData();
    this.loadLeaveBalances();

    const currentEmpId = localStorage.getItem('empId') || 'EMP-001';
    this.initRealTimeNotifications(currentEmpId);
    
    this.loadEmployees().then(() => {
      this.loadTeams();
      this.loadAssets();
      
      if (this.userName === 'HR User' || this.userName === 'Error Loading Data') {
          const empId = this.userService.getEmpIdFromToken() || localStorage.getItem('empId');
          const found = this.allEmployees.find(e => e.empId === empId);
          if (found) {
              this.userName = `${found.firstName} ${found.surname}`;
              localStorage.setItem('cachedUserName', this.userName);
          }
      }
    });
  }

  ngOnDestroy(): void {
    if (this.timeSubscription) this.timeSubscription.unsubscribe();
    if (this.msgSub) this.msgSub.unsubscribe();
    if (this.profilePicSubscription) this.profilePicSubscription.unsubscribe();
    if (this.leaveBalanceSub) this.leaveBalanceSub.unsubscribe();
    if (this.notificationPollingSub) this.notificationPollingSub.unsubscribe();
    if (this.routeSub) this.routeSub.unsubscribe();
  }

  @HostListener('window:storage', ['$event'])
  onStorageChange(event: StorageEvent) {
    if (event.key === 'authToken' && !event.newValue) {
      this.userService.clearAuthToken();
      this.profileService.clearProfileData();
      this.router.navigate(['/login']);
    }
  }

  toggleAdminView() {
    const newMode = this.showAdminView ? 'employee' : 'admin';
    this.router.navigate([], { 
        relativeTo: this.activatedRoute, 
        queryParams: { mode: newMode },
        queryParamsHandling: 'merge',
        replaceUrl: true 
    });
  }

  setActivePage(t: string) { 
    this.router.navigate([], { 
        relativeTo: this.activatedRoute, 
        queryParams: { view: t },
        queryParamsHandling: 'merge',
        replaceUrl: true
    });
  }

  handleViewChange(view: string) {
      if(view === 'assets') this.loadAssets();
      if(view === 'team') this.loadTeams();
      if(view === 'users') this.loadEmployees();
      if(view === 'exit') this.setupExitFormListeners();
  }

  onCancelExit(): void {
      this.setActivePage('home'); 
  }

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
    const empId = localStorage.getItem('empId') || 'EMP-001';
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

      const empId = localStorage.getItem('empId') || 'EMP-001';
      this.notificationService.markAsRead(notification.id, empId).subscribe({
          next: () => {
              notification.read = true;
              this.updateUnreadCount();
              this.cdr.detectChanges();
          },
          error: (err) => console.error('Error marking notification as read:', err)
      });
  }

  private setupExitFormListeners(): void {
    const empId = localStorage.getItem('empId') || 'EMP-001'; 
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
        
        this.exitForm.patchValue({
            lastWorkingDate: lwd.toISOString().substring(0, 10)
        });
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
          const estimatedBuyout = diffDays * 2000;
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
    if (this.exitForm.valid) {
      this.isExitSubmitting = true;
      console.log('Exit Payload:', this.exitForm.getRawValue());

      setTimeout(() => {
        this.isExitSubmitting = false;
        this.userService.dispatchMessage('Resignation application submitted successfully. HR will contact you shortly.', 'success');
        this.exitForm.disable(); 
      }, 1500);
    } else {
      this.exitForm.markAllAsTouched();
      this.userService.dispatchMessage('Please correct the errors in the form.', 'warning');
    }
  }

  loadLeaveBalances(): void {
    const empId = localStorage.getItem('empId') || 'EMP001';
    this.leaveBalanceSub = this.leaveService.getLeaveBalance(empId).subscribe(balances => {
        const balancesArray = Array.isArray(balances) ? balances : [];
        if(balancesArray.length > 0) {
            this.casualLeaveUsed = 0; this.casualLeaveTotal = 0;
            this.sickLeaveUsed = 0; this.sickLeaveTotal = 0;
            this.assignmentLeaveUsed = 0; this.assignmentLeaveTotal = 0;
            this.unpaidLeaveUsed = 0; this.unpaidLeaveTotal = 0;

            balancesArray.forEach(b => {
                const type = b.leaveType?.toLowerCase();
                if (type?.includes('casual')) { this.casualLeaveUsed = b.consumed; this.casualLeaveTotal = b.total; }
                else if (type?.includes('sick')) { this.sickLeaveUsed = b.consumed; this.sickLeaveTotal = b.total; }
                else if (type?.includes('annual')) { this.assignmentLeaveUsed = b.consumed; this.assignmentLeaveTotal = b.total; }
                else if (type?.includes('unpaid')) { this.unpaidLeaveUsed = b.consumed; this.unpaidLeaveTotal = b.total; }
            });
            this.cdr.detectChanges();
        }
    });
  }

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

  logout(): void {
    this.userService.clearAuthToken();
    this.profileService.clearProfileData(); 
    this.router.navigate(['/login']);
  }

  openProfileModal(tab: 'details' | 'security'): void {
    this.profileActiveTab = tab;
    this.isProfileModalVisible = true;
    this.showProfileMenu = false;
  }

  closeProfileModal(): void {
    this.isProfileModalVisible = false;
  }

  navigateToHelp(): void {
      this.setActivePage('help');
      this.showProfileMenu = false; 
  }

  navigateToTraining(): void {
    this.setActivePage('training');
    this.showProfileMenu = false;
  }

  private getTodayDateKey(): string {
      const now = new Date();
      return `hr_break_time_${now.getFullYear()}_${now.getMonth()}_${now.getDate()}`;
  }

  private loadTodayBreakTime(): void {
      const key = this.getTodayDateKey();
      const saved = localStorage.getItem(key);
      if (saved) {
          this.totalBreakSecondsToday = parseInt(saved, 10);
      } else {
          this.totalBreakSecondsToday = 0;
      }
  }

  private saveTodayBreakTime(): void {
      const key = this.getTodayDateKey();
      localStorage.setItem(key, this.totalBreakSecondsToday.toString());
  }

  loadDashboardData() {
    this.loadingDashboardData = true;
    this.userService.getEmployeeDashboardData().subscribe({
      next: (data: DashboardData) => {
        if (data) {
          this.processDashboardData(data);
        } else {
          this.resetDashboardState();
        }
        this.loadingDashboardData = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingDashboardData = false;
        console.error('Error fetching dashboard data:', err);
        
        if (err.status === 500 && err.error?.message?.includes('NonUniqueResultException')) {
           this.userService.dispatchMessage('Critical Data Error: Duplicate Employee Records found in database. Contact IT.', 'error');
        } else {
           this.userService.dispatchMessage('Failed to load full dashboard details. Showing partial data.', 'warning');
        }

        this.resetDashboardState();
        this.cdr.detectChanges();
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
      
      const authOnboardedStatus = this.userService.getAuthOnboardedStatus();
      
      if (authOnboardedStatus !== null) {
          this.isOnboarded = authOnboardedStatus;
      } else if (data.employeeInfo) {
          if (data.employeeInfo.isOnboarded !== undefined) {
             this.isOnboarded = data.employeeInfo.isOnboarded;
          } else if (data.employeeInfo.onboarded !== undefined) {
             this.isOnboarded = data.employeeInfo.onboarded;
          } else {
             this.isOnboarded = !!(data.employeeInfo.joiningDate && data.employeeInfo.joiningDate.length > 0);
          }
      } else {
          this.isOnboarded = false;
      }

      if (!this.isOnboarded) {
          this.showOnboardingPopup = true;
          this.profileSetupAcknowledged = false;
      }
    }

    const today = new Date();
    today.setHours(0,0,0,0);
    this.allHolidays = Array.isArray(data.holidays) ? data.holidays : [];
    this.nextHolidays = this.allHolidays
      .filter(h => new Date(h.date) >= today)
      .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 3);

    this.populateCalendar(this.displayedWeekStart);

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayString = `${year}-${month}-${day}`;

    this.attendanceRecords = Array.isArray(data.attendances) ? data.attendances : [];
    const todayRecords = this.attendanceRecords.filter(r => r.date === todayString);
    
    this.clockLog = []; 
    this.isWorking = false; 
    this.firstLoginTime = null;

    todayRecords.forEach(record => {
      const login = new Date(record.loginTime);
      let logout: Date | undefined = record.logoutTime ? new Date(record.logoutTime) : undefined;
      
      this.clockLog.push({ in: login, out: logout });
      
      if (!this.firstLoginTime || login < this.firstLoginTime) {
          this.firstLoginTime = login;
      }
      if (!record.logoutTime) this.isWorking = true;
    });
    
    this.calculateTimeTracking();
    this.buildSchedule(data);
  }

  resetDashboardState() {
      if (this.userName === 'HR User' || this.userName === 'Loading...') {
          const cached = localStorage.getItem('cachedUserName');
          this.userName = cached || 'Error Loading Data';
      }
      
      const authStatus = this.userService.getAuthOnboardedStatus();
      this.isOnboarded = authStatus !== null ? authStatus : false;
      
      if (!this.isOnboarded) {
          this.showOnboardingPopup = true;
          this.profileSetupAcknowledged = false;
      }
  }

  acknowledgeOnboarding() {
    this.showOnboardingPopup = false;
    this.profileSetupAcknowledged = true;
  }

  private updateClock() {
    const now = new Date();
    this.currentDayOfWeek = now.toLocaleString('en-US', { weekday: 'long' });
    this.currentDayOfWeekShort = now.toLocaleString('en-US', { weekday: 'short' });
    this.currentMonth = now.toLocaleString('en-US', { month: 'long' });
    this.currentDay = now.getDate();
    this.currentTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    this.todayDate = now;
    
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

    let totalBreakSecs = this.totalBreakSecondsToday;
    if (this.isBreakActive) {
      totalBreakSecs += this.breakElapsedSeconds;
    }
    this.breakDurationDisplay = this.formatSecondsToHHMM(totalBreakSecs);

    const actualWorkSeconds = Math.max(0, grossSeconds - totalBreakSecs);

    this.timeTrackingTimer = this.formatSecondsToHHMMSS(grossSeconds);
    this.totalWorkingHours = this.formatSecondsToHHMM(actualWorkSeconds);
    
    const targetWorkingSeconds = this.MAX_TARGET_HOURS * 3600;
    const pendingSeconds = Math.max(0, targetWorkingSeconds - actualWorkSeconds);
    this.pendingWorkingHours = this.formatSecondsToHHMM(pendingSeconds);
  }

  private formatTime(num: number): string {
    return num < 10 ? '0' + num : num.toString();
  }

  private formatSecondsToHHMM(totalSeconds: number): string {
    const hours = Math.floor(Math.max(0, totalSeconds) / 3600);
    const minutes = Math.floor((Math.max(0, totalSeconds) % 3600) / 60);
    return `${this.formatTime(hours)}:${this.formatTime(minutes)}`;
  }

  private formatSecondsToHHMMSS(totalSeconds: number): string {
    const hours = Math.floor(Math.max(0, totalSeconds) / 3600);
    const minutes = Math.floor((Math.max(0, totalSeconds) % 3600) / 60);
    const seconds = Math.floor(Math.max(0, totalSeconds) % 60);
    return `${this.formatTime(hours)}:${this.formatTime(minutes)}:${this.formatTime(seconds)}`;
  }

  clockIn() {
    if (!this.isWorking) {
        this.loadingDashboardData = true;
        this.userService.recordClockIn().subscribe({
            next: () => {
                this.userService.dispatchMessage('Clocked in successfully!', 'success');
                this.loadDashboardData();
            },
            error: () => {
                this.loadingDashboardData = false;
                this.userService.dispatchMessage('Failed to clock in.', 'error');
            }
        });
    }
  }

  clockOut() {
    if (this.isWorking) {
        this.loadingDashboardData = true;
        this.userService.recordClockOut().subscribe({
            next: () => {
                this.userService.dispatchMessage('Clocked out successfully!', 'success');
                this.loadDashboardData();
            },
            error: () => {
                this.loadingDashboardData = false;
                this.userService.dispatchMessage('Failed to clock out.', 'error');
            }
        });
    }
  }

  startBreak(type: string) {
    if (this.isBreakActive) {
      this.userService.dispatchMessage(`Already on ${this.currentBreakType} break.`, 'warning');
      return;
    }
    this.isBreakActive = true;
    this.currentBreakType = type;
    this.breakStartTime = new Date();
    this.breakElapsedSeconds = 0;
    this.userService.dispatchMessage(`${type} break started.`, 'success');
  }

  endBreak() {
    if (!this.isBreakActive) return;
    this.totalBreakSecondsToday += this.breakElapsedSeconds;
    this.saveTodayBreakTime();
    this.userService.dispatchMessage(`${this.currentBreakType} break ended.`, 'success');
    this.isBreakActive = false;
    this.currentBreakType = null;
    this.breakStartTime = null;
    this.breakTimerDisplay = '00:00:00';
  }

  populateCalendar(baseDate: Date) {
      this.calendarDays = [];
      const year = baseDate.getFullYear();
      const month = baseDate.getMonth();
      const today = new Date();
      today.setHours(0,0,0,0);

      this.selectedMonthYear = baseDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

      const firstDayOfMonth = new Date(year, month, 1);
      const lastDayOfMonth = new Date(year, month + 1, 0);
      const startDayOfWeek = firstDayOfMonth.getDay(); 
      const daysInMonth = lastDayOfMonth.getDate();

      for (let i = 0; i < startDayOfWeek; i++) {
          this.calendarDays.push({ date: '', disabled: true, selected: false, fullDate: null });
      }

      for (let day = 1; day <= daysInMonth; day++) {
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
       desc: 'Pay Day<br>Your Pay will be credited!',
       type: 'payday',
       canApplyLeave: false,
       dayOfWeekShort: getDayShort(paydayDate),
       dayOfMonth: getDayMonth(paydayDate)
    });

    const holidaysArray = Array.isArray(data.holidays) ? data.holidays : [];
    holidaysArray.forEach(h => {
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

    const attendancesArray = Array.isArray(data.attendances) ? data.attendances : [];
    attendancesArray.forEach(r => {
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

  getLeaveStrokeDasharray(used: number, total: number) { 
      return `${2 * Math.PI * 15}, ${2 * Math.PI * 15}`; 
  }
  getLeaveStrokeDashoffset(used: number, total: number) { 
      const pct = total > 0 ? used/total : 0; 
      return (2 * Math.PI * 15) * (1 - pct); 
  }
  formatLeaveCount(n: number) { return n < 10 ? '0'+n : n; }
  
  get workingTimeStrokeDasharray() { return `${this.CIRCUMFERENCE}, ${this.CIRCUMFERENCE}`; }
  
  get workingTimeStrokeDashoffset() { 
      const [hours, minutes] = this.totalWorkingHours.split(':').map(Number);
      const totalMinutes = (hours * 60) + minutes;
      const progress = Math.min(1, totalMinutes / this.MAX_TARGET_MINUTES);
      return `${this.CIRCUMFERENCE * (1 - progress)}`;
  }

  playVideo() {
    this.showVideo = true;
    this.safeVideoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${this.youtubeVideoId}?autoplay=1`);
  }

  loadEmployees(): Promise<void> {
    return new Promise((resolve) => {
      this.userService.getAllEmployees().subscribe({
        next: (data) => {
          const employeesArray = Array.isArray(data) ? data : [];
          this.allEmployees = employeesArray.map(e => ({ 
            ...e, status: 'Present', 
            avatar: (e as any).profilePictureUrl || e.profileImageUrl || `https://ui-avatars.com/api/?name=${e.firstName}+${e.surname}&background=random` 
          }));
          resolve();
        },
        error: () => resolve()
      });
    });
  }

  get filteredUsersList(): EmployeeUI[] {
    if (this.userRoleFilter === 'All') return this.allEmployees;
    return this.allEmployees.filter(u => u.role && u.role.toUpperCase() === this.userRoleFilter);
  }

  loadTeams() { 
    this.userService.getAllTeams().subscribe(d => { 
      this.teams = Array.isArray(d) ? d : []; 
      this.cdr.detectChanges(); 
    }); 
  }
  
  loadAssets() { 
    this.userService.getAllAssets().subscribe(d => { 
      this.assets = Array.isArray(d) ? d : []; 
      this.filterAssets(); 
    }); 
  }
  
  get managers() { return this.allEmployees.filter(e => e.role === 'MANAGER'); }
  
  toggleTeam(id: number) { 
      const idx = this.expandedTeamIds.indexOf(id);
      idx > -1 ? this.expandedTeamIds.splice(idx, 1) : this.expandedTeamIds.push(id);
  }
  isTeamExpanded(id: number) { return this.expandedTeamIds.includes(id); }
  getTeamMemberDetails(ids: string[]) { return this.allEmployees.filter(e => ids?.includes(e.empId)); }
  actionCreateTeam() { this.createTeamForm.reset(); this.editingTeam = null; this.showCreateTeamModal = true; }
  closeTeamModal() { this.showCreateTeamModal = false; }
  openEditTeam(t: TeamResponseDTO) { 
      this.editingTeam = t; 
      this.createTeamForm.patchValue({ teamName: t.teamName, description: t.description, manager: t.managerEmpId });
      this.selectedMemberIds = [...(t.memberEmpIds || [])];
      this.showCreateTeamModal = true; 
  }
  submitCreateTeam() {
      if(this.createTeamForm.valid) {
          const pl = { ...this.createTeamForm.value, members: this.selectedMemberIds };
          const obs = this.editingTeam ? this.userService.updateTeam(this.editingTeam.id, pl) : this.userService.createTeam(pl);
          obs.subscribe(() => { this.closeTeamModal(); this.loadTeams(); this.userService.dispatchMessage('Team saved', 'success'); });
      }
  }
  deleteTeam(t: TeamResponseDTO) {
      if(confirm('Delete team?')) this.userService.deleteTeam(t.id).subscribe(() => { this.loadTeams(); this.userService.dispatchMessage('Team deleted', 'success'); });
  }
  getFilteredMembers() { 
      let emps = this.allEmployees;
      if(this.memberSearchText) emps = emps.filter(e => e.firstName.toLowerCase().includes(this.memberSearchText.toLowerCase()));
      return emps;
  }
  isMemberSelected(id: string) { return this.selectedMemberIds.includes(id); }
  toggleTeamMember(id: string) { 
      const idx = this.selectedMemberIds.indexOf(id);
      idx > -1 ? this.selectedMemberIds.splice(idx, 1) : this.selectedMemberIds.push(id);
  }

  filterAssets() {
      const assetsToFilter = Array.isArray(this.assets) ? this.assets : [];
      this.filteredAssets = assetsToFilter.filter(a => a.status !== 'REQUESTED');
      this.requestedAssets = assetsToFilter.filter(a => a.status === 'REQUESTED');
      if(this.assetSearchText) {
          const lower = this.assetSearchText.toLowerCase();
          this.filteredAssets = this.filteredAssets.filter(a => a.name.toLowerCase().includes(lower) || a.serialNumber.toLowerCase().includes(lower));
      }
      this.updateAssetStats();
  }
  updateAssetStats() {
      const assetsForStats = Array.isArray(this.assets) ? this.assets : [];
      this.assetStats.total = assetsForStats.length;
      this.assetStats.assigned = assetsForStats.filter(a => a.status === 'ASSIGNED').length;
      this.assetStats.available = assetsForStats.filter(a => a.status === 'AVAILABLE').length;
      this.assetStats.requests = this.requestedAssets.length;
  }
  getAssetIconClass(c: string | undefined) { return (c || '').toLowerCase().includes('laptop') ? 'fas fa-laptop' : 'fas fa-box'; }
  isAssetAvailable(a: AssetResponse) { return !a.status || a.status === 'AVAILABLE'; }
  get availableAssetsForAssignment() { 
    const assetsForAssignment = Array.isArray(this.assets) ? this.assets : [];
    return assetsForAssignment.filter(a => this.isAssetAvailable(a)); 
  }
  
  openCreateAssetModal() { this.isEditingAsset=false; this.assetForm.reset({type:'Laptop', status:'AVAILABLE', location:'Head Office'}); this.showCreateAssetModal=true; }
  openEditAssetModal(a: AssetResponse) { this.isEditingAsset=true; this.currentAssetId=a.id; this.assetForm.patchValue(a); this.showCreateAssetModal=true; }
  saveAsset() {
      if(this.assetForm.valid) {
          const obs = this.isEditingAsset && this.currentAssetId ? this.userService.updateAsset(this.currentAssetId, this.assetForm.value) : this.userService.createAsset(this.assetForm.value);
          obs.subscribe(() => { this.showCreateAssetModal=false; this.loadAssets(); this.userService.dispatchMessage('Asset saved', 'success'); });
      }
  }
  openAssignModal(a: AssetResponse | null) {
      this.selectedAsset = a; this.isGlobalAssignment = !a; this.selectedAssetIdForGlobal = null;
      this.selectedAssigneeName = (a?.status === 'REQUESTED' && a.employeeId) ? a.employeeId : '';
      this.showAssignAssetModal = true;
  }
  assignAsset() {
      let asset = this.selectedAsset;
      const assetsList = Array.isArray(this.assets) ? this.assets : [];
      if(this.isGlobalAssignment) asset = assetsList.find(x => x.id == this.selectedAssetIdForGlobal) || null;
      if(asset && this.selectedAssigneeName) {
          const emp = this.allEmployees.find(e => e.empId === this.selectedAssigneeName);
          const pl: AssetAssignPayload = {
              assetId: asset.id, assetName: asset.name, assetType: asset.type,
              assignedBy: 'HR', assignedDate: new Date().toISOString(),
              employeeId: this.selectedAssigneeName, employeeName: emp ? `${emp.firstName} ${emp.surname}` : '',
              status: 'ASSIGNED'
          };
      }
  }

  setupProfile() { this.router.navigate(['/onboarding']); }
  getUserInitial() { return (this.userName && this.userName!=='Loading...' && this.userName!=='HR User') ? this.userName.charAt(0).toUpperCase() : 'H'; }
  onProfileImageSelected(e: any) { }
  
  openLeaveApplicationModal(d: any) { this.selectedDateForLeave = new Date(d); this.showLeaveApplicationModal=true; }
  closeLeaveApplicationModal() { this.showLeaveApplicationModal=false; }
  submitLeaveApplication() { this.userService.dispatchMessage('Leave applied', 'success'); this.closeLeaveApplicationModal(); } 

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
    this.cdr.detectChanges();
  }

  closeAttendanceDetailsModal() {
    this.showAttendanceDetailsModal = false;
  }

  openAllHolidaysModal() {
    this.showAllHolidaysModal = true;
  }

  closeAllHolidaysModal() {
    this.showAllHolidaysModal = false;
  }
}