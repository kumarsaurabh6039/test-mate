import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../services/user-service.service';
import { AlertService } from '../services/alert.service';

interface FamilyMember {
  familyMemberName: string;
  age: number | null;
  gender: string;
  relationship: string;
}

interface CareData {
  emergencyName: string;
  emergencyContact: string;
  relationship: string;
  familyMembers: FamilyMember[];
}

@Component({
  selector: 'app-circle-of-care',
  templateUrl: './sign-up-step3.component.html',
  styleUrls: ['./sign-up-step3.component.css']
})
export class CircleOfCareComponent implements OnInit {
  careData: CareData = {
    emergencyName: '',
    emergencyContact: '',
    relationship: '',
    familyMembers: [
      { familyMemberName: '', age: null, gender: '', relationship: '' },
      { familyMemberName: '', age: null, gender: '', relationship: '' }
    ]
  };

  // Dropdown options
  relationshipOptions: string[] = ['Spouse', 'Sibling', 'Friend', 'Parent', 'Colleague'];
  genderOptions: string[] = ['Male', 'Female', 'Other'];
  familyRelationshipOptions: string[] = ['Mother', 'Father', 'Brother', 'Sister', 'Child', 'Other'];

  constructor(
    private router: Router,
    private dataService: UserService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    const savedData = this.dataService.getFormData();

    // Read from step3 or emergencyContact nested key to avoid "[object Object]" issues.
    // Also fall back to flat savedData in case UserService stores it at the top level.
    const step3Data = savedData?.step3 || savedData?.emergencyContact;

    if (step3Data) {
      this.careData.emergencyName    = step3Data.emergencyName    || '';
      this.careData.emergencyContact = step3Data.emergencyContact || '';
      this.careData.relationship     = step3Data.relationship     || '';

      // Restore family members if previously saved
      if (step3Data.familyMembers && step3Data.familyMembers.length > 0) {
        // Ensure we always have at least 2 slots (required + optional)
        const restored = step3Data.familyMembers;
        this.careData.familyMembers = [
          restored[0] || { familyMemberName: '', age: null, gender: '', relationship: '' },
          restored[1] || { familyMemberName: '', age: null, gender: '', relationship: '' }
        ];
      }
    }
  }

  // Save current step 3 data before going back so it is
  // restored when the user returns to this step again.
  goBack(): void {
    const dataToSave: CareData = {
      emergencyName:    this.careData.emergencyName,
      emergencyContact: this.careData.emergencyContact,
      relationship:     this.careData.relationship,
      familyMembers:    this.careData.familyMembers
    };
    this.dataService.saveStep3(dataToSave);
    console.log('Step 3 data saved on back navigation:', dataToSave);
    this.router.navigate(['/sign-up/step-2']);
  }

  moveForward(form: any): void {
    const emergencyValid =
      this.careData.emergencyName.trim()    !== '' &&
      this.careData.emergencyContact.trim() !== '' &&
      this.careData.relationship.trim()     !== '';

    const filledFamilyMembers = this.careData.familyMembers.filter(
      member => member.familyMemberName.trim() !== ''
    );

    const allMembersValid = filledFamilyMembers.every(member =>
      member.familyMemberName.trim() !== '' &&
      member.age !== null &&
      typeof member.age === 'number' &&
      !isNaN(member.age) &&
      member.gender.trim()       !== '' &&
      member.relationship.trim() !== ''
    );

    if (form.valid && emergencyValid && allMembersValid) {
      const dataToSave: CareData = {
        emergencyName:    this.careData.emergencyName.trim(),
        emergencyContact: this.careData.emergencyContact.trim(),
        relationship:     this.careData.relationship.trim(),
        familyMembers: filledFamilyMembers.map(member => ({
          familyMemberName: member.familyMemberName.trim(),
          age:              member.age,
          gender:           member.gender.trim(),
          relationship:     member.relationship.trim()
        }))
      };

      this.dataService.saveStep3(dataToSave);
      console.log('Step 3 data saved successfully:', dataToSave);
      this.router.navigate(['/sign-up/paper-boats']);
    } else {
      // Mark all controls as touched to trigger UI validation display
      Object.keys(form.controls).forEach(key => {
        form.controls[key].markAsTouched();
      });

      this.alertService.warning(
        'Please correct the highlighted errors in the form before proceeding.',
        'Validation Error'
      );
      console.warn('Step 3 form is invalid. Please review all required fields.');
    }
  }
}