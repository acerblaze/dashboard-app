import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardStateService, MetricType } from '../../services/dashboard-state.service';
import { MetricData } from '../../data/mock-metrics';
import { Subscription, combineLatest } from 'rxjs';
import { NumberAnimationService } from '../../services/number-animation.service';

@Component({
  selector: 'app-metric-widget',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './metric-widget.component.html',
  styleUrl: './metric-widget.component.scss'
})
export class MetricWidgetComponent implements OnInit, OnDestroy {
  @Input() metricType!: MetricType;
  @Input() metricData!: MetricData;
  @Input() id!: number;

  currentValue: number = 0;
  displayValue: number = 0;
  cumulativeValue: number = 0;
  displayCumulativeValue: number = 0;
  progressPercentage: number = 0;
  private subscriptions = new Subscription();
  private lastCurrentValue: number = 0;
  private lastCumulativeValue: number = 0;

  constructor(
    private dashboardState: DashboardStateService,
    private numberAnimation: NumberAnimationService
  ) {}

  ngOnInit() {
    // Subscribe to both device type and selected day changes
    this.subscriptions.add(
      combineLatest([
        this.dashboardState.deviceType$,
        this.dashboardState.selectedDay$
      ]).subscribe(() => {
        this.calculateMetrics();
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  private calculateMetrics(): void {
    const deviceType = this.dashboardState.getCurrentDeviceType();
    const selectedDay = this.dashboardState.getCurrentSelectedDay();
    
    // Find the data for the selected day
    const dayData = this.metricData.dailyData.find(d => d.date === selectedDay);
    
    if (!dayData) {
      console.warn(`No data found for day: ${selectedDay}`);
      return;
    }
    
    // Get the current day's value based on device type
    const newCurrentValue = deviceType === 'total' 
      ? dayData.total 
      : deviceType === 'desktop' 
        ? dayData.desktop 
        : dayData.mobile;

    // Calculate cumulative value up to and including selected day
    const newCumulativeValue = this.metricData.dailyData
      .filter(d => d.date <= selectedDay)
      .reduce((sum, day) => {
        const dayValue = deviceType === 'total'
          ? day.total
          : deviceType === 'desktop'
            ? day.desktop
            : day.mobile;
        return sum + dayValue;
      }, 0);

    // Animate the current value
    this.numberAnimation.animateValue(
      this.lastCurrentValue,
      newCurrentValue,
      (value) => this.displayValue = value
    );

    // Animate the cumulative value
    this.numberAnimation.animateValue(
      this.lastCumulativeValue,
      newCumulativeValue,
      (value) => this.displayCumulativeValue = value
    );

    // Update the stored values
    this.currentValue = newCurrentValue;
    this.cumulativeValue = newCumulativeValue;
    this.lastCurrentValue = newCurrentValue;
    this.lastCumulativeValue = newCumulativeValue;

    // Calculate progress percentage based on cumulative value
    this.progressPercentage = (this.cumulativeValue / this.metricData.monthlyTarget) * 100;
  }

  get metricLabel(): string {
    return this.metricType === 'users' ? 'Users' : 'Page Views';
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US').format(Math.round(value));
  }
}
