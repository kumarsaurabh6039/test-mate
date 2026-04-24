import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms'; 
import { UserService } from '../user-service.service';
import { AlertService } from '../services/alert.service';
import { PoshComplaintRequest, PoshService } from '../services/posh.service';

@Component({
  selector: 'app-posh',
  standalone: true, 
  imports: [CommonModule, ReactiveFormsModule, FormsModule], 
  templateUrl: './posh.component.html',
  styleUrls: ['./posh.component.css']
})
export class PoshComponent implements OnInit {
  poshForm: FormGroup;
  isSubmitting: boolean = false;
  revealIdentity: boolean = true; 

  employeeName: string = '';
  employeeId: string = '';

  constructor(
    private fb: FormBuilder,
    private poshService: PoshService,
    private userService: UserService,
    private alertService: AlertService
  ) {
    this.poshForm = this.fb.group({
      accusedName: ['', Validators.required],
      incidentDate: ['', Validators.required],
      location: [''],
      // Note: If 50 characters feel too long during testing, you can change this to 10 or 20
      description: ['', [Validators.required, Validators.minLength(50)]],
      witnesses: ['']
    });
  }

  ngOnInit(): void {
    const storedName = localStorage.getItem('userName') || 'Employee';
    const storedId = localStorage.getItem('empId') || 'Unknown';
    
    this.employeeName = storedName;
    this.employeeId = storedId;
  }

  onSubmit(): void {
    // FIX 1: Show an alert if the form is invalid to prevent silent failures
    if (this.poshForm.invalid) {
      this.poshForm.markAllAsTouched();
      this.alertService.error('Please fill all the required (*) fields properly. Description must be at least 50 characters long.', 'Validation Error');
      return;
    }

    this.isSubmitting = true;
    const formVal = this.poshForm.value;

    let finalDescription = formVal.description;
    if (!this.revealIdentity) {
      finalDescription = `[ANONYMOUS SUBMISSION] \n\n${finalDescription}`;
    }

    // FIX 2: Mapped the payload keys back to "respondentName" and "incidentDescription"
    // because the backend strictly expects these exact names.
    const payload: PoshComplaintRequest = {
      respondentName: formVal.accusedName,       
      incidentDate: formVal.incidentDate,
      incidentDescription: finalDescription,     
      location: formVal.location,
      witnesses: formVal.witnesses,
      isAnonymous: !this.revealIdentity,
      empId: this.revealIdentity ? this.employeeId : null, 
      complainantName: this.revealIdentity ? this.employeeName : 'Anonymous'
    };

    console.log("Submitting Payload: ", payload); // Print payload for debugging

    this.poshService.fileComplaint(payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.alertService.success('Your complaint has been successfully submitted.', 'Complaint Submitted');
        this.poshForm.reset();
        this.revealIdentity = true; 
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('POSH Submission Error Details:', err);
        
        // FIX 3: Handling various error message formats sent by the backend
        const errorMsg = err.error?.message || err.error?.error || err.message || 'Failed to file the complaint. Please try again later.';
        
        this.alertService.error(errorMsg, 'Submission Failed');
      }
    });
  }
}