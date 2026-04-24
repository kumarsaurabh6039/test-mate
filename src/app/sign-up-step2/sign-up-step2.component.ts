import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../services/user-service.service';
import { AlertService } from '../services/alert.service';

@Component({
  selector: 'app-identity-stream',
  templateUrl: './sign-up-step2.component.html',
  styleUrls: ['./sign-up-step2.component.css']
})
export class IdentityStreamComponent implements OnInit {
  uploadedImage: string | ArrayBuffer | null = null;
  uploadedFileName: string = '';
  identityForm!: FormGroup;
  maxDate!: string;

  // Work email stored at component level so the validator can access it
  private workEmail: string = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private dataService: UserService,
    private alertService: AlertService
  ) {}

  // ---------------------------------------------------------------
  // Decode the JWT token to extract the work email.
  // Spring Security stores the login username (work email) in the
  // token's 'sub' claim — this is the most reliable source because:
  //   - formData does not carry workEmail across onboarding steps
  //   - localStorage('workEmail') is never explicitly set anywhere
  // ---------------------------------------------------------------
  private getWorkEmailFromToken(): string {
    const token = localStorage.getItem('authToken');
    if (!token) return '';
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // Spring Security JWT: 'sub' = username = work email (login credential)
      return payload.sub || payload.email || payload.workEmail || '';
    } catch {
      return '';
    }
  }

  ngOnInit(): void {
    // Set max date to today so future dates are blocked in the date picker
    const today = new Date();
    this.maxDate = today.toISOString().split('T')[0];

    const savedData = this.dataService.getFormData();

    // Resolve work email — JWT 'sub' claim is the primary source.
    // The admin-entered email becomes the login username stored in 'sub'.
    // Other sources are fallbacks for edge cases.
    this.workEmail = (
      this.getWorkEmailFromToken() ||          // Primary: decoded from JWT 'sub' claim
      savedData?.step1?.workEmail ||           // Fallback 1
      savedData?.personalDetails?.workEmail || // Fallback 2
      localStorage.getItem('workEmail') ||     // Fallback 3
      ''
    ).toLowerCase().trim();

    this.identityForm = this.fb.group({
      department: ['', Validators.required],

      personalEmailId: ['', [
        Validators.required,
        Validators.pattern(/^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/), // lowercase only
        Validators.maxLength(254),
        this.sameAsWorkEmailValidator()   // Real-time check on the field itself
      ]],

      mobileNumber: ['', [
        Validators.required,
        Validators.pattern(/^(?!(\d)\1{9,14})\d{10,15}$/) // 10-15 digits, no repeated-digit numbers
      ]],

      birthday: ['', [
        Validators.required,
        this.ageValidator(18)
      ]]
    });

    // Support both flat structure (savedData.department) and
    // nested structure (savedData.step2.department) from UserService
    const step2 = savedData?.step2 || savedData;

    if (step2) {
      this.identityForm.patchValue({
        department:      step2.department      || '',
        personalEmailId: step2.personalEmailId || '',
        mobileNumber:    step2.mobileNumber    || '',
        birthday:        step2.birthday        || ''
      });
      this.uploadedImage    = step2.uploadedImage    || null;
      this.uploadedFileName = step2.uploadedFileName || '';
    }
  }

  // ---------------------------------------------------------------
  // Validator: personal email must NOT match the work email.
  // Runs on every keystroke so the user sees the error inline.
  // ---------------------------------------------------------------
  private sameAsWorkEmailValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value || !this.workEmail) return null;
      const personal = control.value.toLowerCase().trim();
      if (personal === this.workEmail) {
        return { sameAsWorkEmail: true };
      }
      return null;
    };
  }

  // ---------------------------------------------------------------
  // Validator: must be at least minAge years old, no future dates.
  // ---------------------------------------------------------------
  private ageValidator(minAge: number) {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const today     = new Date();
      const birthDate = new Date(control.value);

      if (birthDate > today) {
        return { futureDate: true };
      }

      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      if (age < minAge) {
        return { underage: true };
      }

      return null;
    };
  }

  triggerFileInput(): void {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) fileInput.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.uploadedFileName = file.name;

      const reader = new FileReader();
      reader.onload = e => {
        this.uploadedImage = e.target?.result || null;
      };
      reader.readAsDataURL(file);
    }
  }

  // Save current step 2 data before going back so it is
  // restored when the user returns to this step again.
  goBack(): void {
    const currentData = {
      ...this.identityForm.value,
      uploadedImage:    this.uploadedImage,
      uploadedFileName: this.uploadedFileName
    };
    this.dataService.saveStep2(currentData);
    console.log('Step 2 data saved on back navigation:', currentData);
    this.router.navigate(['/sign-up/step-1']);
  }

  moveForward(): void {
    if (this.identityForm.valid) {
      const formData = {
        ...this.identityForm.value,
        uploadedImage:    this.uploadedImage,
        uploadedFileName: this.uploadedFileName
      };
      this.dataService.saveStep2(formData);
      console.log('Step 2 data saved successfully:', formData);
      this.router.navigate(['/sign-up/step-3']);
    } else {
      this.identityForm.markAllAsTouched();
      this.alertService.warning(
        'Please fix the highlighted errors before proceeding.',
        'Validation Error'
      );
    }
  }
}
