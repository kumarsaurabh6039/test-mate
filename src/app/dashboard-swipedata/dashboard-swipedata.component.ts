import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService, IndividualAttendanceRecordResponse } from '../user-service.service';
import { Subscription, interval } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';

interface DailySwipeUI {
  date: string;
  day: string;
  firstIn: Date;
  lastOut: Date | null;
  formattedTotalHours: string;
  status: string;
  statusClass: string;
  sessionsCount: number;
}

@Component({
  selector: 'app-dashboard-swipedata',
  templateUrl: './dashboard-swipedata.component.html',
  styleUrls: ['./dashboard-swipedata.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class DashboardSwipedataComponent implements OnInit, OnDestroy {
  isLoading = false;
  dailyRecords: DailySwipeUI[] = [];
  startDate: string = '';
  endDate: string = '';
  
  private pollingSub: Subscription | undefined;

  constructor(private userService: UserService) {
    const today = new Date();
    this.endDate = today.toISOString().slice(0, 10);
    const start = new Date();
    start.setDate(today.getDate() - 30); // Last 30 days
    this.startDate = start.toISOString().slice(0, 10);
  }

  ngOnInit(): void {
    this.initRealTimeData();
  }

  ngOnDestroy(): void {
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
    }
  }

  handleDateChange(): void {
    // When manually changing dates, we reload immediately
    this.loadSwipeData();
  }

  initRealTimeData(): void {
    this.isLoading = true;
    // Poll every 15 seconds for real-time updates
    this.pollingSub = interval(15000).pipe(
      startWith(0),
      switchMap(() => this.userService.getEmployeeDashboardData())
    ).subscribe({
      next: (data) => {
        const rawRecords = data.attendances || [];
        this.processDailyRecords(rawRecords);
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  loadSwipeData(): void {
    this.isLoading = true;
    this.userService.getEmployeeDashboardData().subscribe({
        next: (data) => {
            const rawRecords = data.attendances || [];
            this.processDailyRecords(rawRecords);
            this.isLoading = false;
        },
        error: () => {
            this.isLoading = false;
        }
    });
  }

  private processDailyRecords(records: IndividualAttendanceRecordResponse[]): void {
      const grouped = new Map<string, { 
          date: string, 
          sessions: IndividualAttendanceRecordResponse[],
          firstIn: Date,
          lastOut: Date | null,
          totalDurationMs: number 
      }>();

      // 1. Group by Date
      records.forEach(rec => {
          if (!grouped.has(rec.date)) {
              grouped.set(rec.date, {
                  date: rec.date,
                  sessions: [],
                  firstIn: new Date(rec.loginTime), // Init with first found
                  lastOut: null,
                  totalDurationMs: 0
              });
          }
          const group = grouped.get(rec.date)!;
          group.sessions.push(rec);

          const login = new Date(rec.loginTime);
          const logout = rec.logoutTime ? new Date(rec.logoutTime) : null;

          // Update First In
          if (login < group.firstIn) {
              group.firstIn = login;
          }

          // Update Last Out & Duration
          if (logout) {
              if (!group.lastOut || logout > group.lastOut) {
                  group.lastOut = logout;
              }
              group.totalDurationMs += (logout.getTime() - login.getTime());
          }
      });

      // 2. Convert to UI Model
      const processed: DailySwipeUI[] = [];
      const todayStr = new Date().toISOString().slice(0, 10);

      grouped.forEach((val, key) => {
          const hours = Math.floor(val.totalDurationMs / 3600000);
          const mins = Math.floor((val.totalDurationMs % 3600000) / 60000);
          const durationStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
          
          let status = 'Absent';
          let statusClass = 'status-absent';

          // Status Logic
          if (hours >= 9) {
              status = 'Present';
              statusClass = 'status-valid';
          } else if (hours >= 4) {
              status = 'Half Day';
              statusClass = 'status-onduty'; 
          } else {
              status = 'Short Leave';
              statusClass = 'status-missing';
          }

          // Flag Missing Punch if not today
          if (!val.lastOut && val.date !== todayStr) {
              status = 'Missed Punch';
              statusClass = 'status-missing';
          }

          // If today and still working
          if (!val.lastOut && val.date === todayStr) {
             status = 'On Duty';
             statusClass = 'status-onduty';
          }

          processed.push({
              date: val.date,
              day: val.firstIn.toLocaleString('en-US', { weekday: 'short' }),
              firstIn: val.firstIn,
              lastOut: val.lastOut,
              formattedTotalHours: durationStr,
              status: status,
              statusClass: statusClass,
              sessionsCount: val.sessions.length
          });
      });

      // 3. Filter by Date Range
      if (this.startDate && this.endDate) {
          const start = new Date(this.startDate);
          const end = new Date(this.endDate);
          this.dailyRecords = processed.filter(r => {
              const d = new Date(r.date);
              return d >= start && d <= end;
          });
      } else {
          this.dailyRecords = processed;
      }

      // 4. Sort Descending
      this.dailyRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
}