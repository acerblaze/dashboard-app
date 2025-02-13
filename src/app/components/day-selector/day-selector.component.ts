import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { DashboardStateService } from '../../services/dashboard-state.service';
import { mockMetricsData } from '../../data/mock-metrics';

@Component({
  selector: 'app-day-selector',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule
  ],
  templateUrl: './day-selector.component.html',
  styleUrl: './day-selector.component.scss'
})
export class DaySelectorComponent {
  availableDays: string[] = [];
  
  constructor(private dashboardState: DashboardStateService) {
    // Extract available days from mock data
    this.availableDays = mockMetricsData.users.dailyData.map(d => d.date);
  }

  get selectedDay(): string {
    return this.dashboardState.getCurrentSelectedDay();
  }

  onDayChange(day: string): void {
    this.dashboardState.setSelectedDay(day);
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }
} 