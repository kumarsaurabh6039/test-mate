import { Component, EventEmitter, Input, OnInit, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ProfileService } from '../services/profile.service';
import { UserService } from '../user-service.service';
import { AlertService } from '../services/alert.service';

@Component({
  selector: 'app-profile-manage',
  templateUrl: './profile-manage.component.html',
  styleUrls: ['./profile-manage.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class ProfileManageComponent implements OnInit, OnChanges {
  @Input() isVisible: boolean = false;
  @Input() activeTab: 'profile' | 'password' = 'profile'; 
  @Input() employeeData: any = null; 
  @Output() close = new EventEmitter<void>();

  profileForm!: FormGroup;
  passwordForm!: FormGroup;
  isLoading: boolean = false;
  
  // URL for displaying image
  previewImage: string | null = null;
  // Store the selected file locally before uploading
  selectedFile: File | null = null;

  constructor(
    private fb: FormBuilder,
    private profileService: ProfileService,
    private userService: UserService,
    private alertService: AlertService
  ) {
    this.initForms();
  }

  private initForms() {
    this.profileForm = this.fb.group({
      firstName: ['', Validators.required],
      surname: ['', Validators.required],
      middleName: [''],
      nickName: [''],
      gender: [''],
      birthday: [''],
      personalEmailId: ['', [Validators.required, Validators.email]],
      mobileNumber: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      location: ['']
    });

    this.passwordForm = this.fb.group({
      oldPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, { validator: this.checkPasswords });
  }

  ngOnInit(): void {
    // Sync with global profile image state
    this.profileService.profileImage$.subscribe(img => {
      // Only update preview from service if user hasn't selected a new local file yet
      if (!this.selectedFile) {
        this.previewImage = img;
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['employeeData'] && this.employeeData) {
      this.patchFormValues();
    }
  }

  patchFormValues() {
    if (!this.employeeData) return;
    
    this.profileForm.patchValue({
      firstName: this.employeeData.firstName,
      surname: this.employeeData.surname,
      middleName: this.employeeData.middleName,
      nickName: this.employeeData.nickName,
      gender: this.employeeData.gender,
      birthday: this.employeeData.birthday,
      personalEmailId: this.employeeData.personalEmailId,
      mobileNumber: this.employeeData.mobileNumber,
      location: this.employeeData.location 
    });
  }

  // MODIFIED: Just preview the file, don't upload immediately
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Size check (2MB)
      if (file.size > 2 * 1024 * 1024) {
        this.alertService.error('Image size must be less than 2MB');
        return;
      }

      // Show local preview immediately using FileReader
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.previewImage = e.target.result;
      };
      reader.readAsDataURL(file);

      // Store file to be uploaded later on "Save Changes"
      this.selectedFile = file;
    }
  }

  removePhoto() {
    const empId = this.userService.getEmpIdFromToken();
    if (!empId) return;

    this.alertService.confirm('Remove Photo', 'Are you sure you want to delete your profile picture?', 'Delete')
      .then(confirmed => {
        if (confirmed) {
          this.isLoading = true;
          this.profileService.deleteProfilePicture(empId).subscribe({
            next: () => {
              this.isLoading = false;
              this.selectedFile = null; // Clear any pending selection
            },
            error: () => this.isLoading = false
          });
        }
      });
  }

  // MODIFIED: Handles both Image Upload (POST) and Profile Update (PUT)
  saveProfile() {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    const empId = this.userService.getEmpIdFromToken();
    if (!empId) return;

    this.isLoading = true;
    const profilePayload = { ...this.employeeData, ...this.profileForm.value };

    // Helper function to update text details (PUT)
    const performProfileUpdate = () => {
      this.profileService.updateProfileDetails(empId, profilePayload).subscribe({
        next: () => {
          this.isLoading = false;
          this.selectedFile = null; // Reset selection
          this.closeModal();
        },
        error: () => this.isLoading = false
      });
    };

    // If a file is selected, upload it first (POST)
    if (this.selectedFile) {
      this.profileService.uploadProfilePicture(empId, this.selectedFile).subscribe({
        next: (response) => {
          // Image uploaded successfully, now update profile details
          // Note: The service automatically handles cache busting (?t=...)
          performProfileUpdate();
        },
        error: (err) => {
          this.isLoading = false;
          // Even if image fails, we might want to stop or notify user
          this.alertService.error('Failed to upload image. Profile not saved.');
        }
      });
    } else {
      // No file selected, just update details
      performProfileUpdate();
    }
  }

  checkPasswords(group: FormGroup) {
    const pass = group.get('newPassword')?.value;
    const confirmPass = group.get('confirmPassword')?.value;
    return pass === confirmPass ? null : { notSame: true };
  }

  changePasswordSubmit() {
    if (this.passwordForm.invalid) return;
    const userName = localStorage.getItem('userName') || this.employeeData?.personalEmailId;
    
    this.isLoading = true;
    this.profileService.changePassword({
        userName: userName,
        currentPassword: this.passwordForm.value.oldPassword,
        newPassword: this.passwordForm.value.newPassword,
        confirmPassword: this.passwordForm.value.confirmPassword,
        orgCode: localStorage.getItem('orgCode') || 'CITRI'
    }).subscribe({
      next: () => {
        this.isLoading = false;
        this.closeModal();
      },
      error: () => this.isLoading = false
    });
  }

  switchTab(tab: 'profile' | 'password') { this.activeTab = tab; }
  
  closeModal() { 
    this.selectedFile = null; // Clear selection on close
    this.close.emit(); 
  }
}