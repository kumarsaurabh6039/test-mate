import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminTimesheetComponent } from './admin-timesheet.component';

describe('AdminTimesheetComponent', () => {
  let component: AdminTimesheetComponent;
  let fixture: ComponentFixture<AdminTimesheetComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AdminTimesheetComponent]
    });
    fixture = TestBed.createComponent(AdminTimesheetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
