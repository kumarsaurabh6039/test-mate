import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PasswordResetService {
  // Apne API ka base URL yahan set karein
  private baseUrl = 'https://api.lovahr.com/api/auth';

  constructor(private http: HttpClient) {}

  // Step 1: Send OTP to Email
  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/forgot-password`, { email });
  }

  // Step 2: Verify OTP
  // Note: Backend might expect { email, otp } payload
  verifyOtp(email: string, otp: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/verify-otp`, { email, otp });
  }

  // Step 3: Reset Password
  resetPassword(payload: any): Observable<any> {
    // Payload structure: { email, otp, newPassword, confirmPassword }
    return this.http.post(`${this.baseUrl}/reset-password`, payload);
  }

  // Optional: Resend OTP
  resendOtp(email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/resend-otp`, { email });
  }
}