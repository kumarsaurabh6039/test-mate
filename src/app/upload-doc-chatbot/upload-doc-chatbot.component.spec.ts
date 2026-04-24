import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UploadDocChatbotComponent } from './upload-doc-chatbot.component';

describe('UploadDocChatbotComponent', () => {
  let component: UploadDocChatbotComponent;
  let fixture: ComponentFixture<UploadDocChatbotComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [UploadDocChatbotComponent]
    });
    fixture = TestBed.createComponent(UploadDocChatbotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
