import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { UserService } from '../user-service.service';
import { AlertService } from '../services/alert.service';

@Component({
  selector: 'app-sign-in',
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.css']
})
export class SignInComponent implements OnInit {
  signInForm!: FormGroup;
  isLoading: boolean = false;
  showPassword: boolean = false;

  constructor(
    private router: Router, 
    private userService: UserService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.signInForm = new FormGroup({
      userName: new FormControl('', [Validators.required, Validators.minLength(3)]),
      password: new FormControl('', [Validators.required, Validators.minLength(4)])
    });
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  signIn(): void {
    if (this.signInForm.invalid) {
      this.alertService.error('Please enter a valid username and password.', 'Invalid Input');
      return;
    }

    const credentials = {
      userName: this.signInForm.value.userName.trim(),
      password: this.signInForm.value.password.trim()
    };

    this.isLoading = true;

    this.userService.login(credentials).subscribe({
      next: (response: any) => {
        
        // ==========================================
        // NEW USER CHECK: Prevent dashboard access
        // ==========================================
        // Check the exact flag from the backend payload
        if (response.accountActivated === false) {
            this.isLoading = false;
            this.alertService.error('Please set up your new password to access the dashboard.', 'Action Required');
            this.userService.clearAuthToken(); // Ensure no token is saved yet
            this.router.navigate(['/update-password'], { replaceUrl: true });
            return; // Stop execution here so they don't go to the dashboard
        }
        
        // Store token for regular valid users (accountActivated is true)
        this.userService.storeToken(response.token);
        
        // Match role by trimming and converting to uppercase
        const userRole = (response.role || '').trim().toUpperCase(); 
        
        console.log('Backend Role:', response.role);
        console.log('Matched Role:', userRole);

        this.userService.storeUserDetails(response.empId, userRole);
        
        // Save role in localStorage for GuestGuard to read
        localStorage.setItem('userRole', userRole);
        
        this.userService.triggerRefresh(); 
        
        // Role-Based Navigation Logic
        let redirectPath = '';

        if (userRole === 'HR') {
            redirectPath = '/hr-dashboard';
        } else if (userRole === 'MANAGER') {
            redirectPath = '/manager-dashboard'; 
        } else if (userRole === 'SUPER_ADMIN' || userRole === 'SUPERADMIN') { 
            redirectPath = '/super-admin-dashboard';
        } else if (userRole === 'EMPLOYEE') {
            redirectPath = '/dashboard';
        } 
        
        if (redirectPath) {
          this.alertService.success('Login successful! Redirecting...', 'Welcome Back!');
          setTimeout(() => {
            this.isLoading = false;
            this.router.navigate([redirectPath], { replaceUrl: true });
          }, 1000);
        } else {
          this.isLoading = false;
          console.warn('Unknown Role:', userRole);
          this.alertService.error('Your role is not defined in the system.', 'Login Failed');
          this.userService.clearAuthToken();
          localStorage.removeItem('userRole');
        }
      },
      error: (error: any) => { 
        this.isLoading = false;
        const errMsg: string = (error?.message || error?.error?.message || '').toLowerCase();

        console.error('Login error:', error);

        // If backend throws an error for unactivated accounts → redirect to Change Your Password page
        if (
          errMsg.includes('not activated') ||
          errMsg.includes('account not active') ||
          errMsg.includes('activate') ||
          errMsg.includes('password not set')
        ) {
          this.alertService.error(
            'Your account is not activated yet. Please set your password to continue.',
            'Account Not Activated'
          );
          setTimeout(() => {
            this.router.navigate(['/update-password'], { replaceUrl: true });
          }, 1500);
        } else {
          this.alertService.error(
            error.message || 'Something went wrong. Please try again.',
            'Login Failed'
          );
        }
      }
    });
  }
}