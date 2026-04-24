import { Component } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OrganizationOnboardingService, OrganizationOnboardRequest } from '../services/organization-onboarding.service';
import { AlertService } from '../services/alert.service';

@Component({
  selector: 'app-company-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './company-onboarding.component.html',
  styleUrls: ['./company-onboarding.component.css']
})
export class CompanyOnboardingComponent {
  currentStep: number = 1;
  totalSteps: number = 5;

  // ── Industry Options ──────────────────────────────────────────────────────
  industryOptions: { value: string; label: string }[] = [
    { value: 'IT',            label: 'Technology / SaaS' },
    { value: 'Finance',       label: 'FinTech / Finance' },
    { value: 'Healthcare',    label: 'HealthTech / Healthcare' },
    { value: 'Retail',        label: 'E-Commerce / Retail' },
    { value: 'Consulting',    label: 'Consulting' },
    { value: 'EdTech',        label: 'EdTech / Education' },
    { value: 'Manufacturing', label: 'Manufacturing' },
    { value: 'RealEstate',    label: 'Real Estate' },
    { value: 'Logistics',     label: 'Logistics / Supply Chain' },
    { value: 'Media',         label: 'Media & Entertainment' },
    { value: 'Hospitality',   label: 'Hospitality & Travel' },
    { value: 'Telecom',       label: 'Telecom' },
    { value: 'Government',    label: 'Government / Public Sector' },
    { value: 'NGO',           label: 'Non-Profit / NGO' },
    { value: 'Automotive',    label: 'Automotive' },
    { value: 'Energy',        label: 'Energy & Utilities' },
  ];

  // ── Custom Industry State ─────────────────────────────────────────────────
  showCustomIndustry: boolean = false;
  customIndustryName: string = '';

  // ── Backend Validation Errors (field-level messages from API) ─────────────
  backendErrors: { [key: string]: string } = {};

  /**
   * Maps backend DTO field names → component error keys used in the template.
   * Add any new backend fields here to automatically show them inline.
   */
  private readonly backendFieldMap: { [key: string]: string } = {
    companyName:      'name',
    companyLogo:      'logo',
    industry:         'industry',
    companySize:      'companySize',
    website:          'website',
    corporateAddress: 'address',
    city:             'city',
    state:            'state',
    zipCode:          'zipCode',
    country:          'country',
    currency:         'currency',
    timezone:         'timezone',
    departments:      'dept',
    hrFullName:       'hrName',
    hrWorkEmail:      'hrEmail',
    hrContactNumber:  'hrPhone',
    hrDesignation:    'hrDesignation',
    hrJoiningDate:    'hrJoiningDate',
    hrAddress:        'hrAddress',
  };

  /** Which error keys belong to each step — used to navigate to the right step. */
  private readonly stepFieldGroups: { [step: number]: string[] } = {
    1: ['name', 'logo', 'industry', 'companySize', 'website'],
    2: ['address', 'city', 'state', 'zipCode', 'country', 'currency', 'timezone'],
    3: ['dept'],
    4: ['hrName', 'hrEmail', 'hrPhone', 'hrDesignation', 'hrJoiningDate', 'hrAddress'],
  };

  /**
   * Parses the backend errors object, stores messages in backendErrors,
   * then navigates to the earliest step that contains a field with an error.
   */
  private handleBackendErrors(apiErrors: { [key: string]: string }): void {
    this.backendErrors = {};

    for (const [field, message] of Object.entries(apiErrors)) {
      const key = this.backendFieldMap[field] ?? field;
      this.backendErrors[key] = message;
    }

    // Jump to the earliest step that has at least one backend error
    for (let step = 1; step <= 4; step++) {
      const hasError = this.stepFieldGroups[step].some(f => this.backendErrors[f]);
      if (hasError) {
        this.currentStep = step;
        break;
      }
    }
  }

  /** Call from template (input) / (change) events to clear a specific backend error. */
  clearBackendError(field: string): void {
    delete this.backendErrors[field];
  }

  /** Returns true if the current industry value is one of the preset options */
  isPresetIndustry(value: string): boolean {
    return this.industryOptions.some(opt => opt.value === value);
  }

