import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminAssetsComponent } from './admin-assets.component';

describe('AdminAssetsComponent', () => {
  let component: AdminAssetsComponent;
  let fixture: ComponentFixture<AdminAssetsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AdminAssetsComponent]
    });
    fixture = TestBed.createComponent(AdminAssetsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
