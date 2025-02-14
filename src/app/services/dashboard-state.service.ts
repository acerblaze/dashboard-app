import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { mockMetricsData } from '../data/mock-metrics';
import { MetricData } from '../data/mock-metrics';

export type DeviceType = 'total' | 'desktop' | 'mobile';
export type MetricType = 'users' | 'pageViews';
export type WidgetSize = 'small' | 'large';

export interface WidgetConfig {
  id: number;
  type: MetricType;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardStateService {
  private readonly deviceTypeSubject = new BehaviorSubject<DeviceType>('total');
  readonly deviceType$ = this.deviceTypeSubject.asObservable();

  private readonly selectedDaySubject = new BehaviorSubject<string>('2025-02-28');
  readonly selectedDay$ = this.selectedDaySubject.asObservable();

  private readonly regularWidgetsSubject = new BehaviorSubject<WidgetConfig[]>([]);
  readonly regularWidgets$ = this.regularWidgetsSubject.asObservable();

  private readonly expandedWidgetsSubject = new BehaviorSubject<WidgetConfig[]>([]);
  readonly expandedWidgets$ = this.expandedWidgetsSubject.asObservable();

  // Store metric data
  private readonly metricsData = mockMetricsData;

  private nextWidgetId = 1;

  constructor() {}

  setDeviceType(type: DeviceType): void {
    this.deviceTypeSubject.next(type);
  }

  getCurrentDeviceType(): DeviceType {
    return this.deviceTypeSubject.value;
  }

  setSelectedDay(date: string): void {
    this.selectedDaySubject.next(date);
  }

  getCurrentSelectedDay(): string {
    return this.selectedDaySubject.value;
  }

  getMetricData(type: MetricType): MetricData {
    return this.metricsData[type];
  }

  addRegularWidget(type: MetricType): number {
    const newId = this.nextWidgetId++;
    const widgets = this.regularWidgetsSubject.value;
    widgets.push({
      id: newId,
      type
    });
    this.regularWidgetsSubject.next(widgets);
    return newId;
  }

  addExpandedWidget(type: MetricType): number {
    const newId = this.nextWidgetId++;
    const widgets = this.expandedWidgetsSubject.value;
    widgets.push({
      id: newId,
      type
    });
    this.expandedWidgetsSubject.next(widgets);
    return newId;
  }

  updateRegularWidgetsOrder(widgets: WidgetConfig[]): void {
    if (widgets.length !== this.regularWidgetsSubject.value.length) {
      console.error('Invalid widget order update: widget count mismatch');
      return;
    }
    this.regularWidgetsSubject.next([...widgets]);
  }

  updateExpandedWidgetsOrder(widgets: WidgetConfig[]): void {
    if (widgets.length !== this.expandedWidgetsSubject.value.length) {
      console.error('Invalid widget order update: widget count mismatch');
      return;
    }
    this.expandedWidgetsSubject.next([...widgets]);
  }

  getRegularWidgets(): WidgetConfig[] {
    return [...this.regularWidgetsSubject.value];
  }

  getExpandedWidgets(): WidgetConfig[] {
    return [...this.expandedWidgetsSubject.value];
  }

  getWidget(id: number): WidgetConfig | undefined {
    return [...this.regularWidgetsSubject.value, ...this.expandedWidgetsSubject.value]
      .find(w => w.id === id);
  }

  removeRegularWidget(id: number): void {
    const widgets = this.regularWidgetsSubject.value;
    const index = widgets.findIndex(w => w.id === id);
    if (index !== -1) {
      widgets.splice(index, 1);
      this.regularWidgetsSubject.next([...widgets]);
    }
  }

  removeExpandedWidget(id: number): void {
    const widgets = this.expandedWidgetsSubject.value;
    const index = widgets.findIndex(w => w.id === id);
    if (index !== -1) {
      widgets.splice(index, 1);
      this.expandedWidgetsSubject.next([...widgets]);
    }
  }

  updateWidgetType(widgetId: number, type: MetricType): void {
    // Check in regular widgets first
    const regularWidgets = this.regularWidgetsSubject.value;
    const regularWidget = regularWidgets.find(w => w.id === widgetId);
    if (regularWidget) {
      regularWidget.type = type;
      this.regularWidgetsSubject.next([...regularWidgets]);
      return;
    }

    // If not found in regular widgets, check expanded widgets
    const expandedWidgets = this.expandedWidgetsSubject.value;
    const expandedWidget = expandedWidgets.find(w => w.id === widgetId);
    if (expandedWidget) {
      expandedWidget.type = type;
      this.expandedWidgetsSubject.next([...expandedWidgets]);
    }
  }

  toggleWidgetSize(widgetId: number): void {
    // Check if it's a regular widget
    const regularWidgets = this.regularWidgetsSubject.value;
    const regularWidget = regularWidgets.find(w => w.id === widgetId);
    if (regularWidget) {
      // Move from regular to expanded
      this.removeRegularWidget(widgetId);
      this.addExpandedWidget(regularWidget.type);
      return;
    }

    // Check if it's an expanded widget
    const expandedWidgets = this.expandedWidgetsSubject.value;
    const expandedWidget = expandedWidgets.find(w => w.id === widgetId);
    if (expandedWidget) {
      // Move from expanded to regular
      this.removeExpandedWidget(widgetId);
      this.addRegularWidget(expandedWidget.type);
    }
  }
}
