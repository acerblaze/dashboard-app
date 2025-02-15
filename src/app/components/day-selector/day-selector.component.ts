import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { DashboardStateService } from '../../services/dashboard-state.service';
import { mockMetricsData } from '../../data/mock-metrics';

@Component({
  selector: 'app-day-selector',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule
  ],
  template: `
    <div class="date-picker-container">
      <button type="button" class="date-picker-button" (click)="picker.open()">
        <span class="date-display">{{ displayDate }}</span>
        <mat-icon>calendar_today</mat-icon>
      </button>
      <mat-form-field appearance="outline" class="custom-datepicker">
        <input matInput [matDatepicker]="picker"
               [value]="selectedDate"
               (dateChange)="onDateChange($event)"
               [min]="minDate"
               [max]="maxDate"
               readonly>
        <mat-datepicker #picker></mat-datepicker>
      </mat-form-field>
    </div>
  `,
  styles: [`
    .date-picker-container {
      position: relative;
    }

    .date-picker-button {
      all: unset;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border: 1px solid hsl(240 5.9% 90%);
      border-radius: 0.5rem;
      background: white;
      color: hsl(240 10% 3.9%);
      font-weight: 500;
      font-size: 0.875rem;
      line-height: 1.25rem;
      height: 40px;
      transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
      min-width: 160px;
      box-sizing: border-box;

      &:hover {
        background: hsl(0 0% 98%);
        border-color: hsl(240 5.9% 90%);
      }

      &:focus-visible {
        outline: none;
        border-color: hsl(240 5.9% 90%);
        box-shadow: 0 0 0 2px hsl(240 5% 96%);
      }

      .mat-icon {
        color: hsl(240 3.8% 46.1%);
        margin-left: auto;
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    .custom-datepicker {
      width: 0;
      height: 0;
      visibility: hidden;
      position: absolute;
    }

    ::ng-deep {
      .mat-calendar {
        background: white;
        border-radius: 0.75rem;
        border: 1px solid hsl(240 5.9% 90%);
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        overflow: hidden;
      }

      .mat-calendar-header {
        padding: 16px;
        background: white;
        border-bottom: 1px solid hsl(240 5.9% 90%);
      }

      .mat-calendar-content {
        padding: 16px;
      }

      .mat-calendar-body-selected {
        background-color: var(--primary-color);
        border-radius: 6px;
      }

      .mat-calendar-body-cell:not(.mat-calendar-body-disabled):hover > .mat-calendar-body-cell-content:not(.mat-calendar-body-selected) {
        background-color: hsl(240 5.9% 96%);
        border-radius: 6px;
      }

      .mat-calendar-body-today:not(.mat-calendar-body-selected) {
        border-color: var(--primary-color);
      }

      .mat-calendar-arrow {
        fill: hsl(240 3.8% 46.1%);
      }

      .mat-calendar-body-cell-content {
        border-radius: 6px;
      }

      .mat-calendar-body-disabled > .mat-calendar-body-cell-content:not(.mat-calendar-body-selected) {
        color: hsl(240 3.8% 46.1%);
      }
    }
  `]
})
export class DaySelectorComponent implements OnInit {
  selectedDate: Date = new Date('2025-02-01');
  minDate: Date;
  maxDate: Date;
  displayDate: string = '';
  
  constructor(private dashboardState: DashboardStateService) {
    // Set min and max dates to February 2025
    this.minDate = new Date('2025-02-01');
    this.maxDate = new Date('2025-02-28');
  }

  ngOnInit() {
    const currentDay = this.dashboardState.getCurrentSelectedDay();
    this.selectedDate = new Date(currentDay);
    this.updateDisplayDate();
  }

  onDateChange(event: any): void {
    const selectedDate = event.value;
    this.selectedDate = selectedDate;
    const dateString = selectedDate.toISOString().split('T')[0];
    this.dashboardState.setSelectedDay(dateString);
    this.updateDisplayDate();
  }

  private updateDisplayDate(): void {
    this.displayDate = this.selectedDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }
} 