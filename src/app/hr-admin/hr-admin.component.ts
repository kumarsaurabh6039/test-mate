import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminUsersComponent } from './admin-users/admin-users.component';
import { AdminTeamsComponent } from './admin-teams/admin-teams.component';
import { AdminAssetsComponent } from './admin-assets/admin-assets.component';
import { AdminPayrollComponent } from './admin-payroll/admin-payroll.component';
import { AdminHolidaysComponent } from './admin-holidays/admin-holidays.component';
import { AdminTimesheetComponent } from './admin-timesheet/admin-timesheet.component';
import { AdminExternalLinksComponent } from './admin-external-links/admin-external-links.component';
import { AdminExitComponent } from '../admin-exit/admin-exit.component';
import { AdminPoshComponent } from '../admin-posh/admin-posh.component';
import { AdminTrainingComponent } from '../admin-training/admin-training.component';
import { AdminPolicyComponent } from '../admin-policy/admin-policy.component';
import { UploadDocChatbotComponent } from '../upload-doc-chatbot/upload-doc-chatbot.component';
import { AdminDocumentTypesComponent } from '../admin-document-types/admin-document-types.component'; // ✅ NEW

@Component({
  selector: 'app-hr-admin',
  standalone: true,
  imports: [
    CommonModule,
    AdminUsersComponent,
    AdminTeamsComponent,
    AdminAssetsComponent,
    AdminPayrollComponent,
    AdminHolidaysComponent,
    AdminTimesheetComponent,
    AdminExternalLinksComponent,
    AdminExitComponent,
    AdminPoshComponent,
    AdminTrainingComponent,
    AdminPolicyComponent,
    UploadDocChatbotComponent,
    AdminDocumentTypesComponent // ✅ NEW
  ],
  templateUrl: './hr-admin.component.html',
  styleUrls: ['./hr-admin.component.css']
})
export class HrAdminComponent {
  @Output() switchToEmployee = new EventEmitter<void>();

  activeTab: string = 'users';

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }

  goBackToEmployeeView() {
    this.switchToEmployee.emit();
  }
}