  /** Called when user changes the select dropdown */
  onIndustryChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    if (select.value === '__custom__') {
      this.companyData.industry = '';
      this.customIndustryName   = '';
      this.showCustomIndustry   = true;
    }
  }

  /** Confirms and saves the custom industry name */
  confirmCustomIndustry(): void {
    const trimmed = this.customIndustryName.trim();
    if (!trimmed) {
      this.errors.industry = 'Please enter an industry name.';
      return;
    }
    this.companyData.industry = trimmed;
    this.showCustomIndustry   = false;
    this.errors.industry      = false;
    this.clearBackendError('industry');
  }

  /** Goes back to dropdown without saving the custom value */
  cancelCustomIndustry(): void {
    this.showCustomIndustry   = false;
    this.customIndustryName   = '';
    this.companyData.industry = '';
  }

  /** Lets the user re-edit a previously confirmed custom industry */
  editCustomIndustry(): void {
    this.customIndustryName   = this.companyData.industry;
    this.companyData.industry = '';
    this.showCustomIndustry   = true;
  }

  // ── Data Models ───────────────────────────────────────────────────────────
  companyData = {
    companyLogo: '',
    companyName: '',
    companySize: '1-10',
    industry: '',
    website: ''
  };

  logoFile: File | null = null;
  logoPreviewUrl: string | ArrayBuffer | null = null;

  headquartersData = {
    corporateAddress: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'India',
    currency: 'INR',
    timezone: '(GMT+05:30) IST'
  };

  departmentData: { name: string; headCount: number }[] = [];

  hrData = {
    fullName: '',
    email: '',
    phone: '',
    designation: '',
    joiningDate: new Date().toISOString().split('T')[0],
    address: ''
  };

  newDeptName: string = '';
  animating: boolean = false;
  isProcessing: boolean = false;
  errors: any = {};
  currentOrgCode: string = 'PENDING';

  constructor(
    private apiService: OrganizationOnboardingService,
    private router: Router,
    private alertService: AlertService,
    private location: Location
  ) {}

  // ── ACTIONS ───────────────────────────────────────────────────────────────

  processStep1(): void {
    let hasError = false;

    if (!this.companyData.companyName || this.companyData.companyName.trim() === '') {
      this.errors.name = true; hasError = true;
    }

    if (!this.companyData.industry || this.companyData.industry.trim() === '' || this.showCustomIndustry) {
      this.errors.industry = this.showCustomIndustry
        ? 'Please confirm your custom industry name first.'
        : 'Industry is required.';
      hasError = true;
    }

    if (!this.logoFile) {
      if (!this.errors.logo) {
        this.errors.logo = 'Please upload a company logo to continue';
      }
      hasError = true;
    }

    const websiteRegex = /^(https?:\/\/)/i;
    if (!this.companyData.website || this.companyData.website.trim() === '') {
      this.errors.website = 'Website is required.';
      hasError = true;
    } else if (!websiteRegex.test(this.companyData.website.trim())) {
      this.errors.website = 'Website must start with http:// or https:// (e.g., https://www.example.com).';
      hasError = true;
    } else {
      this.errors.website = null;
    }

    if (hasError) {
      this.alertService.warning('Please fill all required fields correctly.', 'Validation Error');
      return;
    }

    this.isProcessing = true;
    setTimeout(() => {
      this.isProcessing = false;
      this.goToNextStep();
    }, 600);
  }

  processStep2(): void {
    let hasError = false;

    if (!this.headquartersData.corporateAddress || this.headquartersData.corporateAddress.trim() === '') {
      this.errors.address = true; hasError = true;
    }
    if (!this.headquartersData.city || this.headquartersData.city.trim() === '') {
      this.errors.city = true; hasError = true;
    }
    if (!this.headquartersData.state || this.headquartersData.state.trim() === '') {
      this.errors.state = true; hasError = true;
    }
    if (!this.headquartersData.zipCode || this.headquartersData.zipCode.trim() === '') {
      this.errors.zipCode = true; hasError = true;
    }

    if (hasError) {
      this.alertService.warning('Please fill all headquarters address fields correctly.', 'Validation Error');
      return;
    }

    this.isProcessing = true;
    setTimeout(() => {
      this.isProcessing = false;
      this.goToNextStep();
    }, 600);
  }

  processStep3(): void {
    if (this.departmentData.length === 0) {
      this.errors.dept = 'Please add at least one department';
      this.alertService.warning('You must add at least one department to continue.', 'Validation Error');
      return;
    }
    this.errors.dept = null;

    this.isProcessing = true;
    setTimeout(() => {
      this.isProcessing = false;
      this.goToNextStep();
    }, 600);
  }

  processStep4(): void {
    let hasError = false;

    if (!this.hrData.fullName || this.hrData.fullName.trim() === '') {
      this.errors.hrName = true; hasError = true;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!this.hrData.email || !emailRegex.test(this.hrData.email)) {
      this.errors.hrEmail = true; hasError = true;
    }

    const phoneRegex = /^[0-9+\-\s]{10,15}$/;
    if (!this.hrData.phone || !phoneRegex.test(this.hrData.phone)) {
      this.errors.hrPhone = true; hasError = true;
    }

    if (!this.hrData.designation || this.hrData.designation.trim() === '') {
      this.errors.hrDesignation = true; hasError = true;
    }

    if (!this.hrData.joiningDate) {
       this.errors.hrJoiningDate = true; hasError = true;
    }

    if (!this.hrData.address || this.hrData.address.trim() === '') {
       this.errors.hrAddress = true; hasError = true;
    }

    if (hasError) {
      this.alertService.warning('Please fill all HR details correctly.', 'Validation Error');
      return;
    }

    this.isProcessing = true;

    const payload: OrganizationOnboardRequest = {
      companyName: this.companyData.companyName,
      companyLogo: this.logoFile as File,
      industry: this.companyData.industry,
      companySize: this.companyData.companySize,
      website: this.companyData.website,

      corporateAddress: this.headquartersData.corporateAddress,
      city: this.headquartersData.city,
      country: this.headquartersData.country,
      currency: this.headquartersData.currency,
      timezone: this.headquartersData.timezone,

      departments: this.departmentData.map(d => d.name),

      hrFullName: this.hrData.fullName,
      hrWorkEmail: this.hrData.email,
      hrContactNumber: this.hrData.phone,
      hrDesignation: this.hrData.designation,
      hrJoiningDate: this.hrData.joiningDate,
      hrAddress: this.hrData.address
    };

    this.apiService.onboardOrganization(payload).subscribe({
      next: (response: any) => {
        this.currentOrgCode = response.orgCode || 'SUCCESS';
        this.isProcessing   = false;
        this.alertService.success('Organization has been onboarded successfully!', 'Setup Complete');
        this.goToNextStep();
      },
      error: (err) => {
        console.error('Onboarding Failed', err);
        this.isProcessing = false;

        const apiErrors = err.error?.errors;

        if (apiErrors && typeof apiErrors === 'object' && Object.keys(apiErrors).length > 0) {
          // Map each backend field error to the correct input field and navigate to that step
          this.handleBackendErrors(apiErrors);
          this.alertService.warning('Please fix the highlighted fields and try again.', 'Validation Error');
        } else {
          // Generic error (network issue, server crash, etc.)
          const errorMsg = err.error?.message || 'Setup failed. Please check your inputs.';
          this.alertService.error(errorMsg, 'Onboarding Failed');
        }
      }
    });
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────

  goToNextStep(): void {
    if (this.currentStep < this.totalSteps) {
      this.animating = true;
      setTimeout(() => {
        this.currentStep++;
        this.animating = false;
      }, 300);
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.animating = true;
      setTimeout(() => {
        this.currentStep--;
        this.animating = false;
      }, 300);
    }
  }

  addDepartment(): void {
    const trimmedName = this.newDeptName.trim();
    if (trimmedName) {
      const exists = this.departmentData.some(
        d => d.name.toLowerCase() === trimmedName.toLowerCase()
      );

      if (exists) {
        this.errors.dept = 'Department already exists!';
        this.alertService.warning('This department already exists.', 'Duplicate Entry');
        return;
      }

      this.departmentData.push({ name: trimmedName, headCount: 0 });
      this.newDeptName = '';
      this.errors.dept = null;
      this.clearBackendError('dept');
    }
  }

  removeDepartment(index: number): void {
    this.departmentData.splice(index, 1);
    if (this.departmentData.length === 0) {
      this.errors.dept = 'Please add at least one department';
    }
  }

  onLogoUpload(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        this.errors.logo   = 'Only image files (PNG/JPG) are allowed.';
        this.logoFile      = null;
        this.companyData.companyLogo = '';
        this.logoPreviewUrl = null;
        this.alertService.error('Please upload a valid image file.', 'Invalid File Type');
        event.target.value = '';
        return;
      }

      const maxSizeInBytes = 5 * 1024 * 1024;
      if (file.size > maxSizeInBytes) {
        this.errors.logo   = 'Image size must be less than 5MB.';
        this.logoFile      = null;
        this.companyData.companyLogo = '';
        this.logoPreviewUrl = null;
        this.alertService.error('Image size must be less than 5MB.', 'File Too Large');
        event.target.value = '';
        return;
      }

      this.logoFile              = file;
      this.companyData.companyLogo = file.name;
      this.errors.logo           = null;
      this.clearBackendError('logo');

      const reader = new FileReader();
      reader.onload = (e) => {
        this.logoPreviewUrl = e.target?.result || null;
      };
      reader.readAsDataURL(file);

      this.alertService.info('Company logo selected successfully.');
    }
  }

  goBackToAdmin(): void {
    if (this.currentStep > 1) {
      // Still inside the wizard — go to the previous step
      this.prevStep();
    } else {
      // On step 1 — leave the wizard and return to wherever the user came from
      // (landing page, super-admin dashboard, etc.)
      this.location.back();
    }
  }

  goToDashboard(): void {
    this.router.navigate(['/super-admin-dashboard']);
  }
}