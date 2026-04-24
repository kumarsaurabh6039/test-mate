import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService, ActivateAccountPayload } from '../user-service.service';
import { AlertService } from '../services/alert.service';

@Component({
  selector: 'app-update-password',
  templateUrl: './update-password.component.html',
  styleUrls: ['./update-password.component.css']
})
export class UpdatePasswordComponent implements OnInit {
  updatePasswordForm!: FormGroup;
  isLoading: boolean = false;
  apiErrorMessage: string = ''; // Backend errors show karne ke liye variable
  
  // Variables for eye icon toggle logic
  showInitialPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private router: Router,
    private alertService: AlertService // Injected AlertService dependency
  ) {}

  ngOnInit(): void {
    // Regex update: Minimum 8 characters required
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

    this.updatePasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      initialPassword: ['', Validators.required],
      newPassword: ['', [
        Validators.required, 
        Validators.minLength(8),
        Validators.pattern(strongPasswordRegex) 
      ]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  // Custom validator to check if New Password and Confirm Password match
  passwordMatchValidator(form: FormGroup) {
    const newPass = form.get('newPassword')?.value;
    const confirmPass = form.get('confirmPassword')?.value;
    if (!newPass || !confirmPass) return null;
    return newPass === confirmPass ? null : { mismatch: true };
  }

  onSubmit(): void {
    if (this.updatePasswordForm.invalid) {
      this.updatePasswordForm.markAllAsTouched(); 
      return;
    }

    this.isLoading = true;
    this.apiErrorMessage = ''; // Clear previous error
    const formValue = this.updatePasswordForm.value;

    const payload: ActivateAccountPayload = {
      email: formValue.email,
      initialPassword: formValue.initialPassword,
      newPassword: formValue.newPassword,
      confirmPassword: formValue.confirmPassword
    };

    this.userService.activateAccount(payload).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        
        // Handle case where API returns 200 OK but with success: false
        if (response && response.success === false) {
          this.apiErrorMessage = this.extractCleanMessage(response);
          return;
        }
        
        this.alertService.success('Account activated successfully! Redirecting to login...', 'Success!');
        this.userService.clearAuthToken();
        
        setTimeout(() => {
          this.router.navigate(['/sign-in']);
        }, 2000);
      },
      error: (err) => {
        this.isLoading = false;
        // Parse raw error and set it to the variable
        this.apiErrorMessage = this.extractCleanMessage(err);
      }
    });
  }

  // Deep parsing helper jo specifically backend ke stringified JSON strings ko handle karta hai
  private extractCleanMessage(err: any): string {
    let cleanMsg = 'Failed to activate account. Please check your credentials.';
    
    try {
      // 1. Sabse pehle Angular ke standard err.error object ko check karein
      let errorBody = err?.error || err;
      if (typeof errorBody === 'string') {
         try { errorBody = JSON.parse(errorBody); } catch(e) {}
      }

      // 2. Normal error properties dhoondhein
      if (errorBody?.errors?.newPassword) {
         cleanMsg = errorBody.errors.newPassword;
      } else if (errorBody?.message) {
         cleanMsg = errorBody.message;
      } else if (err?.message) {
         cleanMsg = err.message;
      }

      // 3. MOST IMPORTANT: Agar mila hua message phir se ek stringified JSON hai (jaisa aapke screenshot mein hai)
      if (typeof cleanMsg === 'string' && cleanMsg.trim().startsWith('{')) {
         const nestedJson = JSON.parse(cleanMsg);
         if (nestedJson?.message) {
            cleanMsg = nestedJson.message;
         }
      }
    } catch (e) {
      // 4. Agar parsing buri tarah fail ho jaye, tab regex use karke direct "message" ki value extract karein
      const match = String(err?.error || err?.message || err).match(/"message"\s*:\s*"([^"]+)"/);
      if (match && match[1]) {
         cleanMsg = match[1];
      }
    }

    return cleanMsg;
  }
}