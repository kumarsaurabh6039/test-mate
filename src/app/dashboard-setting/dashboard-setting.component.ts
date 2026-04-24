import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
// FIX: Corrected service path and imported EmployeeInfoResponse
import { UserService, EmployeeInfoResponse } from '../user-service.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';

// FIX: EmployeeData interface अब सीधे EmployeeInfoResponse को extend कर रहा है।
interface EmployeeData extends EmployeeInfoResponse {
  id: any;
  // FIX: dashboard-setting UI fields ko match karne ke liye yeh fields add kiye gaye hain
  workEmail?: string;
  phone?: string;
  role?: string;
  reportingTo?: string;
  workShift?: string;
  address?: string;
}

@Component({
  selector: 'app-dashboard-setting',
  templateUrl: './dashboard-setting.component.html',
  styleUrls: ['./dashboard-setting.component.css']
})
export class DashboardSettingComponent implements OnInit, OnDestroy {
  isLoading: boolean = true;
  isEditing: boolean = false;
  profileForm!: FormGroup;
  employeeData: EmployeeData | null = null;
  private dataSubscription?: Subscription;
  private saveSubscription?: Subscription;

  // Constructor mein FormBuilder aur UserService ko inject kiya hai
  constructor(private fb: FormBuilder, private userService: UserService) { }

  ngOnInit(): void {
    this.loadProfileData();
  }
  
  ngOnDestroy(): void {
      this.dataSubscription?.unsubscribe();
      this.saveSubscription?.unsubscribe();
  }

  /**
   * API se Employee ka profile data load karta hai. (Uses EmployeeInfo endpoint)
   */
  loadProfileData(): void {
    this.isLoading = true;
    
    // getEmployeeInfo ko bina argument ke call karte hain, yeh internally empId use karta hai.
    this.dataSubscription = this.userService.getEmployeeInfo().subscribe({
        next: (data: EmployeeInfoResponse) => {
            // FIX: API se aane wale fields ko EmployeeData mein map karte hain
            const mappedData: EmployeeData = {
                ...data,
                phone: data.mobileNumber, // API field: mobileNumber -> Form field: phone
                personalEmail: data.personalEmailId, // API field: personalEmailId -> Form field: personalEmail
                lastName: data.surname,
                // Assuming workEmail, role, reportingTo, workShift, address API se milte hain ya mock kiye jaate hain.
            } as EmployeeData;

            this.employeeData = mappedData;
            
            if (!this.profileForm) {
                this.initForm(this.employeeData);
            } else {
                this.patchFormValues(this.employeeData);
            }
            this.isLoading = false;
        },
        error: (err: HttpErrorResponse) => {
            console.error('Profile data load error:', err);
            this.isLoading = false;
        }
    });
  }

  /**
   * FormGroup ko data ke saath initialize karta hai
   */
  initForm(data: EmployeeData): void {
    this.profileForm = this.fb.group({
      id: [data.id],
      firstName: [data.firstName, [Validators.required, Validators.minLength(2)]],
      lastName: [data.surname, [Validators.required, Validators.minLength(2)]], // surname
      workEmail: [data.workEmail || 'N/A', [Validators.email]],
      personalEmail: [data.personalEmailId, [Validators.email]], // personalEmailId
      phone: [data.mobileNumber, [Validators.pattern('^[0-9]{10}$')]], // mobileNumber
      department: [data.department],
      role: [data.role],
      reportingTo: [data.reportingTo],
      workShift: [data.workShift],
      address: [data.address]
    });

    this.profileForm.disable();
  }

  /**
   * Form values ko employeeData se patch karta hai
   */
  patchFormValues(data: EmployeeData): void {
      this.profileForm.patchValue({
        id: data.id,
        firstName: data.firstName,
        lastName: data.surname,
        workEmail: data.workEmail,
        personalEmail: data.personalEmailId,
        phone: data.mobileNumber,
        department: data.department,
        role: data.role,
        reportingTo: data.reportingTo,
        workShift: data.workShift,
        address: data.address
      });
  }

  // Edit button click karne par chalta hai
  toggleEdit(): void {
    this.isEditing = true;
    this.profileForm.enable();
    // Work Email ko hamesha disable rakhte hain, yeh change nahi hona chahiye
    this.profileForm.get('workEmail')?.disable();
  }

  // Save button click karne par chalta hai
  saveProfile(): void {
    if (this.profileForm.valid && this.employeeData) {
      this.isLoading = true;
      
      // Update data structure to match EmployeeInfoResponse for API payload
      const updatedProfile: EmployeeInfoResponse = {
        ...this.employeeData, // Existing data (empId, birthday, holidays etc.)
        id: this.profileForm.value.id, // Ensure id is from form
        firstName: this.profileForm.value.firstName,
        surname: this.profileForm.value.lastName, // Map form 'lastName' back to API 'surname'
        personalEmailId: this.profileForm.value.personalEmail, // Map form 'personalEmail' to API 'personalEmailId'
        mobileNumber: this.profileForm.value.phone, // Map form 'phone' to API 'mobileNumber'
        
        // Other fields that might be updatable, keeping them optional if not in original API
        department: this.profileForm.value.department,
        role: this.profileForm.value.role,
        address: this.profileForm.value.address,
        // workEmail ko update karne se bachne ke liye, use yahan nahi daal rahe hain.
      } as EmployeeInfoResponse;
      
      // API call to update profile using the new UserService method
      this.saveSubscription = this.userService.updateEmployeeProfile(updatedProfile).subscribe({
          next: (savedData) => {
              // Saved data aane par local state aur form ko update karein
              this.employeeData = savedData as EmployeeData; 
              this.patchFormValues(this.employeeData); // Form ko new data se patch karo
              this.isEditing = false;
              this.profileForm.disable();
              this.isLoading = false;
              // Success Message is dispatched by UserService
          },
          error: (err: HttpErrorResponse) => {
              // Error message dispatched by UserService
              this.isLoading = false;
          }
      });
    } else {
        this.userService.dispatchMessage('कृपया फ़ॉर्म त्रुटियों को ठीक करें।', 'warning');
    }
  }

  // Cancel button click karne par chalta hai
  cancelEdit(): void {
    this.isEditing = false;
    // Form ko reset karke original data wapas bhar dete hain
    if (this.employeeData) {
      this.patchFormValues(this.employeeData);
    }
    this.profileForm.disable();
  }
}
