import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaperBoatsComponent } from './paper-boats.component';

describe('PaperBoatsComponent', () => {
  let component: PaperBoatsComponent;
  let fixture: ComponentFixture<PaperBoatsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PaperBoatsComponent]
    });
    fixture = TestBed.createComponent(PaperBoatsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
