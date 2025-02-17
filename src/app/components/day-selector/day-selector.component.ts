import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MomentDateAdapter, MAT_MOMENT_DATE_ADAPTER_OPTIONS } from '@angular/material-moment-adapter';
import { DashboardStateService } from '../../services/dashboard-state.service';
import * as moment from 'moment';

export const MY_DATE_FORMATS = {
  parse: {
    dateInput: 'DD-MM-YYYY',
  },
  display: {
    dateInput: 'DD-MM-YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

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
    MatFormFieldModule,
    MatInputModule
  ],
  providers: [
    {
      provide: DateAdapter,
      useClass: MomentDateAdapter,
      deps: [MAT_DATE_LOCALE]
    },
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
    { provide: MAT_MOMENT_DATE_ADAPTER_OPTIONS, useValue: { strict: true } }
  ],
  template: `
    <mat-form-field appearance="outline" class="date-picker-field">
      <input matInput
             [matDatepicker]="picker"
             [value]="selectedDate"
             (dateChange)="onDateChange($event)"
             [min]="minDate"
             [max]="maxDate"
             readonly>
      <mat-datepicker-toggle matIconSuffix [for]="picker">
        <mat-icon matDatepickerToggleIcon>calendar_today</mat-icon>
      </mat-datepicker-toggle>
      <mat-datepicker #picker
                      [dateClass]="dateClass">
      </mat-datepicker>
    </mat-form-field>
  `,
  styles: [`
    .date-picker-field {
      width: 160px;
      margin: 0;
    }

    ::ng-deep {
      .date-picker-field {
        .mat-mdc-form-field-flex {
          background-color: white;
          border-radius: 8px;
          height: 40px;
          padding: 0 12px !important;
        }

        .mat-mdc-form-field-infix {
          padding: 8px 0 !important;
          width: auto;
        }

        .mdc-notched-outline__leading,
        .mdc-notched-outline__trailing,
        .mdc-notched-outline__notch {
          border-color: hsl(240 5.9% 90%) !important;
        }

        .mat-mdc-form-field-icon-suffix {
          color: hsl(240 3.8% 46.1%);
          padding: 0;
        }

        .mat-mdc-form-field-subscript-wrapper {
          display: none;
        }

        .mat-mdc-text-field-wrapper {
          padding: 0;
        }

        .mat-mdc-form-field-icon-suffix {
          padding: 0;
          align-self: center;
        }
      }

      .mat-calendar {
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      }

      .mat-calendar-body-selected {
        background-color: var(--primary-color);
        border-radius: 4px;
      }

      .mat-calendar-body-today:not(.mat-calendar-body-selected),
      .mat-calendar-body-today {
        border: none !important;
      }

      .mat-calendar-body-cell:not(.mat-calendar-body-disabled):hover > 
      .mat-calendar-body-cell-content:not(.mat-calendar-body-selected) {
        background-color: rgba(0, 0, 0, 0.04);
      }

      .mat-calendar-body-cell-content {
        border-radius: 4px;
      }

      .mat-datepicker-toggle {
        color: hsl(240 3.8% 46.1%);
      }

      .mat-calendar-table-header,
      .mat-calendar-body-label {
        color: hsl(240 3.8% 46.1%);
      }
    }
  `]
})
export class DaySelectorComponent implements OnInit {
  selectedDate = moment.utc('2025-02-01');
  minDate = moment.utc('2025-02-01');
  maxDate = moment.utc('2025-02-28');
  
  constructor(private dashboardState: DashboardStateService) {}

  ngOnInit() {
    const currentDay = this.dashboardState.getCurrentSelectedDay();
    this.selectedDate = moment.utc(currentDay);
  }

  onDateChange(event: any): void {
    const selectedDate = event.value;
    this.selectedDate = selectedDate;
    const dateString = selectedDate.format('YYYY-MM-DD');
    this.dashboardState.setSelectedDay(dateString);
  }

  dateClass = (date: moment.Moment): string => {
    return '';
  }
} 