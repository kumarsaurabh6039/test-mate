import { Component, OnInit, OnDestroy, ChangeDetectorRef, Pipe, PipeTransform, HostListener } from '@angular/core'; 
import { FormControl, Validators, FormBuilder, FormGroup } from '@angular/forms';
import { interval, Subscription } from 'rxjs';
import { UserService, DashboardData, LeaveBalanceResponse, HolidayResponse, IndividualAttendanceRecordResponse, EmployeeInfoResponse } from '../user-service.service'; 
import { HttpErrorResponse } from '@angular/common/http';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { LeaveService } from '../services/leave.service';
import { ProfileService } from '../services/profile.service'; 
import { ExitRequestDTO, ExitService } from '../services/exit.service';
import { NotificationService } from '../services/notification.service';
import { ChatbotComponent } from '../chatbot/chatbot.component';
// Pipe for filtering schedule
@Pipe({
  name: 'filterSchedule'
})
export class FilterSchedulePipe implements PipeTransform {
  transform(items: any[], type: string): any[] {
    if (!items || !type) return items;
    return items.filter(item => item.type === type);
  }
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  // Existing properties
  searchControl = new FormControl('');
  notificationsEnabled: boolean = false;
  
  // NEW NOTIFICATION PROPERTIES (For Real-time)
  showNotifications: boolean = false;
  notifications: any[] = [];
  unreadCount: number = 0;

  isHR: boolean = false;
  isEmployee: boolean = false;
  activePage: string = 'dashboard';
  showProfileMenu: boolean = false;
  isProfileModalVisible: boolean = false;
  profileActiveTab: 'details' | 'security' = 'details';
  greeting: string = '';
  userName: string = 'Loading...';
  userProfileImageUrl: string | null = null; 
  currentDayOfWeek: string = '';
  currentDayOfWeekShort: string = '';
  currentMonth: string = '';
  currentDay: number = 0;
  currentTime: string = ''; 
  currentTimeOnly: string = '';
  todayDate: Date = new Date();
  private timeSubscription?: Subscription;
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
  breakElapsedSeconds: number = 0;
  breakTimerDisplay: string = '00:00:00';
  totalBreakSecondsToday: number = 0;
  casualLeaveUsed: number = 0;
  casualLeaveTotal: number = 0;
  sickLeaveUsed: number = 0;
  sickLeaveTotal: number = 0;
  assignmentLeaveUsed: number = 0;
  assignmentLeaveTotal: number = 0;
  unpaidLeaveUsed: number = 0;
  unpaidLeaveTotal: number = 0;
  nextHolidays: HolidayResponse[] = [];
  allHolidays: HolidayResponse[] = []; 
  showAllHolidaysModal: boolean = false;
  showVideo: boolean = false;
  youtubeVideoId: string = 'Z3KnTeDqGEo';
  safeVideoUrl: SafeResourceUrl = '';
  selectedWeekRange: string = '';
  selectedMonthYear: string = '';
  displayedWeekStart: Date = new Date(); 
  calendarDays: { 
    date: number | string; 
    disabled: boolean; 
    selected: boolean; 
    fullDate: Date | null; 
    isHoliday?: boolean; 
    holidayDesc?: string;
  }[] = [];
  fullScheduleDetails: { date: string, desc: string, type: 'attendance' | 'holiday' | 'leave' | 'payday' | 'meeting', canApplyLeave?: boolean, status?: string, dayOfWeekShort?: string, dayOfMonth?: string }[] = [];
  scheduleDetails: { date: string, desc: string, type: 'attendance' | 'holiday' | 'leave' | 'payday' | 'meeting', canApplyLeave?: boolean, status?: string, dayOfWeekShort?: string, dayOfMonth?: string }[] = [];
  selectedScheduleDate: Date | null = null;
  showLeaveApplicationModal: boolean = false;
  selectedDateForLeave: Date | null = null;
  leaveTypeControl = new FormControl('', Validators.required);
  leaveReasonControl = new FormControl('', Validators.required);
  message: string = '';
  messageType: 'success' | 'error' | 'warning' | 'info' | '' = '';
  private messageSubscription?: Subscription;
  loadingDashboardData = false;
  showAttendanceDetailsModal: boolean = false;
  attendanceRecords: IndividualAttendanceRecordResponse[] = [];
  employeeInfo: EmployeeInfoResponse | null = null;
  isOnboarded: boolean = false;
  showOnboardingPopup: boolean = false;
  profileSetupAcknowledged: boolean = false;
  exitForm: FormGroup;
  isExitSubmitting: boolean = false;
  readonly NOTICE_PERIOD_DAYS = 60;
  
