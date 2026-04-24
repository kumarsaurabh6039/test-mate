import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

// Updated interface to match common Backend mapping based on the error
export interface PoshComplaintRequest {
  respondentName: string;     
  incidentDate: string;       
  incidentDescription: string; 
  witnesses?: string;         
  evidenceFiles?: any[];      
  location?: string;
  isAnonymous?: boolean;      
  empId?: string | null;             
  complainantName?: string;   
}

export interface PoshStatusUpdateRequest {
  status: 'IN_REVIEW' | 'RESOLVED' | 'WITHDRAWN' | string;
  remarks: string;            
  actionTaken?: string;       
}

@Injectable({
  providedIn: 'root'
})
export class PoshService {

  private baseUrl = 'https://api.lovahr.com/api/posh';

  constructor(private http: HttpClient) { }

  /**
   * Helper method to get Auth Headers
   * Agar aapke app mein HttpInterceptor nahi hai, toh yeh function automatically Token add kar dega.
   */
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token'); // Ya jo bhi aapke token ka key name ho (e.g., 'jwt_token')
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  /**
   * 1. Nayi complaint file karne ke liye (Employee ke liye)
   * Endpoint: POST /api/posh/complaints
   */
  fileComplaint(complaintData: any): Observable<any> {
    // Bhejne se pehle headers attach kar rahe hain
    return this.http.post(`${this.baseUrl}/complaints`, complaintData, { headers: this.getAuthHeaders() });
  }

  /**
   * 2. Logged-in user ki apni complaints dekhne ke liye
   */
  getMyComplaints(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/complaints/mine`, { headers: this.getAuthHeaders() });
  }

  /**
   * 3. Saari complaints dekhne ke liye (Sirf HR/ICC Admin ke liye)
   */
  getAllComplaints(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/complaints`, { headers: this.getAuthHeaders() });
  }

  /**
   * 4. Kisi specific complaint ki details lene ke liye
   */
  getComplaintDetail(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/complaints/${id}`, { headers: this.getAuthHeaders() });
  }

  /**
   * 5. Complaint ka status update karne ke liye (ICC/HR Action)
   */
  updateComplaintStatus(id: number, updateData: PoshStatusUpdateRequest): Observable<any> {
    return this.http.put(`${this.baseUrl}/complaints/${id}/status`, updateData, { headers: this.getAuthHeaders() });
  }

  /**
   * 6. Annual Report generate karne ke liye
   */
  getAnnualReport(year: number): Observable<string> {
    const params = new HttpParams().set('year', year.toString());
    return this.http.get(`${this.baseUrl}/reports/annual`, { params, headers: this.getAuthHeaders(), responseType: 'text' });
  }

  /**
   * 7. Dashboard ke liye statistics lane ke liye
   */
  getStats(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/stats`, { headers: this.getAuthHeaders() });
  }
}