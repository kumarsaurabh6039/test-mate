import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// API request body schema as per Swagger
export interface ContactSalesRequest {
  fullName: string;
  workEmail: string;
  companyName?: string;
  phoneNumber?: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContactSalesService {
  // Use environment variable in production, using the host from Swagger for now
  private apiUrl = 'https://api.lovahr.com/api/contact-sales';

  constructor(private http: HttpClient) { }

  submitInquiry(data: ContactSalesRequest): Observable<any> {
    return this.http.post<any>(this.apiUrl, data);
  }
}