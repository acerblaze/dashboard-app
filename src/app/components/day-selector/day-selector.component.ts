import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardStateService } from '../../services/dashboard-state.service';
import { mockMetricsData } from '../../data/mock-metrics';

@Component({
  selector: 'app-day-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="day-selector" (click)="$event.stopPropagation()">
      <div class="selected-day" (click)="toggleDropdown()">
        {{ formatDate(selectedDay) }}
        <span class="arrow" [class.open]="isDropdownOpen">▼</span>
      </div>
      <div class="dropdown" *ngIf="isDropdownOpen">
        <div 
          *ngFor="let day of availableDays" 
          class="dropdown-item"
          [class.selected]="day === selectedDay"
          (click)="onDayChange(day)">
          {{ formatDate(day) }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .day-selector {
      position: relative;
      min-width: 150px;
      user-select: none;
    }

    .selected-day {
      padding: 8px 12px;
      border: 1px solid #ccc;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: white;
    }

    .arrow {
      font-size: 0.8em;
      transition: transform 0.2s ease;
    }

    .arrow.open {
      transform: rotate(180deg);
    }

    .dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      margin-top: 4px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      max-height: 200px;
      overflow-y: auto;
      z-index: 1000;
      animation: dropdownFade 0.2s ease;
    }

    .dropdown-item {
      padding: 8px 12px;
      cursor: pointer;
    }

    .dropdown-item:hover {
      background: #f5f5f5;
    }

    .dropdown-item.selected {
      background: #e0e0e0;
    }

    @keyframes dropdownFade {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class DaySelectorComponent {
  isDropdownOpen = false;
  availableDays: string[] = [];
  
  constructor(private dashboardState: DashboardStateService) {
    // Extract available days from mock data
    this.availableDays = mockMetricsData.users.dailyData.map(d => d.date);
  }

  get selectedDay(): string {
    return this.dashboardState.getCurrentSelectedDay();
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  onDayChange(day: string): void {
    this.dashboardState.setSelectedDay(day);
    this.isDropdownOpen = false;
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.isDropdownOpen = false;
  }
} 