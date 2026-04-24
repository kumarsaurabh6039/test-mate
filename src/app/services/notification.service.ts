import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';

// DTO Interfaces based on Swagger
export interface HrAnnouncementRequest {
  title: string;
  message: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

export interface NotificationCreateRequest {
  title: string;
  message: string;
  type: string;
  recipientEmpId: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  expiresAt?: string;
}

export interface BulkNotificationRequest {
  title: string;
  message: string;
  type: string;
  recipientEmpIds: string[];
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient);
  private baseUrl = 'https://api.lovahr.com/api/notifications';

  // --- Admin Methods ---

  // 1. Send HR Announcement
  sendHrAnnouncement(request: HrAnnouncementRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/hr/announce`, request);
  }

  // 2. Create Single Notification
  createNotification(request: NotificationCreateRequest): Observable<any> {
    return this.http.post(this.baseUrl, request);
  }

  // 3. Create Bulk Notifications
  createBulkNotifications(request: BulkNotificationRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/bulk`, request);
  }

  // 4. Trigger Holiday Reminders (Admin)
  triggerHolidayReminders(): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/trigger-holiday-reminders`, {});
  }

  // 5. Cleanup Expired Notifications
  cleanupExpiredNotifications(): Observable<any> {
    return this.http.delete(`${this.baseUrl}/cleanup/expired`);
  }

  // 6. Delete Old Notifications
  deleteOldNotifications(days: number = 90): Observable<any> {
    let params = new HttpParams().set('days', days.toString());
    return this.http.delete(`${this.baseUrl}/cleanup/old`, { params });
  }

  // --- User Dashboard Methods (Real-time Integration) ---

  // Get all notifications for an employee
  getNotifications(empId: string): Observable<any[]> {
    let params = new HttpParams().set('empId', empId);
    return this.http.get<any[]>(this.baseUrl, { params });
  }

  // Get count of unread notifications
  getUnreadCount(empId: string): Observable<number> {
    let params = new HttpParams().set('empId', empId);
    return this.http.get<number>(`${this.baseUrl}/unread/count`, { params });
  }

  // Mark single notification as read
  markAsRead(id: number, empId: string): Observable<any> {
    let params = new HttpParams().set('empId', empId);
    return this.http.put(`${this.baseUrl}/${id}/read`, {}, { params });
  }

  // Mark all notifications as read
  markAllAsRead(empId: string): Observable<any> {
    let params = new HttpParams().set('empId', empId);
    return this.http.put(`${this.baseUrl}/read-all`, {}, { params });
  }

  // Start Real-time Polling (Background sync)
  startNotificationPolling(empId: string, intervalMs: number = 30000): Observable<any[]> {
    // intervalMs default is 30 seconds
    return timer(0, intervalMs).pipe(
      switchMap(() => this.getNotifications(empId))
    );
  }
}