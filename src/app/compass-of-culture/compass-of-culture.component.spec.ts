import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompassOfCultureComponent } from './compass-of-culture.component';

describe('CompassOfCultureComponent', () => {
  let component: CompassOfCultureComponent;
  let fixture: ComponentFixture<CompassOfCultureComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CompassOfCultureComponent]
    });
    fixture = TestBed.createComponent(CompassOfCultureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
