import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Guards
import { AuthGuard } from './auth.guard';
import { GuestGuard } from './guest.guard';

// Components
import { PaperBoatsComponent } from './paper-boats/paper-boats.component';
import { StreamsOfTrustComponent } from './streams-of-trust/streams-of-trust.component';
import { YourConstellationComponent } from './your-constellation/your-constellation.component';
import { CompassOfCultureComponent } from './compass-of-culture/compass-of-culture.component';
import { OnboardingCompleteComponent } from './onboarding-complete/onboarding-complete.component';
import { OnboardingComponent } from './onboarding/onboarding.component';
import { SignInComponent } from './sign-in/sign-in.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { PayslipComponent } from './payslip/payslip.component';
import { SignUpStep1Component } from './sign-up-step1/sign-up-step1.component';
import { IdentityStreamComponent } from './sign-up-step2/sign-up-step2.component';
import { CircleOfCareComponent } from './sign-up-step3/sign-up-step3.component';
import { DashboardAssetsComponent } from './dashboard-assets/dashboard-assets.component';
import { DashboardTeamComponent } from './dashboard-team/dashboard-team.component';
import { HrDashboardComponent } from './hr-dashboard/hr-dashboard.component';
import { ManagerDashboardComponent } from './manager-dashboard/manager-dashboard.component';
import { UpdatePasswordComponent } from './update-password/update-password.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { CompanyOnboardingComponent } from './company-onboarding/company-onboarding.component';
import { SuperAdminComponent } from './super-admin/super-admin.component';
import { ProfileManageComponent } from './profile-manage/profile-manage.component';
import { PricingComponent } from './pricing/pricing.component';
import { ExitComponent } from './exit/exit.component';
import { LandingPageComponent } from './landing-page/landing-page.component';
import { ChatbotComponent } from './chatbot/chatbot.component';

const routes: Routes = [
  // --- Public Landing Page (Shown First) ---
  { path: '', component: LandingPageComponent },

  // --- Public Routes (Only accessible when NOT logged in) ---
  { path: 'sign-in', component: SignInComponent, canActivate: [GuestGuard] },
 { path: 'forgot-password', component: ForgotPasswordComponent, canActivate: [GuestGuard] },

// Keep the update-password route exactly as you had it:
{ path: 'update-password', component: UpdatePasswordComponent, canActivate: [GuestGuard] },

  { path: 'sign-up/step-1', component: SignUpStep1Component, canActivate: [AuthGuard] },
  { path: 'sign-up/step-2', component: IdentityStreamComponent, canActivate: [AuthGuard] },
  { path: 'sign-up/step-3', component: CircleOfCareComponent, canActivate: [AuthGuard] },
  
  // --- Completely Public Route (No Guards) ---
  { path: 'company-onboarding', component: CompanyOnboardingComponent },
  { path: 'pricing', component: PricingComponent },
  
  // --- Protected Routes (Login required) ---
  { path: 'onboarding', component: OnboardingComponent, canActivate: [AuthGuard] },
  { path: 'sign-up/paper-boats', component: PaperBoatsComponent, canActivate: [AuthGuard] },
  { path: 'sign-up/streams-of-trust', component: StreamsOfTrustComponent, canActivate: [AuthGuard] },
  { path: 'sign-up/your-constellation', component: YourConstellationComponent, canActivate: [AuthGuard] },
  { path: 'sign-up/compass-of-culture', component: CompassOfCultureComponent, canActivate: [AuthGuard] },
  { path: 'onboarding-complete', component: OnboardingCompleteComponent, canActivate: [AuthGuard] },
  {path:'chatbot',component:ChatbotComponent},
  // Dashboards
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'dashboard-leaves', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'dashboard-assets', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'payslip', component: DashboardComponent, canActivate: [AuthGuard] }, 
  { path: 'dashboard-swipedata', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'dashboard-team', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'dashboard-timesheet', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'dashboard-setting', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'hr-dashboard', component: HrDashboardComponent, canActivate: [AuthGuard] },
  { path: 'manager-dashboard', component: ManagerDashboardComponent, canActivate: [AuthGuard] },
  { path: 'super-admin-dashboard', component: SuperAdminComponent, canActivate: [AuthGuard] },
  
  // Profile & Settings
  { path: 'profile-manage', component: ProfileManageComponent, canActivate: [AuthGuard] },
  { path: 'dashbooard-exit', component: ExitComponent, canActivate: [AuthGuard] },
  
  // Defaults (Redirect any unknown path back to the landing page)
  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)], 
  exports: [RouterModule] 
})
export class AppRoutingModule { }