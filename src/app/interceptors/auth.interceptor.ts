import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/**
 * Auth Interceptor: Har outgoing API request mein authToken attach karta hai.
 * Agar backend 401 (Unauthorized) return karta hai, toh user ko logout kar deta hai.
 */
export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const router = inject(Router);
  
  // UserService ki tarah 'authToken' ka use kar rahe hain
  const token = localStorage.getItem('authToken');

  // Public APIs jinme token ki zaroorat nahi hai (Saari onboarding APIs add kar di)
  const publicUrls = [
    '/authenticate',
    '/api/users/activate-account',
    '/forgot-password',
    '/api/super-admin/organizations/onboard', // Main onboarding
    '/organizations/register',
    '/step1/company',
    '/step2/headquarters',
    '/step3/department',
    '/step4/complete'
  ];

  const isPublicRequest = publicUrls.some(url => req.url.includes(url));

  let authReq = req;

  // Agar token available hai aur request public nahi hai, toh header add karein
  if (token && !isPublicRequest) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // 401 error matlab token expire ho chuka hai ya invalid hai
      if (error.status === 401) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('empId');
        localStorage.removeItem('role');
        router.navigate(['/sign-in']); // Make sure to route to sign-in
      }
      return throwError(() => error);
    })
  );
};