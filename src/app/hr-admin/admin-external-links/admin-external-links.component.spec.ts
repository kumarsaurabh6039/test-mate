import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminExternalLinksComponent } from './admin-external-links.component';

describe('AdminExternalLinksComponent', () => {
  let component: AdminExternalLinksComponent;
  let fixture: ComponentFixture<AdminExternalLinksComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AdminExternalLinksComponent]
    });
    fixture = TestBed.createComponent(AdminExternalLinksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
