import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardSwipedataComponent } from './dashboard-swipedata.component';

describe('DashboardSwipedataComponent', () => {
  let component: DashboardSwipedataComponent;
  let fixture: ComponentFixture<DashboardSwipedataComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DashboardSwipedataComponent]
    });
    fixture = TestBed.createComponent(DashboardSwipedataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
