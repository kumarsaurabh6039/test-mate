import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AlertService } from './alert.service';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private baseUrl = 'https://api.lovahr.com'; 

  // This Subject holds the current image URL for the entire app
  private profileImageSubject = new BehaviorSubject<string | null>(null);
  public profileImage$ = this.profileImageSubject.asObservable();

  constructor(
    private http: HttpClient, 
    private alertService: AlertService
  ) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * Updates the global state of the profile image.
   * Adds a timestamp query param to force browser to reload the image (Cache Busting).
   */
  updateImageState(url: string | null) {
    if (url && url !== 'null' && !url.includes('placeholder')) {
      // Remove existing timestamp if present to avoid stacking (?t=123&t=456)
      const cleanUrl = url.split('?')[0];
      const freshUrl = `${cleanUrl}?t=${Date.now()}`;
      
      this.profileImageSubject.next(freshUrl);
      
      // Persist in local storage for faster initial load next time
      localStorage.setItem('userProfileImage', freshUrl);
    } else {
      this.profileImageSubject.next(null);
      localStorage.removeItem('userProfileImage');
    }
  }

  /**
   * CRITICAL FIX: Clears the service state on Logout
   * This ensures the next logged-in user doesn't see the previous user's image.
   * Call this in dashboard.component.ts logout()
   */
  clearProfileData() {
    this.profileImageSubject.next(null);
    localStorage.removeItem('userProfileImage');
    localStorage.removeItem('cachedUserName');
  }

  uploadProfilePicture(empId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);

    const headers = this.getAuthHeaders(); 

    return this.http.post(`${this.baseUrl}/api/employees/${empId}/profile-picture`, formData, { headers }).pipe(
      tap((response: any) => {
        if (response && (response.success || response.profilePictureUrl)) {
          // If API returns the new URL, use it
          const newUrl = response.profilePictureUrl; 
          this.updateImageState(newUrl);
          this.alertService.success('Profile picture updated successfully!');
        }
      }),
      catchError(err => {
        console.error('Upload Error:', err);
        this.alertService.error(err.error?.message || 'Failed to upload image');
        return throwError(() => err);
      })
    );
  }

  deleteProfilePicture(empId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/api/employees/${empId}/profile-picture`, { headers: this.getAuthHeaders() }).pipe(
      tap(() => {
        this.updateImageState(null);
        this.alertService.success('Profile picture removed');
      }),
      catchError(err => {
        this.alertService.error('Delete failed');
        return throwError(() => err);
      })
    );
  }

  // Helper to change password
  changePassword(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/users/change-password`, payload, { 
      headers: this.getAuthHeaders().set('Content-Type', 'application/json') 
    }).pipe(
      tap(() => this.alertService.success('Password updated successfully')),
      catchError(err => throwError(() => err))
    );
  }
  
  // Helper to update details
  updateProfileDetails(empId: string, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/api/employees/${empId}/profile`, data, { 
      headers: this.getAuthHeaders().set('Content-Type', 'application/json') 
    }).pipe(
      tap(() => this.alertService.success('Profile details updated')),
      catchError(err => throwError(() => err))
    );
  }
}