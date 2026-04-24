import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../services/user-service.service';

@Component({
  selector: 'app-onboarding-complete',
  templateUrl: './onboarding-complete.component.html',
  styleUrls: ['./onboarding-complete.component.css']
})
export class OnboardingCompleteComponent implements OnInit {
  userName: string = '';

  constructor(private router: Router, private signupService: UserService) {}

  ngOnInit() {
    // Form data se user ka naam nikal rahe hain
    const data = this.signupService.getData();
    const personal = data?.personalDetails || data?.step1 || {};
    
    const firstName = personal.firstName || '';
    const surname = personal.surname || '';
    
    // Agar naam available hai toh set karein, warna default 'User' dikhayein
    this.userName = firstName ? `${firstName} ${surname}`.trim() : 'User';
  }

  enterLouvaHR() {
    console.log('Session clear karke login par bhej rahe hain...');
    
    // Session, token aur saved form data clear karna (Logout)
    this.signupService.clearAuthToken();
    this.signupService.clearFormData();
    
    // Sign-in page par redirect karna aur browser history ko replace karna 
    // taaki back button dabane par waapas is page par na aa sake
    this.router.navigate(['/sign-in'], { replaceUrl: true }); 
  }
}