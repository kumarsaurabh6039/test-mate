import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class GuestGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean | UrlTree {
    const token = localStorage.getItem('authToken');
    
    // Agar user pehle se logged in hai (token hai), toh uska role check karein
    if (token) {
      const userRole = localStorage.getItem('userRole');
      
      // Role ke hisaab se specific dashboard par wapas bhej dein
      if (userRole === 'HR') {
        return this.router.createUrlTree(['/hr-dashboard']);
      } else if (userRole === 'MANAGER') {
        return this.router.createUrlTree(['/manager-dashboard']);
      } else if (userRole === 'SUPER_ADMIN' || userRole === 'SUPERADMIN') {
        return this.router.createUrlTree(['/super-admin-dashboard']);
      } else {
        return this.router.createUrlTree(['/dashboard']); // Default employee
      }
    }

    // Agar login nahi hai, toh login/sign-up page dekhne dein
    return true;
  }
}