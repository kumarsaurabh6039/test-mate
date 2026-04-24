import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ContactSalesRequest, ContactSalesService } from '../services/sales.service';

interface PricingPlan {
  name: string;
  badge?: string;
  description: string;
  basePrice: number;
  perEmployeePrice: number;
  features: string[];
  notIncluded?: string[];
  isPopular: boolean;
  ctaText: string;
  ctaAction: string; // Used to determine routing vs opening modal
  isCustomPrice?: boolean; // Used for rendering 'Custom' text
  isFixedYearly?: boolean; // Added for Enterprise fixed display
  highlightColor?: string;
}

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './pricing.component.html',
  styleUrls: ['./pricing.component.css']
})
export class PricingComponent {
  isNavScrolled: boolean = false;
  isMobileMenuOpen: boolean = false;

  // Pricing State
  employeeCount: number = 10; // Set default slider value
  isAnnual: boolean = true; 

  // Sales Modal State Variables
  showSalesModal: boolean = false;
  isMessageSent: boolean = false;
  isSubmitting: boolean = false;
  salesForm = { name: '', email: '', company: '', phoneNumber: '', message: '' };

  constructor(private contactSalesService: ContactSalesService) {}

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isNavScrolled = window.scrollY > 10;
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    if (this.isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }

  plans: PricingPlan[] = [
    {
      name: 'Free Trial',
      description: 'One week free access. Explore all features without commitment.',
      basePrice: 0,
      perEmployeePrice: 0,
      features: ['Core HR Directory', 'Leave Management', 'Basic Payroll', '7 Days Full Access'],
      notIncluded: ['Custom Reports', 'Asset Management'],
      isPopular: false,
      ctaText: 'Start Free Trial',
      ctaAction: '/company-onboarding',
      isCustomPrice: false,
      isFixedYearly: false
    },
    {
      name: 'Essential',
      badge: 'Best Value',
      description: 'Full controls for growing teams. Perfect for scaling businesses.',
      basePrice: 0,
      perEmployeePrice: 99,
      features: ['Everything in Free', 'Advanced Analytics', 'Priority Support'],
      isPopular: true,
      ctaText: 'Contact Sales',
      ctaAction: 'contact_sales',
      isCustomPrice: false,
      isFixedYearly: false,
      highlightColor: 'var(--blue-600)'
    },
    {
      name: 'Enterprise',
      description: 'Unlimited users for 1 year. Custom security and control.',
      basePrice: 72000,
      perEmployeePrice: 0,
      features: ['Everything in Essential', 'Self Hosting', 'Unlimited Employees', 'Dedicated Account Manager', 'SSO & Custom Security', 'SLA Guarantees'],
      isPopular: false,
      ctaText: 'Contact Sales',
      ctaAction: 'contact_sales',
      isCustomPrice: false,
      isFixedYearly: true,
      highlightColor: 'var(--indigo-600)'
    }
  ];

  updateEmployeeCount(event: any) {
    this.employeeCount = parseInt(event.target.value, 10);
  }

  toggleBilling() {
    this.isAnnual = !this.isAnnual;
  }

  getOriginalMonthlyTotal(plan: PricingPlan): number {
    return plan.basePrice + (this.employeeCount * plan.perEmployeePrice);
  }

  getDiscountedMonthlyTotal(plan: PricingPlan): number {
    const original = this.getOriginalMonthlyTotal(plan);
    
    if (this.isAnnual && !plan.isCustomPrice && plan.name !== 'Free Trial') {
      return original * 0.8; // 20% discount for annual billing
    }
    return original;
  }

  getYearlyBillAmount(plan: PricingPlan): number {
    return this.getDiscountedMonthlyTotal(plan) * 12;
  }

  // Calculate the old price for UI strike-through display
  getOldPriceDisplay(plan: PricingPlan): number {
    if (plan.name === 'Enterprise') {
      return 100000; // Old flat price
    } else if (plan.name === 'Essential') {
      return this.employeeCount * 500; // Rs 500 per user calculation
    }
    return 0;
  }

  // --- Sales Modal Logic ---
  openSalesModal() {
    this.showSalesModal = true;
    this.isMessageSent = false;
    this.isSubmitting = false;
    document.body.style.overflow = 'hidden';
  }

  closeSalesModal() {
    this.showSalesModal = false;
    document.body.style.overflow = 'auto';
  }

  submitSalesForm() {
    if(!this.salesForm.name || !this.salesForm.email || !this.salesForm.message) return;

    this.isSubmitting = true;

    // Prepare payload matching the Swagger schema
    const payload: ContactSalesRequest = {
      fullName: this.salesForm.name,
      workEmail: this.salesForm.email,
      companyName: this.salesForm.company,
      phoneNumber: this.salesForm.phoneNumber,
      message: this.salesForm.message
    };

    // Call API via Service
    this.contactSalesService.submitInquiry(payload).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        this.isMessageSent = true;
        
        setTimeout(() => {
          this.closeSalesModal();
          this.salesForm = { name: '', email: '', company: '', phoneNumber: '', message: '' };
        }, 3000);
      },
      error: (error) => {
        this.isSubmitting = false;
        console.error('Error submitting sales inquiry:', error);
        alert('Failed to send message. Please try again later.');
      }
    });
  }
}