  // Managing Subscriptions
  private dashboardDataSubscription?: Subscription;
  private routerSubscription?: Subscription;
  private leaveBalanceSubscription?: Subscription;
  private leavePollingSubscription?: Subscription;
  private profilePicSubscription?: Subscription;
  private notificationPollingSub?: Subscription; 

  constructor(
    private userService: UserService, 
    private cdr: ChangeDetectorRef, 
    private router: Router, 
    private activatedRoute: ActivatedRoute, 
    private sanitizer: DomSanitizer, 
    private leaveService: LeaveService,
    private profileService: ProfileService,
    private fb: FormBuilder,
    private exitService: ExitService,
    private notificationService: NotificationService 
  ) {
    this.safeVideoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${this.youtubeVideoId}?autoplay=1`);
    
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
    if (!localStorage.getItem('authToken')) {
        this.router.navigate(['/login']);
        return;
    }

    this.profilePicSubscription = this.profileService.profileImage$.subscribe(url => {
        this.userProfileImageUrl = url;
        this.cdr.detectChanges(); 
    });

    const cachedImage = localStorage.getItem('userProfileImage');
    if (cachedImage && cachedImage !== 'null') {
        this.profileService.updateImageState(cachedImage);
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
    this.selectedScheduleDate = this.todayDate;

    this.loadDashboardData();
    this.startLeaveBalancePolling();
    
    // NEW: Start Notifications Polling with Real API
    const currentEmpId = localStorage.getItem('empId') || 'EMP-001';
    this.initRealTimeNotifications(currentEmpId);

    this.messageSubscription = this.userService.getMessageUpdates().subscribe(update => {
        if (update) {
            this.showMessage(update.message, update.type);
        } else {
            this.clearMessage();
        }
    });

    this.routerSubscription = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.updateActivePage(event.urlAfterRedirects);
      }
    });
    this.updateActivePage(this.router.url);

    this.setupExitFormListeners();
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

  // --- NEW NOTIFICATION METHODS (Real-time) ---
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
    if (this.exitForm.invalid) {
      this.exitForm.markAllAsTouched();
      this.showMessage('Please correct the errors in the form.', 'warning');
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
            this.showMessage('Resignation application submitted successfully. HR will contact you shortly.', 'success');
            this.exitForm.disable(); 
        },
        error: (err) => {
            this.isExitSubmitting = false;
            console.error('Exit Submission Error:', err);
            const errorMsg = err.error?.message || 'Failed to submit resignation. Please try again.';
            this.showMessage(errorMsg, 'error');
        }
    });
  }

  onCancelExit(): void {
      this.activePage = 'dashboard';
      this.router.navigate(['/dashboard']);
  }

  ngOnDestroy(): void {
    this.timeSubscription?.unsubscribe();
    this.dashboardDataSubscription?.unsubscribe();
    this.routerSubscription?.unsubscribe();
    this.messageSubscription?.unsubscribe();
    this.leaveBalanceSubscription?.unsubscribe();
    this.leavePollingSubscription?.unsubscribe();
    this.profilePicSubscription?.unsubscribe();
    this.notificationPollingSub?.unsubscribe(); 
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

  // --- HELP NAVIGATION METHOD ---
  navigateToHelp(): void {
      this.activePage = 'help';
      this.router.navigate(['/dashboard'], { queryParams: { view: 'help' } });
      this.showProfileMenu = false; 
  }

  // --- TRAINING NAVIGATION METHOD ---
  navigateToTraining(): void {
    this.activePage = 'training';
    this.router.navigate(['/dashboard'], { queryParams: { view: 'training' } });
    this.showProfileMenu = false;
  }

  private getTodayDateKey(): string {
      const now = new Date();
      return `break_time_${now.getFullYear()}_${now.getMonth()}_${now.getDate()}`;
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

  setupProfile(): void {
    this.router.navigate(['/onboarding']);
  }

  getUserInitial(): string {
    if (this.userName && this.userName !== 'Loading...' && this.userName !== 'Employee Name') {
        return this.userName.charAt(0).toUpperCase();
    }
    return 'U';
  }

  private updateActivePage(url: string): void {
    if (url.includes('/payslip')) this.activePage = 'payslip';
    else if (url.includes('/dashboard-leaves')) this.activePage = 'leaves';
    else if (url.includes('/dashboard-swipedata')) this.activePage = 'dashboard-swipedata';
    else if (url.includes('/dashboard-timesheet')) this.activePage = 'dashboard-timesheet';
    else if (url.includes('/dashboard-assets')) this.activePage = 'dashboard-assets'; 
    else if (url.includes('/dashboard-team')) this.activePage = 'dashboard-team';
    else if (url.includes('/dashboard-setting')) this.activePage = 'dashboard-setting';
    else if (url.includes('/dashboard-exit') || url.includes('view=exit')) this.activePage = 'exit';
    else if (url.includes('view=help')) this.activePage = 'help'; 
    else if (url.includes('view=training')) this.activePage = 'training'; 
    else if (url.includes('/profile-manage')) this.activePage = 'profile-manage'; 
    else this.activePage = 'dashboard';
  }

  private loadDashboardData(): void {
    this.loadingDashboardData = true;

    this.dashboardDataSubscription = this.userService.getEmployeeDashboardData().subscribe({
      next: (data: DashboardData | null) => {
        if (data) {
            this.processDashboardData(data);
        } else {
            this.resetDashboardState();
        }
        this.loadingDashboardData = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error fetching dashboard data:', err);
        this.loadingDashboardData = false;
        this.resetDashboardState();
        this.cdr.detectChanges();
      }
    });
  }
  
  private processDashboardData(data: DashboardData): void {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayString = `${year}-${month}-${day}`;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        this.isHR = this.userService.isHR();
        this.isEmployee = this.userService.isEmployee();
        if (data.employeeInfo) {
            this.employeeInfo = data.employeeInfo;
            this.userName = `${data.employeeInfo.firstName || ''} ${data.employeeInfo.surname || ''}`.trim() || 'Employee Name';
            const backendUrl = (data.employeeInfo as any).profilePictureUrl || data.employeeInfo.profileImageUrl;
            if (backendUrl && !backendUrl.includes('placeholder')) {
                 this.profileService.updateImageState(backendUrl);
            }
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
        this.casualLeaveUsed = 0; this.casualLeaveTotal = 0;
        this.sickLeaveUsed = 0; this.sickLeaveTotal = 0;
        this.assignmentLeaveUsed = 0; this.assignmentLeaveTotal = 0;
        this.unpaidLeaveUsed = 0; this.unpaidLeaveTotal = 0;
        if (Array.isArray(data.leaveBalances)) {
          data.leaveBalances.forEach((leave: LeaveBalanceResponse) => {
            const type = (leave.leaveType || '').toLowerCase();
            if (type.includes('casual')) {
                this.casualLeaveUsed = leave.consumed ?? 0;
                this.casualLeaveTotal = leave.total ?? 0;
            } else if (type.includes('sick')) {
                this.sickLeaveUsed = leave.consumed ?? 0;
                this.sickLeaveTotal = leave.total ?? 0;
            } else if (type.includes('annual')) {
                this.assignmentLeaveUsed = leave.consumed ?? 0;
                this.assignmentLeaveTotal = leave.total ?? 0;
            } else if (type.includes('unpaid')) {
                this.unpaidLeaveUsed = leave.consumed ?? 0;
                this.unpaidLeaveTotal = leave.total ?? 0;
            }
          });
        }
        this.allHolidays = Array.isArray(data.holidays) ? data.holidays : [];
        this.nextHolidays = this.allHolidays
          .filter((h: HolidayResponse) => new Date(h.date) >= today)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(0, 3);
        this.populateCalendar(this.displayedWeekStart);
        this.clockLog = [];
        this.isWorking = false;
        this.firstLoginTime = null;
        this.attendanceRecords = data.attendances || []; 
        const todayRecords = this.attendanceRecords.filter((record: IndividualAttendanceRecordResponse) => record.date === todayString);
        todayRecords.forEach((record: IndividualAttendanceRecordResponse) => {
          const login = new Date(record.loginTime);
          let logout: Date | undefined = record.logoutTime ? new Date(record.logoutTime) : undefined;
          this.clockLog.push({ in: login, out: logout });
          if (!this.firstLoginTime || login < this.firstLoginTime) {
            this.firstLoginTime = login;
          }
          if (!record.logoutTime) {
            this.isWorking = true;
          }
        });
        this.calculateTimeTracking();
        this.fullScheduleDetails = [];
        const currentMonth = this.displayedWeekStart.getMonth();
        const currentYear = this.displayedWeekStart.getFullYear();
        const paydayDate = new Date(currentYear, currentMonth, 27);
        if (paydayDate.getDate() === 27) { 
          this.fullScheduleDetails.push({
            date: paydayDate.toISOString().slice(0, 10),
            desc: 'Pay Day <br> Your Pay will be credited on the day!',
            type: 'payday',
            dayOfWeekShort: paydayDate.toLocaleString('en-US', { weekday: 'short' }).toUpperCase(),
            dayOfMonth: paydayDate.getDate().toString()
          });
        }
        if (Array.isArray(data.attendances)) {
          data.attendances.forEach((record: IndividualAttendanceRecordResponse) => {
            const recordDate = new Date(record.date);
            if (recordDate.getFullYear() === currentYear && recordDate.getMonth() === currentMonth) {
              let desc = `Login: ${new Date(record.loginTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
              if (record.logoutTime) {
                desc += `, Logout: ${new Date(record.logoutTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
              } else {
                desc += `, Still clocked in`;
              }
              this.fullScheduleDetails.push({
                date: record.date,
                desc: desc,
                type: 'attendance',
                canApplyLeave: false,
                dayOfWeekShort: recordDate.toLocaleString('en-US', { weekday: 'short' }).toUpperCase(),
                dayOfMonth: recordDate.getDate().toString()
              });
            }
          });
        }
        if (Array.isArray(data.holidays)) {
          data.holidays.forEach((holiday: HolidayResponse) => {
            const holidayDate = new Date(holiday.date);
            if (holidayDate.getFullYear() === currentYear && holidayDate.getMonth() === currentMonth) {
              this.fullScheduleDetails.push({
                date: holiday.date,
                desc: `Holiday: ${holiday.description}`,
                type: 'holiday',
                canApplyLeave: false,
                dayOfWeekShort: holidayDate.toLocaleString('en-US', { weekday: 'short' }).toUpperCase(),
                dayOfMonth: holidayDate.getDate().toString()
              });
            }
          });
        }
        this.fullScheduleDetails.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        this.updateDisplayedScheduleDetails();
        this.cdr.detectChanges(); 
  }

  private startLeaveBalancePolling(): void {
    const empId = localStorage.getItem('empId') || 'EMP001';
    this.leaveBalanceSubscription = this.leaveService.leaveBalance$.subscribe({
      next: (balances) => {
        if (balances && balances.length > 0) {
          balances.forEach((leave: any) => {
            const type = (leave.leaveType || '').toLowerCase();
            if (type.includes('casual')) {
                this.casualLeaveUsed = leave.consumed ?? 0;
                this.casualLeaveTotal = leave.total ?? 0;
            } else if (type.includes('sick')) {
                this.sickLeaveUsed = leave.consumed ?? 0;
                this.sickLeaveTotal = leave.total ?? 0;
            } else if (type.includes('annual')) {
                this.assignmentLeaveUsed = leave.consumed ?? 0;
                this.assignmentLeaveTotal = leave.total ?? 0;
            } else if (type.includes('unpaid')) {
                this.unpaidLeaveUsed = leave.consumed ?? 0;
                this.unpaidLeaveTotal = leave.total ?? 0;
            }
          });
          this.cdr.detectChanges();
        }
      }
    });
    this.leavePollingSubscription = this.leaveService.startLeaveBalancePolling(empId).subscribe();
  }

  private resetDashboardState(): void {
        this.userName = 'Error Loading Data'; 
        this.nextHolidays = [];
        this.allHolidays = [];
        this.totalWorkingHours = '00:00';
        this.pendingWorkingHours = '09:00';
        this.timeTrackingTimer = '00:00:00';
        this.isWorking = false;
        this.clockLog = [];
        this.firstLoginTime = null;
        this.fullScheduleDetails = [];
        this.attendanceRecords = [];
        const authStatus = this.userService.getAuthOnboardedStatus();
        this.isOnboarded = authStatus !== null ? authStatus : false;
        if (!this.isOnboarded) {
            this.showOnboardingPopup = true;
            this.profileSetupAcknowledged = false;
        }
        this.updateDisplayedScheduleDetails();
        this.cdr.detectChanges();
      }

  private updateClock(): void {
    const now = new Date();
    this.currentDayOfWeek = now.toLocaleString('en-US', { weekday: 'long' });
    this.currentDayOfWeekShort = now.toLocaleString('en-US', { weekday: 'short' });
    this.currentMonth = now.toLocaleString('en-US', { month: 'long' });
    this.currentDay = now.getDate();
    this.currentTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    this.currentTimeOnly = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    this.todayDate = now;
    this.updateGreeting(now);
    if (this.isBreakActive && this.breakStartTime) {
      this.breakElapsedSeconds = Math.floor((now.getTime() - this.breakStartTime.getTime()) / 1000);
      this.breakTimerDisplay = this.formatSecondsToHHMMSS(this.breakElapsedSeconds);
    }
  }

  private updateGreeting(now: Date): void {
    const hour = now.getHours();
    if (hour >= 5 && hour < 12) this.greeting = 'Good Morning';
    else if (hour >= 12 && hour < 17) this.greeting = 'Good Afternoon';
    else if (hour >= 17 && hour < 21) this.greeting = 'Good Evening';
    else this.greeting = 'Good Night';
  }

  clockIn(): void {
    if (!this.isWorking) {
      this.loadingDashboardData = true;
      this.userService.recordClockIn().subscribe({
        error: (err: Error) => {
            console.error('Clock-in failed:', err.message);
            this.loadingDashboardData = false;
        },
        complete: () => {
          this.loadingDashboardData = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      this.userService.dispatchMessage('You are already clocked in.', 'warning');
    }
  }

  clockOut(): void {
    if (this.isWorking && this.clockLog.length > 0) {
      this.loadingDashboardData = true;
      this.userService.recordClockOut().subscribe({
        error: (err: Error) => {
            console.error('Clock-out failed:', err.message);
            this.loadingDashboardData = false;
        },
        complete: () => {
          this.loadingDashboardData = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      this.userService.dispatchMessage('You are not clocked in.', 'warning');
    }
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

  private calculateTimeTracking(): void {
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

  startBreak(type: string): void {
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

  endBreak(): void {
    if (!this.isBreakActive) return;
    this.totalBreakSecondsToday += this.breakElapsedSeconds;
    this.saveTodayBreakTime();
    this.userService.dispatchMessage(`${this.currentBreakType} break ended.`, 'success');
    this.isBreakActive = false;
    this.currentBreakType = null;
    this.breakStartTime = null;
    this.breakTimerDisplay = '00:00:00';
    this.cdr.detectChanges();
  }

  openLeaveApplicationModal(date?: Date | string): void {
    this.clearMessage();
    if (date instanceof Date) this.selectedDateForLeave = date;
    else if (typeof date === 'string') this.selectedDateForLeave = new Date(date);
    else if (!this.selectedDateForLeave) this.selectedDateForLeave = new Date();
    this.showLeaveApplicationModal = true;
    this.resetLeaveForm();
  }
  
  closeLeaveApplicationModal(): void {
    this.showLeaveApplicationModal = false;
    this.selectedDateForLeave = null;
    this.resetLeaveForm();
  }

  resetLeaveForm(): void {
    this.leaveTypeControl.setValue('');
    this.leaveReasonControl.setValue('');
    this.leaveTypeControl.markAsUntouched();
    this.leaveReasonControl.markAsUntouched();
  }

  submitLeaveApplication(): void {
    this.clearMessage();
    if (this.leaveTypeControl.invalid || this.leaveReasonControl.invalid || !this.selectedDateForLeave) {
      this.userService.dispatchMessage('Please complete all fields.', 'warning');
      return;
    }
    const empId = this.userService.getEmpIdFromToken() || localStorage.getItem('empId') || 'EMP001';
    const leaveDateISO = this.selectedDateForLeave.toISOString().slice(0, 10);
    const leavePayload = {
      leaveType: this.leaveTypeControl.value!,
      fromDate: leaveDateISO,
      toDate: leaveDateISO,
      reason: this.leaveReasonControl.value!
    };
    this.loadingDashboardData = true;
    this.leaveService.applyLeave(empId, leavePayload).subscribe({
      next: () => {
        this.userService.dispatchMessage('Leave application submitted successfully!', 'success');
        this.closeLeaveApplicationModal();
        this.loadingDashboardData = false;
        this.userService.triggerRefresh();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Leave application failed:', err);
        this.userService.dispatchMessage(err.error?.message || 'Submission failed', 'error');
        this.loadingDashboardData = false;
        this.cdr.detectChanges();
      }
    });
  }

  showMessage(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    this.message = message;
    this.messageType = type;
    this.cdr.detectChanges();
  }
  clearMessage(): void {
    this.message = '';
    this.messageType = '';
    this.cdr.detectChanges();
  }

  viewAttendance(): void { this.openAttendanceDetailsModal(); }
  
  openAttendanceDetailsModal(): void {
    this.clearMessage();
    const today = new Date();
    const currentMonth = this.displayedWeekStart.getMonth();
    const currentYear = this.displayedWeekStart.getFullYear();
    this.attendanceRecords = this.attendanceRecords.filter(record => {
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

  closeAttendanceDetailsModal(): void { this.showAttendanceDetailsModal = false; }
  
  openAllHolidaysModal(): void {
    this.showAllHolidaysModal = true;
  }

  closeAllHolidaysModal(): void {
    this.showAllHolidaysModal = false;
  }
  
  populateCalendar(baseDate: Date): void {
    this.calendarDays = [];
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    this.selectedMonthYear = baseDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDayOfMonth.getDay(); 
    const daysInMonth = lastDayOfMonth.getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < startDayOfWeek; i++) {
        this.calendarDays.push({ date: '', disabled: true, selected: false, fullDate: null });
    }
    for (let day = 1; day <= daysInMonth; day++) {
        const currentDayDate = new Date(year, month, day);
        const isToday = currentDayDate.getTime() === today.getTime();
        const holiday = this.allHolidays.find(h => {
             const hDate = new Date(h.date);
             return hDate.getDate() === day && hDate.getMonth() === month && hDate.getFullYear() === year;
        });
        this.calendarDays.push({
            date: day,
            disabled: false,
            selected: isToday, 
            fullDate: currentDayDate,
            isHoliday: !!holiday,
            holidayDesc: holiday?.description
        });
    }
    this.cdr.detectChanges();
  }

  navigateCalendar(direction: number): void {
    const newDate = new Date(this.displayedWeekStart);
    newDate.setMonth(newDate.getMonth() + direction);
    newDate.setDate(1);
    this.displayedWeekStart = newDate;
    this.populateCalendar(this.displayedWeekStart);
    this.selectedDateForLeave = null;
    this.selectedScheduleDate = null;
    this.updateDisplayedScheduleDetails();
    this.userService.triggerRefresh();
  }

  onDateSelect(fullDate: Date | null): void {
    if (fullDate) {
      this.selectedDateForLeave = fullDate;
      this.selectedScheduleDate = fullDate;
      this.updateDisplayedScheduleDetails();
    } else {
      this.selectedDateForLeave = null;
    }
  }

  isCalendarDaySelectedForLeave(day: any): boolean {
    if (!this.selectedDateForLeave || day.disabled || !day.fullDate) return false;
    return this.selectedDateForLeave.toDateString() === day.fullDate.toDateString();
  }
  
  private updateDisplayedScheduleDetails(): void {
    if (this.selectedScheduleDate) {
      const targetDateISO = this.selectedScheduleDate.toISOString().slice(0, 10);
      this.scheduleDetails = this.fullScheduleDetails.filter(item => item.date === targetDateISO);
      if (this.scheduleDetails.length === 0) {
        this.scheduleDetails.push({
          date: targetDateISO,
          desc: 'No schedule or leave applied for this date.',
          type: 'meeting',
          canApplyLeave: true,
          dayOfWeekShort: this.selectedScheduleDate.toLocaleString('en-US', { weekday: 'short' }).toUpperCase(),
          dayOfMonth: this.selectedScheduleDate.getDate().toString()
        });
      }
    } else {
      const startOfMonth = new Date(this.displayedWeekStart.getFullYear(), this.displayedWeekStart.getMonth(), 1);
      const endOfMonth = new Date(this.displayedWeekStart.getFullYear(), this.displayedWeekStart.getMonth() + 1, 0);
      this.scheduleDetails = this.fullScheduleDetails.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= startOfMonth && itemDate <= endOfMonth;
      });
    }
    this.scheduleDetails.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    this.cdr.detectChanges();
  }
  
  get workingTimeStrokeDasharray(): string {
    return `${this.CIRCUMFERENCE}, ${this.CIRCUMFERENCE}`;
  }

  get workingTimeStrokeDashoffset(): string {
    const [hours, minutes] = this.totalWorkingHours.split(':').map(Number);
    const totalMinutes = (hours * 60) + minutes;
    const progress = Math.min(1, totalMinutes / this.MAX_TARGET_MINUTES);
    return `${this.CIRCUMFERENCE * (1 - progress)}`;
  }

  getLeaveStrokeDasharray(used: number, total: number): string {
    const circumference = 2 * Math.PI * 15;
    return `${circumference}, ${circumference}`;
  }

  getLeaveStrokeDashoffset(used: number, total: number): number {
    if (total <= 0) return 2 * Math.PI * 15;
    const circumference = 2 * Math.PI * 15;
    const percentage = Math.min(1, used / total);
    return circumference * (1 - percentage);
  }

  formatLeaveCount(count: number): string {
    return count < 10 ? '0' + count : count.toString();
  }
  
  playVideo(): void { this.showVideo = true; this.cdr.detectChanges(); }

  acknowledgeOnboarding(): void {
    this.showOnboardingPopup = false;
    this.profileSetupAcknowledged = true;
    this.cdr.detectChanges();
  }
}