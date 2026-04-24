import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { Subscription, interval, of } from 'rxjs';
import { startWith, catchError } from 'rxjs/operators';
import { AlertService } from '../../services/alert.service';
import { EmployeeDTO, UserService } from 'src/app/services/user-service.service';

@Component({
  selector: 'app-admin-payroll',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './admin-payroll.component.html',
  styleUrls: ['./admin-payroll.component.css']
})
export class AdminPayrollComponent implements OnInit, OnDestroy {
  employees: EmployeeDTO[] = [];
  filteredEmployees: EmployeeDTO[] = [];
  isLoading = true;
  isSavingCtc = false;
  orgCode = 'DEFAULT';

  // Forms & Modal State
  ctcForm: FormGroup;
  showCtcModal = false;
  showRunModal = false;
  currentCtcId: number | null = null; 
  
  // Selection State
  selectedEmployee: EmployeeDTO | null = null;
  searchText = '';

  // Payroll Run State
  runMonth: number;
  runYear: number;
  months = [
    { value: 1, name: 'January' }, { value: 2, name: 'February' }, 
    { value: 3, name: 'March' }, { value: 4, name: 'April' },
    { value: 5, name: 'May' }, { value: 6, name: 'June' },
    { value: 7, name: 'July' }, { value: 8, name: 'August' },
    { value: 9, name: 'September' }, { value: 10, name: 'October' },
    { value: 11, name: 'November' }, { value: 12, name: 'December' }
  ];

  private subs = new Subscription();

  constructor(
    private fb: FormBuilder, 
    private userService: UserService, 
    private alert: AlertService
  ) {
    const today = new Date();
    this.runMonth = today.getMonth() + 1;
    this.runYear = today.getFullYear();

    this.ctcForm = this.fb.group({
      employeeId: ['', Validators.required],
      isMonthly: [true],
      basicSalary: [0, [Validators.required, Validators.min(0)]], 
      hra: [0, Validators.min(0)], 
      da: [0, Validators.min(0)],
      medicalAllowance: [0, Validators.min(0)],
      specialAllowance: [0, Validators.min(0)],
      otherAllowances: [0, Validators.min(0)],
      bonus: [0, Validators.min(0)],
      esop: [0, Validators.min(0)],
      gratuity: [0, Validators.min(0)],
      pf: [0, Validators.min(0)],
      insurances: [0, Validators.min(0)],
      incomeTax: [0, Validators.min(0)],
      professionalTax: [0, Validators.min(0)]
    });
  }

  ngOnInit() {
    this.userService.getOrgCode().subscribe(c => this.orgCode = c || 'DEFAULT');
    this.loadData();
    this.subs.add(this.userService.refresh$.subscribe(() => this.loadData()));
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  loadData() {
    this.userService.getAllEmployees().subscribe({
      next: (data) => {
        this.employees = data;
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  /**
   * Filter Logic: Admin Users component ki tarah enhanced search.
   * Search by: Name, ID, Dept, Email, Mobile.
   */
  applyFilters() {
    if (!this.searchText.trim()) {
      this.filteredEmployees = this.employees;
      return;
    }

    const term = this.searchText.toLowerCase();
    this.filteredEmployees = this.employees.filter(e => 
      e.firstName?.toLowerCase().includes(term) ||
      e.surname?.toLowerCase().includes(term) ||
      e.empId?.toLowerCase().includes(term) ||
      e.department?.toLowerCase().includes(term) ||
      e.personalEmailId?.toLowerCase().includes(term) ||
      (e as any).email?.toLowerCase().includes(term) ||
      (e as any).mobileNumber?.toLowerCase().includes(term) ||
      (e as any).phoneNumber?.toLowerCase().includes(term)
    );
  }

  openCtcModal(emp: EmployeeDTO) {
    this.selectedEmployee = emp;
    this.currentCtcId = null;
    this.isLoading = true;

    this.userService.getCtcByEmployeeId(emp.empId).pipe(
      catchError(() => of(null))
    ).subscribe(response => {
      this.isLoading = false;
      
      const data = response && response.ctcDetail ? response.ctcDetail : null;

      if (data) {
        this.currentCtcId = data.id;
        this.ctcForm.patchValue({
          employeeId: emp.empId,
          isMonthly: data.isMonthly ?? true,
          basicSalary: data.basicPay || 0,
          hra: data.hra || 0,
          da: data.da || 0,
          medicalAllowance: data.medicalAllowance || 0,
          specialAllowance: data.specialAllowances || 0,
          otherAllowances: data.otherEarnings || data.otherAllowances || 0,
          bonus: data.bonus || 0,
          esop: data.esop || 0,
          gratuity: data.gratuity || 0,
          pf: data.pf || 0,
          insurances: data.insurances || 0,
          incomeTax: data.tax || data.incomeTax || 0,
          professionalTax: data.professionalTax || 0
        });
      } else {
        this.ctcForm.reset({ 
          employeeId: emp.empId,
          isMonthly: true,
          basicSalary: 0, hra: 0, da: 0, medicalAllowance: 0, 
          specialAllowance: 0, otherAllowances: 0, bonus: 0, 
          esop: 0, gratuity: 0, pf: 0, insurances: 0, 
          incomeTax: 0, professionalTax: 0 
        });
      }
      this.showCtcModal = true;
    });
  }

  submitCtc() {
    if (this.ctcForm.invalid) return;
    this.isSavingCtc = true;
    
    const formVal = this.ctcForm.value;
    const payload = { 
      ...formVal, 
      orgCode: this.orgCode,
      basicSalary: formVal.basicSalary,
      specialAllowance: formVal.specialAllowance
    };
    
    const request = this.currentCtcId 
      ? this.userService.updateCtc(this.currentCtcId, payload)
      : this.userService.createCtc(payload);

    request.subscribe({
        next: () => { 
          this.isSavingCtc = false;
          this.showCtcModal = false; 
          this.alert.success(this.currentCtcId ? 'CTC Updated!' : 'CTC Created!'); 
        },
        error: () => {
          this.isSavingCtc = false;
          this.alert.error('Failed to process CTC structure');
        }
    });
  }

  openRunPayrollModal(emp: EmployeeDTO | null = null) {
    this.selectedEmployee = emp;
    this.showRunModal = true;
  }

  confirmRunPayroll() {
    if (this.selectedEmployee) {
      this.userService.runPayroll(this.selectedEmployee.empId, this.runMonth, this.runYear).subscribe({
        next: () => {
          this.showRunModal = false;
          this.alert.success(`Payroll processed for ${this.selectedEmployee?.firstName}`);
        },
        error: () => this.alert.error('Payroll Run Failed')
      });
    } else {
      this.userService.runPayrollAll(this.runMonth, this.runYear).subscribe({
        next: () => {
          this.showRunModal = false;
          this.alert.success('Bulk Payroll Initiated Successfully!');
        },
        error: () => this.alert.error('Bulk Run Failed')
      });
    }
  }
}