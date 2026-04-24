import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

declare var html2pdf: any;

@Component({
  selector: 'app-generate-payslip',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './generate-payslip.component.html',
  styleUrls: ['./generate-payslip.component.css']
})
export class GeneratePayslipComponent {
  @Output() close = new EventEmitter<void>();
  
  isGenerating = false;

  // Default Data (All Hardcoded data removed, starting fresh)
  data = {
    companyName: '',
    companyAddress: '',
    companyLogo: '', // Base64 string
    
    empName: '',
    empId: '',
    designation: '',
    department: '',
    payPeriod: '',
    payDate: '', 
    
    // Earnings initialized to empty/0
    basic: null as unknown as number,
    hra: null as unknown as number,
    conveyance: null as unknown as number,
    medical: null as unknown as number,
    special: null as unknown as number,
    bonus: null as unknown as number,
    
    // Deductions initialized to empty/0
    pf: null as unknown as number,
    tax: null as unknown as number,
    insurance: null as unknown as number,
    otherDeductions: null as unknown as number
  };

  // Calculated Fields
  grossPay = 0;
  totalDeductions = 0;
  netPay = 0;
  amountInWords = '';

  constructor() {
    this.calculateTotals();
  }

  // Auto-calculate whenever values change with robust fallback to 0
  calculateTotals() {
    const basic = Number(this.data.basic) || 0;
    const hra = Number(this.data.hra) || 0;
    const conveyance = Number(this.data.conveyance) || 0;
    const medical = Number(this.data.medical) || 0;
    const special = Number(this.data.special) || 0;
    const bonus = Number(this.data.bonus) || 0;

    const pf = Number(this.data.pf) || 0;
    const tax = Number(this.data.tax) || 0;
    const insurance = Number(this.data.insurance) || 0;
    const otherDeductions = Number(this.data.otherDeductions) || 0;

    const earnings = basic + hra + conveyance + medical + special + bonus;
    const deductions = pf + tax + insurance + otherDeductions;

    this.grossPay = earnings;
    this.totalDeductions = deductions;
    this.netPay = earnings - deductions;
    this.amountInWords = this.convertNumberToWords(this.netPay);
  }

  onLogoSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.data.companyLogo = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  closeModal() {
    this.close.emit();
  }

  downloadPDF() {
    const element = document.getElementById('printable-preview');
    if (!element) return;

    this.isGenerating = true;

    // FIX FOR BLANK PDF:
    // Create a temporary clone of the element to remove CSS transforms (scaling)
    // html2pdf struggles with 'transform: scale', so we print a non-scaled clone.
    const clone = element.cloneNode(true) as HTMLElement;

    // Reset styles on the clone so it renders flat and clean
    clone.style.transform = 'none';
    clone.style.margin = '0';
    clone.style.boxShadow = 'none';
    
    // Use a temporary container off-screen
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '-9999px';
    container.style.left = '0';
    container.style.width = '210mm'; // Ensure fixed A4 width
    container.appendChild(clone);
    document.body.appendChild(container);

    const fileName = this.data.empName 
      ? `Payslip_${this.data.empName.replace(/\s+/g, '_')}.pdf` 
      : 'Payslip_Employee.pdf';

    const opt = {
      margin: 0, 
      filename: fileName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        scrollY: 0 // Force top-start capture
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(clone).save().then(() => {
      this.isGenerating = false;
      document.body.removeChild(container); // Clean up the clone
    }).catch((err: any) => {
      console.error('PDF Error:', err);
      this.isGenerating = false;
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    });
  }

  convertNumberToWords(amount: number): string {
    if (amount === 0) return 'Zero Only';
    return `Rupees ${amount.toLocaleString('en-IN')} Only`; 
  }
}