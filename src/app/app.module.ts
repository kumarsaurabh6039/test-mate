import { NgModule, isDevMode } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptors } from '@angular/common/http'; 

// Angular Material Modules
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';

// App Components
import { AppComponent } from './app.component';
import { StreamsOfTrustComponent } from './streams-of-trust/streams-of-trust.component';
import { YourConstellationComponent } from './your-constellation/your-constellation.component';
import { PaperBoatsComponent } from './paper-boats/paper-boats.component';
import { CompassOfCultureComponent } from './compass-of-culture/compass-of-culture.component';
import { OnboardingCompleteComponent } from './onboarding-complete/onboarding-complete.component';
import { OnboardingComponent } from './onboarding/onboarding.component';
import { DashboardComponent } from './dashboard/dashboard.component';

// Signup Step Components
import { SignUpStep1Component } from './sign-up-step1/sign-up-step1.component';

// Routing & Services
import { AppRoutingModule } from './app-routing.module';
import { CircleOfCareComponent, } from './sign-up-step3/sign-up-step3.component';
import { IdentityStreamComponent } from './sign-up-step2/sign-up-step2.component';
import { UserService } from './services/user-service.service';
import { RouterModule } from '@angular/router';
import { SignInComponent } from './sign-in/sign-in.component';
import { PayslipComponent } from './payslip/payslip.component';
import { LeavesComponent } from './leaves/leaves.component';
import { DashboardSettingComponent } from './dashboard-setting/dashboard-setting.component';
import { DashboardTeamComponent } from './dashboard-team/dashboard-team.component';
import { DashboardTimesheetComponent } from './dashboard-timesheet/dashboard-timesheet.component';
import { HrDashboardComponent } from './hr-dashboard/hr-dashboard.component';
import { ManagerDashboardComponent } from './manager-dashboard/manager-dashboard.component';
import { UpdatePasswordComponent } from './update-password/update-password.component';
import { DashboardAssetsComponent } from './dashboard-assets/dashboard-assets.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { CompanyOnboardingComponent } from './company-onboarding/company-onboarding.component';
import { ServiceWorkerModule } from '@angular/service-worker';
import { DashboardSwipedataComponent } from './dashboard-swipedata/dashboard-swipedata.component';
import { ProfileManageComponent } from './profile-manage/profile-manage.component';
import { AdminUsersComponent } from './hr-admin/admin-users/admin-users.component';
import { AdminAssetsComponent } from './hr-admin/admin-assets/admin-assets.component';
import { AdminTeamsComponent } from './hr-admin/admin-teams/admin-teams.component';
import { AdminPayrollComponent } from './hr-admin/admin-payroll/admin-payroll.component';
import { AdminHolidaysComponent } from './hr-admin/admin-holidays/admin-holidays.component';
import { AdminTimesheetComponent } from './hr-admin/admin-timesheet/admin-timesheet.component';
import { HrAdminComponent } from './hr-admin/hr-admin.component';
import { AdminExternalLinksComponent } from './hr-admin/admin-external-links/admin-external-links.component';
import { authInterceptor } from './interceptors/auth.interceptor';
import { LandingPageComponent } from './landing-page/landing-page.component';
import { PricingComponent } from './pricing/pricing.component';
import { GeneratePayslipComponent } from './generate-payslip/generate-payslip.component';
import { ExitComponent } from './exit/exit.component';
import { AdminExitComponent } from './admin-exit/admin-exit.component';
import { PoshComponent } from './posh/posh.component';
import { AdminPoshComponent } from './admin-posh/admin-posh.component';
import { EmployeeTrainingComponent } from './employee-training/employee-training.component';
import { AdminTrainingComponent } from './admin-training/admin-training.component';
import { AdminNotificationComponent } from './admin-notification/admin-notification.component';
import { AdminPolicyComponent } from './admin-policy/admin-policy.component';
import { ChatbotComponent } from './chatbot/chatbot.component';
import { UploadDocChatbotComponent } from './upload-doc-chatbot/upload-doc-chatbot.component';
import { AdminDocumentTypesComponent } from './admin-document-types/admin-document-types.component';
@NgModule({
  declarations: [
    AppComponent,
    SignUpStep1Component,
    IdentityStreamComponent,
    CircleOfCareComponent,
    StreamsOfTrustComponent,
    YourConstellationComponent,
    PaperBoatsComponent,
    SignInComponent,
    OnboardingCompleteComponent,
    OnboardingComponent,
    DashboardSettingComponent,
    DashboardComponent,
    UpdatePasswordComponent,
    ForgotPasswordComponent,
  
    
    
  
  ],
  imports: [
    BrowserModule,
    RouterModule,
    AdminPoshComponent,
    ProfileManageComponent,
    ReactiveFormsModule,
    ChatbotComponent,
    PoshComponent,
    AdminPolicyComponent,
    AdminTrainingComponent,
    EmployeeTrainingComponent,
    PayslipComponent,
    DashboardTeamComponent,
    DashboardTimesheetComponent,
    HrAdminComponent,
    AppRoutingModule,
    FormsModule,
    CompassOfCultureComponent,
    BrowserAnimationsModule,
    MatSidenavModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatCardModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule,
    AdminUsersComponent,
    AdminAssetsComponent,
    AdminTeamsComponent,
    AdminPayrollComponent,
    AdminHolidaysComponent,
    MatGridListModule,
    MatProgressBarModule,
    ManagerDashboardComponent,
    MatSelectModule,
    LeavesComponent,
    DashboardSwipedataComponent,
    DashboardAssetsComponent,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    }),
  ],
  providers: [
    provideHttpClient(
      withInterceptors([authInterceptor])
    ),
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }