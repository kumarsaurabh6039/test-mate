import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmployeeTrainingComponent } from './employee-training.component';

describe('EmployeeTrainingComponent', () => {
  let component: EmployeeTrainingComponent;
  let fixture: ComponentFixture<EmployeeTrainingComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EmployeeTrainingComponent]
    });
    fixture = TestBed.createComponent(EmployeeTrainingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
