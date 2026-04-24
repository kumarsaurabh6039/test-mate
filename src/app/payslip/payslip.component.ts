import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { UserService } from '../user-service.service'; 
import { PayslipService, PaySlip, OrganizationDetails } from '../services/payslip.service'; 
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// html2pdf library ko globally declare kiya gaya hai
declare var html2pdf: any;

@Component({
  selector: 'app-payslip',
  templateUrl: './payslip.component.html',
  styleUrls: ['./payslip.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class PayslipComponent implements OnInit, OnDestroy {
  isLoading: boolean = true;
  isGeneratingPdf: boolean = false; 
  isLoadingModalData: boolean = false;
  
  allPayslips: PaySlip[] = [];
  filteredPayslips: PaySlip[] = [];
  searchText: string = '';
  
  selectedPayslip: PaySlip | null = null;
  selectedOrg: OrganizationDetails | null = null; 
  showModal: boolean = false;
  logoBase64: string | null = null; 

  visibleNetPayPeriods: Set<string> = new Set();
  employeeName: string = '';
  
  private dataSubscription?: Subscription;

  constructor(
    private userService: UserService,
    private payslipService: PayslipService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadEmployeeInfo();
    this.loadPayslips();
  }

  ngOnDestroy(): void {
    this.dataSubscription?.unsubscribe();
  }

  loadEmployeeInfo(): void {
    const empId = this.userService.getEmpIdFromToken();
    if(empId) {
      this.userService.getEmployeeDashboardData().subscribe({
        next: (data) => {
             const info = data?.employeeInfo;
             if(info) this.employeeName = `${info.firstName} ${info.surname}`.trim();
        }
      });
    }
  }

  loadPayslips(): void {
    this.isLoading = true;
    const empId = this.userService.getEmpIdFromToken();
    if (!empId) {
        this.isLoading = false;
        return;
    }

    this.dataSubscription = this.payslipService.getPayslipsByEmployeeId(empId).subscribe({
      next: (data: PaySlip[]) => {
        this.allPayslips = (data || []).sort((a, b) => (b.payPeriod || '').localeCompare(a.payPeriod || ''));
        this.filteredPayslips = [...this.allPayslips];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }
  
  filterPayslips(): void {
      if (!this.searchText) {
          this.filteredPayslips = [...this.allPayslips];
          return;
      }
      const searchLower = this.searchText.toLowerCase();
      this.filteredPayslips = this.allPayslips.filter(slip => {
         const period = slip.payPeriod || '';
         return this.getMonthName(period).toLowerCase().includes(searchLower) || this.getYear(period).toString().includes(searchLower);
      });
  }

  toggleNetPay(payPeriod: string, event: Event): void {
    event.stopPropagation();
    if (this.visibleNetPayPeriods.has(payPeriod)) this.visibleNetPayPeriods.delete(payPeriod);
    else this.visibleNetPayPeriods.add(payPeriod);
  }

  isNetPayVisible(payPeriod: string): boolean {
    return this.visibleNetPayPeriods.has(payPeriod);
  }

  /**
   * PDF ke liye logo ko Base64 mein convert karna zaroori hai.
   * Fetch API ka use kar rahe hain kyunki ye CORS issues ko zyada behtar handle karta hai.
   */
  private async getBase64ImageFromURL(url: string): Promise<string | null> {
    try {
      const response = await fetch(url, { mode: 'cors' });
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = (err) => {
          console.error("FileReader error:", err);
          resolve(null);
        };
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.warn("Fetch conversion failed. Logo might be blocked by CORS policy of the image server.", err);
      return null;
    }
  }

  viewPayslip(slip: PaySlip): void {
      this.isLoadingModalData = true;
      this.logoBase64 = null; 
      
      this.payslipService.getPayslipByIdWithDetails(slip.id).subscribe({
        next: async (res) => {
          this.selectedPayslip = res.paySlip;
          this.selectedOrg = res.organization;
          
          this.showModal = true;
          this.cdr.detectChanges();

          // Modal dikhne ke baad background mein logo convert karo
          if (this.selectedOrg?.companyLogo) {
              const b64 = await this.getBase64ImageFromURL(this.selectedOrg.companyLogo);
              if (b64) {
                  this.logoBase64 = b64;
                  this.cdr.detectChanges();
              }
          }

          this.isLoadingModalData = false;
          document.body.style.overflow = 'hidden';
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isLoadingModalData = false;
          this.selectedPayslip = slip;
          this.showModal = true;
          this.cdr.detectChanges();
        }
      });
  }

  closeModal(): void {
      this.showModal = false;
      this.selectedPayslip = null;
      this.selectedOrg = null;
      this.logoBase64 = null;
      document.body.style.overflow = 'auto';
  }

  async downloadPayslip() {
      const element = document.getElementById('printable-payslip');
      if (!element) return;

      this.isGeneratingPdf = true;
      this.cdr.detectChanges();

      // Ensure karte hain ki base64 logo render ho gaya ho
      await new Promise(resolve => setTimeout(resolve, 800));

      const fileName = `Payslip_${this.selectedPayslip?.payPeriod || 'Generated'}.pdf`;

      // FIXED: margin ko 0 kiya gaya hai taaki extra spacing se content right side se cut na ho.
      const opt = {
          margin: 0, 
          filename: fileName,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { 
              scale: 2, // Quality aur performance ke liye optimal
              useCORS: true, 
              allowTaint: false, 
              logging: false,
              letterRendering: true,
              scrollY: 0 // Scroll ki wajah se jo issue aata hai usko fix karta hai
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      try {
          await html2pdf().set(opt).from(element).save();
      } catch (error) {
          console.error("PDF Generation Error:", error);
      } finally {
          this.isGeneratingPdf = false;
          this.cdr.detectChanges();
      }
  }

  getMonthName(payPeriod: string | undefined | null): string {
      if (!payPeriod) return 'Unknown';
      const parts = payPeriod.split('-');
      if (parts.length === 2) {
          const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
          return date.toLocaleString('default', { month: 'long' });
      }
      return payPeriod;
  }

  getYear(payPeriod: string | undefined | null): number | string {
      return payPeriod?.split('-')[0] || '';
  }

  getAmountInWords(amount: number): string {
    if (!amount) return 'Zero Only';
    return `Rupees ${Math.floor(amount).toLocaleString('en-IN')} Only`; 
  }
}