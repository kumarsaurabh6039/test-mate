import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// --- Interfaces ---

export interface TrainingRequest {
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  durationHours?: number;
  status?: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
}

export interface TrainingResponse {
  id: number;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  durationHours?: number;
  status: string;
  trainingCode?: string;
  orgCode?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CourseRequest {
  trainingId: number;
  title: string;
  description?: string;
  courseType: 'VIDEO' | 'DOCUMENT' | 'QUIZ' | 'PRESENTATION' | 'INTERACTIVE';
  contentUrl?: string;
  durationMinutes?: number;
  sequenceOrder?: number;
}

export interface CourseResponse {
  id: number;
  trainingId: number;
  title: string;
  description?: string;
  courseType: string;
  contentUrl?: string;
  durationMinutes?: number;
  sequenceOrder?: number;
}

export interface EnrollmentRequest {
  trainingId: number;
  employeeId?: number | string;
}

export interface EnrollmentResponse {
  id: number;
  trainingId: number;
  employeeId: string;
  employeeName: string;
  status: string;
  overallProgress: number;
  enrollmentDate: string;
  completionDate?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TrainingService {
  private http = inject(HttpClient);
  
  // Base API Path - Using the explicit IP address provided
  private readonly baseUrl = 'https://api.lovahr.com';
  
  private readonly trainingUrl = `${this.baseUrl}/api/trainings`;
  private readonly courseUrl = `${this.baseUrl}/api/courses`;
  private readonly enrollmentUrl = `${this.baseUrl}/api/enrollments`;

  // ==========================================
  // 1. TRAINING OPERATIONS (Admin & Employee)
  // ==========================================

  getAllTrainings(): Observable<TrainingResponse[]> {
    return this.http.get<TrainingResponse[]>(this.trainingUrl);
  }

  getTrainingsByStatus(status: string): Observable<TrainingResponse[]> {
    return this.http.get<TrainingResponse[]>(`${this.trainingUrl}/status/${status}`);
  }

  getTrainingById(id: number): Observable<TrainingResponse> {
    return this.http.get<TrainingResponse>(`${this.trainingUrl}/${id}`);
  }

  // Admin Only
  createTraining(request: TrainingRequest): Observable<TrainingResponse> {
    return this.http.post<TrainingResponse>(this.trainingUrl, request);
  }

  // Admin Only
  updateTraining(id: number, request: TrainingRequest): Observable<TrainingResponse> {
    return this.http.put<TrainingResponse>(`${this.trainingUrl}/${id}`, request);
  }

  // Admin Only
  deleteTraining(id: number): Observable<void> {
    return this.http.delete<void>(`${this.trainingUrl}/${id}`);
  }

  // ==========================================
  // 2. COURSE / CHAPTER OPERATIONS (Admin)
  // ==========================================

  getCoursesByTrainingId(trainingId: number): Observable<CourseResponse[]> {
    return this.http.get<CourseResponse[]>(`${this.courseUrl}/training/${trainingId}`);
  }

  createCourse(request: CourseRequest): Observable<CourseResponse> {
    return this.http.post<CourseResponse>(this.courseUrl, request);
  }

  updateCourse(id: number, request: CourseRequest): Observable<CourseResponse> {
    return this.http.put<CourseResponse>(`${this.courseUrl}/${id}`, request);
  }

  deleteCourse(id: number): Observable<void> {
    return this.http.delete<void>(`${this.courseUrl}/${id}`);
  }

  // ==========================================
  // 3. ENROLLMENT / ASSIGNMENT OPERATIONS
  // ==========================================

  // Admin: Assign training to specific employee
  assignTrainingToEmployee(employeeId: string, trainingId: number): Observable<EnrollmentResponse> {
    const request: EnrollmentRequest = { trainingId };
    return this.http.post<EnrollmentResponse>(`${this.enrollmentUrl}/admin/enroll/${employeeId}`, request);
  }

  // Employee: Enroll self in a training
  enrollSelf(employeeId: string, trainingId: number): Observable<EnrollmentResponse> {
    const request: EnrollmentRequest = { trainingId };
    return this.http.post<EnrollmentResponse>(`${this.enrollmentUrl}/enroll/${employeeId}`, request);
  }

  // Get enrollments for an employee
  getEmployeeEnrollments(employeeId: string): Observable<EnrollmentResponse[]> {
    return this.http.get<EnrollmentResponse[]>(`${this.enrollmentUrl}/employee/${employeeId}`);
  }

  // Get enrollments by status (e.g., 'IN_PROGRESS', 'COMPLETED')
  getEmployeeEnrollmentsByStatus(employeeId: string, status: string): Observable<EnrollmentResponse[]> {
    return this.http.get<EnrollmentResponse[]>(`${this.enrollmentUrl}/employee/${employeeId}/status/${status}`);
  }

  // ** NEW: Get all enrollments for a specific training **
  // Note to backend: This endpoint is required for filtering existing users in the UI.
  getTrainingEnrollments(trainingId: number): Observable<EnrollmentResponse[]> {
    return this.http.get<EnrollmentResponse[]>(`${this.enrollmentUrl}/training/${trainingId}`);
  }

  // Update progress (e.g., when a video finishes)
  updateProgress(enrollmentId: number, progressPercent: number): Observable<EnrollmentResponse> {
    return this.http.put<EnrollmentResponse>(`${this.enrollmentUrl}/${enrollmentId}/progress`, { progress: progressPercent });
  }
}