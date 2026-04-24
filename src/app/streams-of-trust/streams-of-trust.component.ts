import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { UserService } from '../services/user-service.service';
import { AlertService } from '../services/alert.service';

@Component({
  selector: 'app-streams-of-trust',
  templateUrl: './streams-of-trust.component.html',
  styleUrls: ['./streams-of-trust.component.css']
})
export class StreamsOfTrustComponent implements OnInit {

  trustData = {
    bankAccountNumber: '',
    bankName: '',
    ifscCode: '',
    bankingLocation: '',
    panNumber: '',
    uanNumber: ''
  };

  constructor(
    private router: Router,
    private mockDataService: UserService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    const savedData = this.mockDataService.getFormData();

    // Support both nested (savedData.step5) and flat (savedData.bankingDetails) structures
    const existing = savedData?.step5 || savedData?.bankingDetails;
    if (existing) {
      this.trustData.bankAccountNumber = existing.bankAccountNumber || existing.accountNumber || '';
      this.trustData.bankName          = existing.bankName          || '';
      this.trustData.ifscCode          = existing.ifscCode          || '';
      this.trustData.bankingLocation   = existing.bankingLocation   || '';
      this.trustData.panNumber         = existing.panNumber         || '';
      this.trustData.uanNumber         = existing.uanNumber         || '';
    }
  }

  // Save current form data before going back so it is
  // restored when the user returns to this step again.
  goBack(): void {
    const dataToSave = {
      bankAccountNumber: this.trustData.bankAccountNumber.trim(),
      bankName:          this.trustData.bankName.trim(),
      ifscCode:          this.trustData.ifscCode.trim().toUpperCase(),
      bankingLocation:   this.trustData.bankingLocation.trim(),
      panNumber:         this.trustData.panNumber.trim().toUpperCase(),
      uanNumber:         this.trustData.uanNumber ? this.trustData.uanNumber.trim() : ''
    };
    this.mockDataService.saveStep5(dataToSave);
    console.log('Step 5 data saved on back navigation:', dataToSave);
    this.router.navigate(['/sign-up/paper-boats']);
  }

  moveForward(form: NgForm): void {
    if (form.valid) {
      // Convert IFSC and PAN to uppercase before saving
      const finalData = {
        bankAccountNumber: this.trustData.bankAccountNumber.trim(),
        bankName:          this.trustData.bankName.trim(),
        ifscCode:          this.trustData.ifscCode.trim().toUpperCase(),
        bankingLocation:   this.trustData.bankingLocation.trim(),
        panNumber:         this.trustData.panNumber.trim().toUpperCase(),
        uanNumber:         this.trustData.uanNumber ? this.trustData.uanNumber.trim() : ''
      };

      this.mockDataService.saveStep5(finalData);
      console.log('Step 5 data saved successfully:', finalData);
      this.router.navigate(['/sign-up/your-constellation']);
    } else {
      // Mark all controls as touched to trigger inline validation display
      Object.keys(form.controls).forEach(key => {
        form.controls[key].markAsTouched();
      });
      this.alertService.warning('Please fix the validation errors before proceeding.', 'Invalid Details');
      console.warn('Step 5 form is invalid. Please review all required fields.');
    }
  }
}
