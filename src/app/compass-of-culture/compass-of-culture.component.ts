import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl, Validators, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UserService } from 'src/app/services/user-service.service';
import { AlertService } from 'src/app/services/alert.service';
import { PolicyService } from 'src/app/services/policy.service';

@Component({
  selector: 'app-compass-of-culture',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './compass-of-culture.component.html',
  styleUrls: ['./compass-of-culture.component.css']
})
export class CompassOfCultureComponent implements OnInit {

  private router        = inject(Router);
  private userService   = inject(UserService);
  private alertService  = inject(AlertService);
  private policyService = inject(PolicyService);

  agreementForm!: FormGroup;
  hasReadPolicy: boolean = false;

  // Policy text loaded dynamically from the server
  policyContent: string = 'Loading organization policy... Please wait.';

  ngOnInit(): void {
    // Agreement checkbox stays disabled until user scrolls to the bottom
    this.agreementForm = new FormGroup({
      agree: new FormControl({ value: false, disabled: true }, Validators.requiredTrue)
    });

    this.fetchLivePolicy();
  }

  goBack(): void {
    this.router.navigate(['/sign-up/your-constellation']);
  }

  // Fetch the live policy document from the server using the org code
  fetchLivePolicy(): void {
    const formData = this.userService.getFormData();
    const orgCode  = formData?.orgCode || localStorage.getItem('orgCode') || 'LVA-GLOBAL';

    console.log('Fetching policy for org code:', orgCode);

    this.policyService.getPolicyByOrgCode(orgCode).subscribe({
      next: (data: any) => {
        if (data) {
          if (data.policySummary) {
            this.policyContent = data.policySummary;
          } else if (data['culture_policy']) {
            this.policyContent = data['culture_policy'];
          } else {
            this.policyContent = 'Organization policy content is empty.';
          }

          // If the content is short enough that no scrolling is needed,
          // enable the checkbox automatically
          this.checkIfScrollRequired();
        }
      },
      error: (err) => {
        console.error('Failed to fetch policy:', err);
        this.policyContent = 'Failed to load policy. Please check your connection.';
      }
    });
  }

  // If the textarea does not overflow (no scrolling needed), enable the checkbox right away
  private checkIfScrollRequired(): void {
    setTimeout(() => {
      const el = document.querySelector('.policy-textarea') as HTMLTextAreaElement;
      if (el && el.scrollHeight <= el.clientHeight + 5) {
        this.hasReadPolicy = true;
        this.agreementForm.get('agree')?.enable();
      }
    }, 500);
  }

  // Enable the checkbox once the user has scrolled to the bottom of the policy text
  onScrollPolicy(event: any): void {
    if (this.hasReadPolicy) return;

    const el            = event.target;
    const currentScroll = Math.ceil(el.scrollTop + el.clientHeight);
    const totalHeight   = el.scrollHeight;

    if (currentScroll >= totalHeight - 10) {
      this.hasReadPolicy = true;
      this.agreementForm.get('agree')?.enable();
      this.alertService.info('You have reached the end. You can now accept the values.', 'Read Complete');
    }
  }

  // Submit the final onboarding after the user agrees to the culture policy
  completeOnboarding(): void {
    if (!this.hasReadPolicy) {
      this.alertService.warning('Please scroll to the bottom to proceed.', 'Read Required');
      return;
    }

    if (this.agreementForm.valid) {
      this.userService.setAgreedToCulture(true);

      this.userService.submitFinalOnboarding().subscribe({
        next: () => {
          this.alertService.success('Submission successful!', 'Congratulations');
          this.router.navigate(['/onboarding-complete']);
        },
        error: (err) => {
          this.alertService.error('Submission failed: ' + (err.error?.message || 'Unexpected error. Please try again.'));
        }
      });
    }
  }
}