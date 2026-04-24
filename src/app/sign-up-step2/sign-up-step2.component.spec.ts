import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { IdentityStreamComponent } from './sign-up-step2.component';
import { UserService } from '../services/user-service.service';
import { AlertService } from '../services/alert.service';

describe('IdentityStreamComponent', () => {
  let component: IdentityStreamComponent;
  let fixture: ComponentFixture<IdentityStreamComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [IdentityStreamComponent],
      imports: [ReactiveFormsModule, RouterTestingModule],
      providers: [
        { provide: UserService, useValue: { getFormData: () => null, saveStep2: () => {} } },
        { provide: AlertService, useValue: { warning: () => {} } }
      ]
    });
    fixture = TestBed.createComponent(IdentityStreamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});