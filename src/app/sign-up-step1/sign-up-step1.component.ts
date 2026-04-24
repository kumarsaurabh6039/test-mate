import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { UserService } from '../services/user-service.service';

const NAME_PATTERN = /^[a-zA-Z .\-']+$/;
const NICK_PATTERN = /^[a-zA-Z0-9 .\-']*$/;

@Component({
  selector: 'app-sign-up-step1',
  templateUrl: './sign-up-step1.component.html',
  styleUrls: ['./sign-up-step1.component.css']
})
export class SignUpStep1Component implements OnInit {

  signUpForm: FormGroup;
  formSubmitAttempt = false;

  constructor(
    private router: Router,
    private dataService: UserService,
    private fb: FormBuilder
  ) {
    this.signUpForm = this.fb.group({
      // Backend: @NotBlank, @Size(1-100), @Pattern(letters only)
      surname: ['', [
        Validators.required,
        Validators.minLength(1),
        Validators.maxLength(100),
        Validators.pattern(NAME_PATTERN)
      ]],

      // Backend: @NotBlank, @Size(2-100), @Pattern(letters only)
      firstName: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(100),
        Validators.pattern(NAME_PATTERN)
      ]],

      // Backend: @Size(max=100), @Pattern(letters only, optional)
      middleName: ['', [
        Validators.maxLength(100),
        Validators.pattern(NAME_PATTERN)
      ]],

      // Backend: @Size(max=50), @Pattern(letters + digits, optional)
      nickName: ['', [
        Validators.maxLength(50),
        Validators.pattern(NICK_PATTERN)
      ]],

      // UI-only field (not part of OnboardRequest DTO)
      empId: ['', [Validators.required, Validators.minLength(3)]],

      // Backend: @NotBlank, @Pattern(Male|Female|Other)
      gender: ['', Validators.required],

      // Backend: @NotNull, @Min(18), @Max(100)
      age: ['', [
        Validators.required,
        Validators.min(18),
        Validators.max(100)
      ]]
    });
  }

  ngOnInit(): void {
    const savedData = this.dataService.getFormData();

    // Support both flat structure (savedData.surname) and
    // nested structure (savedData.step1.surname) from UserService
    const step1 = savedData?.step1 || savedData;

    let authEmpId = localStorage.getItem('empId');
    if (authEmpId === 'null' || authEmpId === 'undefined') {
      authEmpId = '';
    }

    this.signUpForm.patchValue({
      surname:    step1?.surname    || '',
      firstName:  step1?.firstName  || '',
      middleName: step1?.middleName || '',
      nickName:   step1?.nickName   || '',
      empId:      authEmpId || (step1?.empId !== 'null' ? step1?.empId : '') || '',
      gender:     step1?.gender || '',
      age:        step1?.age    || ''
    });
  }

  goBack(): void {
    this.router.navigate(['/onboarding']);
  }

  beginJourney(): void {
    this.formSubmitAttempt = true;
    this.signUpForm.markAllAsTouched();

    if (this.signUpForm.valid) {
      const formData = this.signUpForm.getRawValue();
      this.dataService.saveStep1(formData);
      localStorage.setItem('empId', formData.empId);
      console.log('Step 1 data saved successfully:', formData);
      this.router.navigate(['/sign-up/step-2']);
    } else {
      console.warn('Step 1 form is invalid. Please check all required fields.');
    }
  }
}
