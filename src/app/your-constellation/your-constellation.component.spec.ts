import { ComponentFixture, TestBed } from '@angular/core/testing';

import { YourConstellationComponent } from './your-constellation.component';

describe('YourConstellationComponent', () => {
  let component: YourConstellationComponent;
  let fixture: ComponentFixture<YourConstellationComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [YourConstellationComponent]
    });
    fixture = TestBed.createComponent(YourConstellationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
