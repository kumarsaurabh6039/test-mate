import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PolicyService, PolicySummary } from 'src/app/services/policy.service';
import { AlertService } from 'src/app/services/alert.service';

@Component({
  selector: 'app-admin-policy',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-policy.component.html',
  styleUrls: ['./admin-policy.component.css']
})
export class AdminPolicyComponent implements OnInit {

  // Signal to track edit mode
  isEditingPolicy = signal(false);

  // Dependency Injection
  private policyService = inject(PolicyService);
  private alert = inject(AlertService);

  // Policy State
  currentPolicy: PolicySummary = {};
  isSavingPolicy = false;

  ngOnInit() {
    this.loadPolicy();
  }

  /**
   * Fetches the policy summary from backend
   */
  loadPolicy() {
    this.policyService.getPolicySummary().subscribe({
      next: (res: any) => {
        console.log('Policy API Response:', res);

        if (res && res.policySummary) {
          if (typeof res.policySummary === 'string') {
            this.currentPolicy = { 'culture_policy': res.policySummary };
          } else if (typeof res.policySummary === 'object') {
            this.currentPolicy = res.policySummary;
          }
        } else {
          this.currentPolicy = res || {};
        }
      },
      error: (err) => {
        console.error('Policy fetch failed:', err);
        this.currentPolicy = {};
      }
    });
  }

  enablePolicyEdit() {
    this.isEditingPolicy.set(true);
  }

  cancelPolicyEdit() {
    this.isEditingPolicy.set(false);
    this.loadPolicy();
  }

  /**
   * Saves the updated policy. Wraps data in the expected DTO structure.
   */
  savePolicy() {
    const policyText = this.currentPolicy['culture_policy'];

    if (!policyText || !policyText.trim()) {
      this.alert.warning('Policy content cannot be empty.');
      return;
    }

    this.isSavingPolicy = true;

    // Backend expects a 'policySummary' field
    const payload = {
      policySummary: policyText
    };

    this.policyService.updatePolicy(payload).subscribe({
      next: () => {
        this.alert.success('Organization Policy updated successfully!');
        this.isSavingPolicy = false;
        this.isEditingPolicy.set(false);
        this.loadPolicy();
      },
      error: (err) => {
        console.error('Policy save error:', err);
        const errorMsg = err.error?.message || 'Server Validation Failed';
        this.alert.error('Failed to update policy: ' + errorMsg);
        this.isSavingPolicy = false;
      }
    });
  }
}