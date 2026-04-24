import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminPoshComponent } from './admin-posh.component';

describe('AdminPoshComponent', () => {
  let component: AdminPoshComponent;
  let fixture: ComponentFixture<AdminPoshComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AdminPoshComponent]
    });
    fixture = TestBed.createComponent(AdminPoshComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
