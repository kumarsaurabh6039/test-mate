import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminExitComponent } from './admin-exit.component';

describe('AdminExitComponent', () => {
  let component: AdminExitComponent;
  let fixture: ComponentFixture<AdminExitComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AdminExitComponent]
    });
    fixture = TestBed.createComponent(AdminExitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
