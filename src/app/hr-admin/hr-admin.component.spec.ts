/// <reference types="jasmine" />
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HrAdminComponent } from './hr-admin.component';

describe('HrAdminComponent', () => {
  let component: HrAdminComponent;
  let fixture: ComponentFixture<HrAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HrAdminComponent] // HrAdminComponent is a standalone component, so it goes in imports
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HrAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});