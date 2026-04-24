import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminDocumentTypesComponent } from './admin-document-types.component';

describe('AdminDocumentTypesComponent', () => {
  let component: AdminDocumentTypesComponent;
  let fixture: ComponentFixture<AdminDocumentTypesComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AdminDocumentTypesComponent]
    });
    fixture = TestBed.createComponent(AdminDocumentTypesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
