import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatbotPolicyComponent } from './chatbot-policy.component';

describe('ChatbotPolicyComponent', () => {
  let component: ChatbotPolicyComponent;
  let fixture: ComponentFixture<ChatbotPolicyComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ChatbotPolicyComponent]
    });
    fixture = TestBed.createComponent(ChatbotPolicyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
