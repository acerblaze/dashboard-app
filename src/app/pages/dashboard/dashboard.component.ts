import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeviceFilterComponent } from '../../components/device-filter/device-filter.component';
import { MetricWidgetComponent } from '../../components/metric-widget/metric-widget.component';
import { DashboardStateService } from '../../services/dashboard-state.service';
import { mockMetricsData } from '../../data/mock-metrics';

interface WidgetConfig {
  id: number;
  type: 'users' | 'pageViews';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DeviceFilterComponent, MetricWidgetComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  widgets: WidgetConfig[] = [];
  metricsData = mockMetricsData;
  private nextWidgetId = 1;

  constructor(private dashboardState: DashboardStateService) {}

  addWidget(): void {
    // Alternate between users and pageViews for demonstration
    const type = this.widgets.length % 2 === 0 ? 'users' : 'pageViews';
    
    this.widgets.push({
      id: this.nextWidgetId++,
      type
    });
  }
}
