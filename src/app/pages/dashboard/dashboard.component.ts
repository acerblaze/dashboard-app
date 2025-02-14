import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { DeviceFilterComponent } from '../../components/device-filter/device-filter.component';
import { MetricWidgetComponent } from '../../components/metric-widget/metric-widget.component';
import { ExpandedMetricWidgetComponent } from '../../components/expanded-metric-widget/expanded-metric-widget.component';
import { DashboardStateService, WidgetConfig, MetricType } from '../../services/dashboard-state.service';
import { mockMetricsData } from '../../data/mock-metrics';
import { DaySelectorComponent } from '../../components/day-selector/day-selector.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    DeviceFilterComponent, 
    MetricWidgetComponent, 
    ExpandedMetricWidgetComponent,
    DragDropModule,
    DaySelectorComponent,
    MatButtonModule,
    MatIconModule,
    MatMenuModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  regularWidgets: WidgetConfig[] = [];
  expandedWidgets: WidgetConfig[] = [];
  metricsData = mockMetricsData;
  isDropdownOpen = false;

  constructor(private dashboardState: DashboardStateService) {}

  ngOnInit() {
    // Initialize widgets from state service
    this.regularWidgets = this.dashboardState.getRegularWidgets();
    this.expandedWidgets = this.dashboardState.getExpandedWidgets();
    
    // Subscribe to widget changes
    this.dashboardState.regularWidgets$.subscribe(widgets => {
      this.regularWidgets = widgets;
    });

    this.dashboardState.expandedWidgets$.subscribe(widgets => {
      this.expandedWidgets = widgets;
    });
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const dropdown = document.querySelector('.add-widget-dropdown');
    if (dropdown && !dropdown.contains(event.target as Node)) {
      this.isDropdownOpen = false;
    }
  }

  addRegularWidget(type: MetricType): void {
    this.dashboardState.addRegularWidget(type);
    this.isDropdownOpen = false;
  }

  addExpandedWidget(type: MetricType): void {
    this.dashboardState.addExpandedWidget(type);
    this.isDropdownOpen = false;
  }

  onRegularWidgetDrop(event: CdkDragDrop<WidgetConfig[]>) {
    moveItemInArray(this.regularWidgets, event.previousIndex, event.currentIndex);
    this.dashboardState.updateRegularWidgetsOrder(this.regularWidgets);
  }

  onExpandedWidgetDrop(event: CdkDragDrop<WidgetConfig[]>) {
    moveItemInArray(this.expandedWidgets, event.previousIndex, event.currentIndex);
    this.dashboardState.updateExpandedWidgetsOrder(this.expandedWidgets);
  }
}
