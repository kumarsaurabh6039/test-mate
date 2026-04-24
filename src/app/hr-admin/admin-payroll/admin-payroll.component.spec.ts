import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminPayrollComponent } from './admin-payroll.component';

describe('AdminPayrollComponent', () => {
  let component: AdminPayrollComponent;
  let fixture: ComponentFixture<AdminPayrollComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AdminPayrollComponent]
    });
    fixture = TestBed.createComponent(AdminPayrollComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
