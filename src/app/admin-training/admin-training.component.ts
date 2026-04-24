import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { TrainingService, TrainingResponse, EnrollmentResponse } from '../services/training.service';
import { UserService, EmployeeInfoResponse } from '../services/user-service.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-training',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-training.component.html',
  styleUrls: ['./admin-training.component.css']
})
export class AdminTrainingComponent implements OnInit {
  private trainingService = inject(TrainingService);
  private userService = inject(UserService);
  private fb = inject(FormBuilder);

  trainings: TrainingResponse[] = [];
  allEmployees: EmployeeInfoResponse[] = [];
  filteredEmployees: EmployeeInfoResponse[] = [];

  loading = false;
  selectedRoleFilter: string = 'ALL';

  // Modals state
  showTrainingModal = false;
  showAssignModal = false;
  showViewAssignedModal = false;
  isEditMode = false;
  currentTrainingId: number | null = null;

  // View Assigned State
  assignedEnrollments: EnrollmentResponse[] = [];
  loadingAssignments = false;

  // Server-side field errors (keyed by field name from API response)
  serverErrors: Record<string, string> = {};

  // Forms
  trainingForm: FormGroup;
  assignForm: FormGroup;

  constructor() {
    this.trainingForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', [Validators.maxLength(5000)]],
      durationHours: [0, [Validators.min(0)]],
      startDate: [''],
      endDate: [''],
      status: ['DRAFT', Validators.required]
    });

    this.assignForm = this.fb.group({
      employeeId: ['', Validators.required],
      trainingId: [null, Validators.required]
    });
  }

  ngOnInit() {
    this.loadTrainings();
    this.loadEmployees();
  }

  // --- CRUD OPERATIONS ---

  loadTrainings() {
    this.loading = true;
    this.trainingService.getAllTrainings().subscribe({
      next: (data) => {
        this.trainings = data;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        Swal.fire('Error', 'Failed to load trainings.', 'error');
      }
    });
  }

  loadEmployees() {
    this.userService.getAllEmployees().subscribe({
      next: (data) => {
        this.allEmployees = data;
        this.filterEmployees();
      },
      error: (err) => {
        console.error('Failed to load employees', err);
      }
    });
  }

  openCreateModal() {
    this.isEditMode = false;
    this.currentTrainingId = null;
    this.serverErrors = {};
    this.trainingForm.reset({ status: 'DRAFT', durationHours: 0 });
    this.showTrainingModal = true;
  }

  openEditModal(training: TrainingResponse) {
    this.isEditMode = true;
    this.currentTrainingId = training.id;
    this.serverErrors = {};
    this.trainingForm.patchValue({
      title: training.title,
      description: training.description,
      durationHours: training.durationHours,
      startDate: training.startDate,
      endDate: training.endDate,
      status: training.status
    });
    this.showTrainingModal = true;
  }

  saveTraining() {
    if (this.trainingForm.invalid) {
      this.trainingForm.markAllAsTouched();
      return;
    }

    const payload = this.trainingForm.value;
    this.loading = true;
    this.serverErrors = {}; // Clear previous server errors before each save

    if (this.isEditMode && this.currentTrainingId) {
      this.trainingService.updateTraining(this.currentTrainingId, payload).subscribe({
        next: () => {
          this.closeModal();
          this.loadTrainings();
          Swal.fire('Success', 'Training updated successfully!', 'success');
        },
        error: (err) => {
          this.loading = false;
          this.handleServerValidationError(err);
        }
      });
    } else {
      this.trainingService.createTraining(payload).subscribe({
        next: () => {
          this.closeModal();
          this.loadTrainings();
          Swal.fire('Success', 'Training created successfully!', 'success');
        },
        error: (err) => {
          this.loading = false;
          this.handleServerValidationError(err);
        }
      });
    }
  }

  private handleServerValidationError(err: any): void {
    if (err.status === 400 && err.error?.errors) {
      this.serverErrors = err.error.errors as Record<string, string>;
      Object.keys(this.serverErrors).forEach(field => {
        this.trainingForm.get(field)?.markAsTouched();
      });
    } else {
      Swal.fire('Error', err.error?.message || 'Failed to save training.', 'error');
    }
  }

  clearServerError(field: string): void {
    if (this.serverErrors[field]) {
      delete this.serverErrors[field];
    }
  }

  deleteTraining(id: number) {
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.trainingService.deleteTraining(id).subscribe({
          next: () => {
            this.loadTrainings();
            Swal.fire('Deleted!', 'Training has been deleted.', 'success');
          },
          error: () => Swal.fire('Error', 'Failed to delete training.', 'error')
        });
      }
    });
  }

  // --- VIEW ASSIGNED USERS ---

  openViewAssignedModal(training: TrainingResponse) {
    this.currentTrainingId = training.id;
    this.showViewAssignedModal = true;
    this.loadingAssignments = true;

    this.trainingService.getTrainingEnrollments(training.id).subscribe({
      next: (enrollments) => {
        this.assignedEnrollments = enrollments;
        this.loadingAssignments = false;
      },
      error: (err) => {
        console.error(err);
        this.loadingAssignments = false;
        Swal.fire('Error', 'Failed to load assigned users.', 'error');
      }
    });
  }

  // --- ASSIGNMENT OPERATIONS ---

  openAssignModal(training: TrainingResponse) {
    this.assignForm.reset();
    this.assignForm.patchValue({ trainingId: training.id, employeeId: '' });
    this.selectedRoleFilter = 'ALL';
    this.currentTrainingId = training.id;

    this.loading = true;
    
    // Fetch currently assigned users so we can exclude them from the select dropdown
    this.trainingService.getTrainingEnrollments(training.id).subscribe({
      next: (enrollments) => {
        this.assignedEnrollments = enrollments;
        this.filterEmployees(); // Updates the filtered list excluding assigned users
        this.loading = false;
        this.showAssignModal = true;
      },
      error: (err) => {
        console.warn('Could not fetch existing enrollments, defaulting to all employees', err);
        // Fallback incase API doesn't exist yet, just allow all
        this.assignedEnrollments = [];
        this.filterEmployees();
        this.loading = false;
        this.showAssignModal = true;
      }
    });
  }

  onRoleFilterChange(event: any) {
    this.selectedRoleFilter = event.target.value;
    this.filterEmployees();
    this.assignForm.patchValue({ employeeId: '' });
  }

  filterEmployees() {
    // 1. Get IDs of already assigned employees
    const assignedEmpIds = this.assignedEnrollments.map(e => e.employeeId);

    // 2. Filter by selected role
    let baseList = this.allEmployees;
    if (this.selectedRoleFilter !== 'ALL') {
      baseList = baseList.filter(emp => {
        const empRole = (emp.role || 'EMPLOYEE').toUpperCase();
        return empRole === this.selectedRoleFilter;
      });
    }

    // 3. Exclude already assigned employees
    this.filteredEmployees = baseList.filter(emp => !assignedEmpIds.includes(emp.empId));
    
    // Reset selection if the previously selected user got filtered out
    if (this.assignForm) {
      this.assignForm.patchValue({ employeeId: '' });
    }
  }

  assignTraining() {
    if (this.assignForm.invalid) return;

    const { employeeId, trainingId } = this.assignForm.value;
    this.loading = true;

    this.trainingService.assignTrainingToEmployee(employeeId, trainingId).subscribe({
      next: () => {
        this.loading = false;
        this.showAssignModal = false;
        Swal.fire('Success', 'Training assigned successfully!', 'success');
      },
      error: (err) => {
        this.loading = false;
        Swal.fire('Error', err.error?.message || 'Failed to assign training.', 'error');
      }
    });
  }

  // --- HELPERS ---

  closeModal() {
    this.showTrainingModal = false;
    this.showAssignModal = false;
    this.showViewAssignedModal = false;
    this.serverErrors = {};
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'ACTIVE': 
      case 'COMPLETED':
        return 'status-active';
      case 'DRAFT': 
      case 'ENROLLED':
        return 'status-draft';
      case 'INACTIVE': 
        return 'status-inactive';
      case 'IN_PROGRESS':
        return 'status-progress';
      default: return '';
    }
  }
}