import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardAssetsComponent } from './dashboard-assets.component';

describe('DashboardAssetsComponent', () => {
  let component: DashboardAssetsComponent;
  let fixture: ComponentFixture<DashboardAssetsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DashboardAssetsComponent]
    });
    fixture = TestBed.createComponent(DashboardAssetsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
