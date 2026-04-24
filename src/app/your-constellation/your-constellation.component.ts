import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../services/user-service.service';

@Component({
  selector: 'app-your-constellation',
  templateUrl: './your-constellation.component.html',
  styleUrls: ['./your-constellation.component.css']
})
export class YourConstellationComponent {

  constructor(private router: Router, private mockDataService: UserService) {}

  goBack(): void {
    this.router.navigate(['/sign-up/streams-of-trust']);
  }

  sayHello(): void {
    this.mockDataService.setConstellationAccepted(true);
    console.log('User chose to say hello (Your Constellation).');
    this.router.navigate(['/sign-up/compass-of-culture']);
  }

  skipHello(): void {
    this.mockDataService.setConstellationAccepted(false);
    console.log('User chose to skip hello (Your Constellation).');
    this.router.navigate(['/sign-up/compass-of-culture']);
  }
}
