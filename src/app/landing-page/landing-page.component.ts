import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GeneratePayslipComponent } from '../generate-payslip/generate-payslip.component';
import { ContactSalesRequest, ContactSalesService } from '../services/sales.service';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, GeneratePayslipComponent],
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.css']
})
export class LandingPageComponent {
  isNavScrolled: boolean = false;
  showPayslipGenerator: boolean = false;
  isMobileMenuOpen: boolean = false;

  // --- Sales Modal State Variables ---
  showSalesModal: boolean = false;
  isMessageSent: boolean = false;
  isSubmitting: boolean = false; // Added to track API call state
  salesForm = { name: '', email: '', company: '', phoneNumber: '', message: '' };

  // --- Feature Modal State Variable ---
  activeFeatureModal: 'attendance' | 'leave' | 'assets' | null = null;

  // --- Video Modal State Variable ---
  showVideoModal: boolean = false;

  constructor(private contactSalesService: ContactSalesService) {}

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isNavScrolled = window.scrollY > 10;
  }

  togglePayslipGenerator(state: boolean) {
    this.showPayslipGenerator = state;
    this.toggleBodyScroll(state);
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    this.toggleBodyScroll(this.isMobileMenuOpen);
  }

  // --- Video Modal Logic ---
  openVideoModal() {
    this.showVideoModal = true;
    this.toggleBodyScroll(true);
  }

  closeVideoModal() {
    this.showVideoModal = false;
    this.toggleBodyScroll(false);
  }

  // --- Feature Modal Logic ---
  openFeatureModal(feature: 'attendance' | 'leave' | 'assets', event: Event) {
    event.preventDefault(); // Prevent default anchor link behavior
    this.activeFeatureModal = feature;
    this.toggleBodyScroll(true);
  }

  closeFeatureModal() {
    this.activeFeatureModal = null;
    this.toggleBodyScroll(false);
  }

  // --- Sales Modal Logic ---
  openSalesModal() {
    this.showSalesModal = true;
    this.isMessageSent = false;
    this.isSubmitting = false;
    this.toggleBodyScroll(true);
  }

  closeSalesModal() {
    this.showSalesModal = false;
    this.toggleBodyScroll(false);
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
        
        // Auto-close modal after success
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

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Helper function to manage body scroll
  private toggleBodyScroll(disable: boolean) {
    if (disable) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }
}