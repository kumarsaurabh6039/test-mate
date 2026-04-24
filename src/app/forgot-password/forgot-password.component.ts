import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertService } from '../services/alert.service'; // Tumhara existing alert service
import { PasswordResetService } from '../services/password-reset.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent implements OnInit {
  // Forms for each step
  emailForm!: FormGroup;
  otpForm!: FormGroup;
  resetForm!: FormGroup;

  // State Management
  currentStep: number = 1; // 1: Email, 2: OTP, 3: New Password
  isLoading: boolean = false;
  userEmail: string = ''; // Store email globally for steps

  constructor(
    private fb: FormBuilder,
    private resetService: PasswordResetService,
    private alertService: AlertService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Step 1 Form
    this.emailForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    // Step 2 Form
    this.otpForm = this.fb.group({
      otp: ['', [Validators.required, Validators.pattern('^[0-9]{4,6}$')]] // Assuming 4-6 digit OTP
    });

    // Step 3 Form
    this.resetForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  // Custom Validator for matching passwords
  passwordMatchValidator(control: AbstractControl): { [key: string]: boolean } | null {
    const newPass = control.get('newPassword');
    const confirmPass = control.get('confirmPassword');
    if (newPass && confirmPass && newPass.value !== confirmPass.value) {
      return { 'mismatch': true };
    }
    return null;
  }

  // --- ACTIONS ---

  // Step 1: Request OTP
  requestOtp(): void {
    if (this.emailForm.invalid) return;

    this.isLoading = true;
    const email = this.emailForm.value.email;

    this.resetService.forgotPassword(email).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.userEmail = email; // Save email for next steps
        this.currentStep = 2; // Move to Next Step
        this.alertService.success('OTP sent to your email!', 'Check Inbox');
      },
      error: (err) => {
        this.isLoading = false;
        this.alertService.error(err.error?.message || 'Email not found', 'Failed');
      }
    });
  }

  // Step 2: Verify OTP
  verifyOtp(): void {
    if (this.otpForm.invalid) return;

    this.isLoading = true;
    const otp = this.otpForm.value.otp;

    this.resetService.verifyOtp(this.userEmail, otp).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.currentStep = 3; // Move to Final Step
        this.alertService.success('OTP Verified successfully.', 'Almost There');
      },
      error: (err) => {
        this.isLoading = false;
        this.alertService.error('Invalid OTP. Please try again.', 'Verification Failed');
      }
    });
  }

  // Step 3: Reset Password
  finalizeReset(): void {
    if (this.resetForm.invalid) return;

    this.isLoading = true;
    const payload = {
      email: this.userEmail,
      otp: Number(this.otpForm.value.otp), // Backend needs OTP again for security
      newPassword: this.resetForm.value.newPassword,
      confirmPassword: this.resetForm.value.confirmPassword
    };

    this.resetService.resetPassword(payload).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.alertService.success('Password changed successfully!', 'Done');
        
        // Redirect back to login after 1.5 seconds
        setTimeout(() => {
          this.router.navigate(['/sign-in']);
        }, 1500);
      },
      error: (err) => {
        this.isLoading = false;
        this.alertService.error(err.error?.message || 'Could not reset password', 'Error');
      }
    });
  }

  // Utility: Resend OTP
  resendOtp(): void {
    this.isLoading = true;
    this.resetService.resendOtp(this.userEmail).subscribe({
      next: () => {
        this.isLoading = false;
        this.alertService.success('A new OTP has been sent.', 'Resent');
      },
      error: () => {
        this.isLoading = false;
        this.alertService.error('Could not resend OTP.', 'Error');
      }
    });
  }

  // Go back to login
  cancel(): void {
    this.router.navigate(['/sign-in']);
  }
}