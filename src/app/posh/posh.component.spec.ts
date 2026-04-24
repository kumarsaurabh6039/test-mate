import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PoshComponent } from './posh.component';

describe('PoshComponent', () => {
  let component: PoshComponent;
  let fixture: ComponentFixture<PoshComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PoshComponent]
    });
    fixture = TestBed.createComponent(PoshComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
