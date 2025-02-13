import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardStateService, MetricType } from '../../services/dashboard-state.service';
import { MetricData } from '../../data/mock-metrics';
import { Subscription, combineLatest } from 'rxjs';

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
  progressPercentage: number = 0;
  private subscriptions = new Subscription();

  constructor(private dashboardState: DashboardStateService) {}

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
    
    // Get the current value based on device type
    this.currentValue = deviceType === 'total' 
      ? dayData.total 
      : deviceType === 'desktop' 
        ? dayData.desktop 
        : dayData.mobile;

    // Calculate progress percentage
    this.progressPercentage = (this.currentValue / this.metricData.monthlyTarget) * 100;
  }

  get metricLabel(): string {
    return this.metricType === 'users' ? 'Users' : 'Page Views';
  }
}
