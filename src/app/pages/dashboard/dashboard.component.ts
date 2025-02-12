import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { DeviceFilterComponent } from '../../components/device-filter/device-filter.component';
import { MetricWidgetComponent } from '../../components/metric-widget/metric-widget.component';
import { DashboardStateService, WidgetConfig } from '../../services/dashboard-state.service';
import { mockMetricsData } from '../../data/mock-metrics';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DeviceFilterComponent, MetricWidgetComponent, DragDropModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  widgets: WidgetConfig[] = [];
  metricsData = mockMetricsData;

  constructor(private dashboardState: DashboardStateService) {}

  ngOnInit() {
    // Initialize widgets from state service
    this.widgets = this.dashboardState.getWidgets();
    
    // Subscribe to widget changes
    this.dashboardState.widgets$.subscribe(widgets => {
      this.widgets = widgets;
    });
  }

  addWidget(): void {
    // Alternate between users and pageViews for demonstration
    const type = this.widgets.length % 2 === 0 ? 'users' : 'pageViews';
    this.dashboardState.addWidget(type);
  }

  onDrop(event: CdkDragDrop<WidgetConfig[]>) {
    moveItemInArray(this.widgets, event.previousIndex, event.currentIndex);
    this.dashboardState.updateWidgetsOrder(this.widgets);
  }
}
