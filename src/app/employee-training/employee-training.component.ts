import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TrainingService, TrainingResponse } from '../services/training.service';

@Component({
  selector: 'app-employee-training',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './employee-training.component.html',
  styleUrls: ['./employee-training.component.css']
})
export class EmployeeTrainingComponent implements OnInit {
  private trainingService = inject(TrainingService);
  
  trainings: TrainingResponse[] = [];
  loading: boolean = true;
  activeTab: 'available' | 'my-trainings' = 'available';

  ngOnInit() {
    this.loadTrainings();
  }

  loadTrainings() {
    this.loading = true;
    // Fetching all trainings (ACTIVE status)
    this.trainingService.getTrainingsByStatus('ACTIVE').subscribe({
      next: (data) => {
        this.trainings = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load trainings', err);
        this.trainings = []; // Ensure empty list on error, no hardcoded data
        this.loading = false;
      }
    });
  }

  switchTab(tab: 'available' | 'my-trainings') {
    this.activeTab = tab;
  }

  startTraining(training: TrainingResponse) {
    // Ideally navigate to a course player or detail page
    console.log(`Starting training: ${training.title}`);
  }
}