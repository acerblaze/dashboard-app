import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardStateService, MetricType } from '../../services/dashboard-state.service';
import { MetricData } from '../../data/mock-metrics';

@Component({
  selector: 'app-metric-widget',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './metric-widget.component.html',
  styleUrl: './metric-widget.component.scss'
})
export class MetricWidgetComponent implements OnInit {
  @Input() metricType!: MetricType;
  @Input() metricData!: MetricData;
  @Input() id!: number;

  currentValue: number = 0;
  progressPercentage: number = 0;

  constructor(private dashboardState: DashboardStateService) {}

  ngOnInit() {
    this.calculateMetrics();
    // Subscribe to device type changes
    this.dashboardState.deviceType$.subscribe(() => {
      this.calculateMetrics();
    });
  }

  private calculateMetrics(): void {
    const deviceType = this.dashboardState.getCurrentDeviceType();
    const latestData = this.metricData.dailyData[this.metricData.dailyData.length - 1];
    
    // Get the current value based on device type
    this.currentValue = deviceType === 'total' 
      ? latestData.total 
      : deviceType === 'desktop' 
        ? latestData.desktop 
        : latestData.mobile;

    // Calculate progress percentage
    this.progressPercentage = (this.currentValue / this.metricData.monthlyTarget) * 100;
  }

  get metricLabel(): string {
    return this.metricType === 'users' ? 'Users' : 'Page Views';
  }
}
