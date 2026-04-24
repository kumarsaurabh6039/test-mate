import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NotificationService } from 'src/app/services/notification.service';
import { AlertService } from 'src/app/services/alert.service';

@Component({
  selector: 'app-admin-notification',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-notification.component.html',
  styleUrls: ['./admin-notification.component.css']
})
export class AdminNotificationComponent implements OnInit {
  private notificationService = inject(NotificationService);
  private alert = inject(AlertService);
  private fb = inject(FormBuilder);

  // State Management
  activeTab = signal<'ANNOUNCE' | 'DIRECT' | 'SYSTEM'>('ANNOUNCE');
  isSubmitting = signal(false);

  // Forms
  announceForm!: FormGroup;
  directForm!: FormGroup;

  // Constants
  notificationTypes = [
    'GENERAL', 'SYSTEM_ANNOUNCEMENT', 'POLICY_UPDATED', 'TRAINING_ENROLLED', 
    'ASSET_ASSIGNED', 'PAYSLIP_GENERATED', 'ATTENDANCE_REMINDER'
  ];

  constructor() {
    this.initForms();
  }

  ngOnInit(): void {}

  initForms() {
    // HR Announcement Form
    this.announceForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      message: ['', [Validators.required, Validators.minLength(10)]],
      priority: ['MEDIUM', Validators.required]
    });

    // Direct/Bulk Notification Form
    this.directForm = this.fb.group({
      recipientEmpIds: ['', Validators.required], // Comma separated IDs
      title: ['', [Validators.required]],
      message: ['', [Validators.required]],
      type: ['GENERAL', Validators.required],
      priority: ['LOW']
    });
  }

  switchTab(tab: 'ANNOUNCE' | 'DIRECT' | 'SYSTEM') {
    this.activeTab.set(tab);
  }

  // --- 1. Send HR Announcement ---
  submitAnnouncement() {
    if (this.announceForm.invalid) {
      this.announceForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.notificationService.sendHrAnnouncement(this.announceForm.value).subscribe({
      next: (res) => {
        this.alert.success('Announcement sent successfully to all employees!');
        this.announceForm.reset({ priority: 'MEDIUM' });
        this.isSubmitting.set(false);
      },
      error: (err) => {
        this.alert.error('Failed to send announcement.');
        this.isSubmitting.set(false);
      }
    });
  }

  // --- 2. Send Direct / Bulk Notification ---
  submitDirectNotification() {
    if (this.directForm.invalid) {
      this.directForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const formValue = this.directForm.value;
    
    // Split and clean Employee IDs
    const empIds = formValue.recipientEmpIds
      .split(',')
      .map((id: string) => id.trim())
      .filter((id: string) => id.length > 0);

    if (empIds.length === 0) {
      this.alert.warning('At least one Employee ID is required.');
      this.isSubmitting.set(false);
      return;
    }

    if (empIds.length === 1) {
      // Single Notification Call
      const singlePayload = {
        title: formValue.title,
        message: formValue.message,
        type: formValue.type,
        priority: formValue.priority,
        recipientEmpId: empIds[0]
      };

      this.notificationService.createNotification(singlePayload).subscribe({
        next: () => this.handleDirectSuccess(),
        error: () => this.handleDirectError()
      });
    } else {
      // Bulk Notification Call
      const bulkPayload = {
        title: formValue.title,
        message: formValue.message,
        type: formValue.type,
        recipientEmpIds: empIds
      };

      this.notificationService.createBulkNotifications(bulkPayload).subscribe({
        next: () => this.handleDirectSuccess(),
        error: () => this.handleDirectError()
      });
    }
  }

  private handleDirectSuccess() {
    this.alert.success('Notification(s) sent successfully!');
    this.directForm.reset({ type: 'GENERAL', priority: 'LOW' });
    this.isSubmitting.set(false);
  }

  private handleDirectError() {
    this.alert.error('Failed to send notifications. Please try again.');
    this.isSubmitting.set(false);
  }

  // --- 3. System Actions ---
  async triggerHolidayReminders() {
    const confirmed = await this.alert.confirm('Trigger Reminders?', 'Do you want to send reminders for upcoming holidays to all employees?');
    if (confirmed) {
      this.notificationService.triggerHolidayReminders().subscribe({
        next: () => this.alert.success('Holiday reminders triggered successfully!'),
        error: () => this.alert.error('Failed to trigger reminders.')
      });
    }
  }

  async cleanupExpired() {
    const confirmed = await this.alert.confirm('Cleanup Expired?', 'All expired notifications will be deleted from the system. Confirm?');
    if (confirmed) {
      this.notificationService.cleanupExpiredNotifications().subscribe({
        next: () => this.alert.success('Expired notifications cleaned up!'),
        error: () => this.alert.error('Cleanup failed.')
      });
    }
  }

  async cleanupOld(days: number) {
    const confirmed = await this.alert.confirm(`Delete Older than ${days} days?`, `Are you sure you want to delete notifications older than ${days} days?`);
    if (confirmed) {
      this.notificationService.deleteOldNotifications(days).subscribe({
        next: () => this.alert.success(`Old notifications (>${days} days) deleted successfully!`),
        error: () => this.alert.error('Cleanup failed.')
      });
    }
  }
}