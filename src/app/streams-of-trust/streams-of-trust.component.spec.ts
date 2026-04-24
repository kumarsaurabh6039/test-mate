import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StreamsOfTrustComponent } from './streams-of-trust.component';

describe('StreamsOfTrustComponent', () => {
  let component: StreamsOfTrustComponent;
  let fixture: ComponentFixture<StreamsOfTrustComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [StreamsOfTrustComponent]
    });
    fixture = TestBed.createComponent(StreamsOfTrustComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
