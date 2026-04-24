import { Component, OnInit } from '@angular/core';
import { Router, NavigationExtras } from '@angular/router';
import { Location } from '@angular/common';

@Component({
  selector: 'app-onboarding',
  templateUrl: './onboarding.component.html',
  styleUrls: ['./onboarding.component.css']
})
export class OnboardingComponent implements OnInit {

  // Stores the route to navigate back to when the back button is clicked.
  // Defaults to '/dashboard' if no origin is passed via router state.
  private originRoute: string = '/dashboard';

  constructor(
    private router: Router,
    private location: Location
  ) {}

  ngOnInit(): void {
    // Read the 'from' route passed via router navigation state.
    // Example: this.router.navigate(['/onboarding'], { state: { from: '/manager-dashboard' } });
    const nav = this.router.getCurrentNavigation();
    const state = nav?.extras?.state as { from?: string } | undefined;

    if (state?.from) {
      this.originRoute = state.from;
    } else {
      // Fallback: check browser history state if navigation object is not available
      // (e.g., when the page is accessed directly or refreshed)
      const historyState = this.location.getState() as { from?: string } | null;
      if (historyState?.from) {
        this.originRoute = historyState.from;
      }
    }
  }

  // Navigates back to whichever dashboard the user came from.
  goBack(): void {
    this.router.navigate([this.originRoute]);
  }

  // Starts the onboarding flow by navigating to step 1.
  startOnboarding(): void {
    this.router.navigate(['/sign-up/step-1']);
  }
}