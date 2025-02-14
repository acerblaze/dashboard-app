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
  size: WidgetSize;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardStateService {
  private readonly deviceTypeSubject = new BehaviorSubject<DeviceType>('total');
  readonly deviceType$ = this.deviceTypeSubject.asObservable();

  private readonly selectedDaySubject = new BehaviorSubject<string>('2025-02-28');
  readonly selectedDay$ = this.selectedDaySubject.asObservable();

  private readonly widgetsSubject = new BehaviorSubject<WidgetConfig[]>([]);
  readonly widgets$ = this.widgetsSubject.asObservable();

  // Store metric data
  private readonly metricsData = mockMetricsData;

  // Derived observables for specific widget states
  readonly smallWidgets$ = this.widgets$.pipe(
    map(widgets => widgets.filter(w => w.size === 'small'))
  );

  readonly largeWidgets$ = this.widgets$.pipe(
    map(widgets => widgets.filter(w => w.size === 'large'))
  );

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

  addWidget(type: MetricType, initialSize: WidgetSize = 'small'): number {
    const newId = this.nextWidgetId++;
    const widgets = this.widgetsSubject.value;
    widgets.push({
      id: newId,
      type,
      size: initialSize
    });
    this.widgetsSubject.next(widgets);
    return newId;
  }

  updateWidgetSize(widgetId: number, size: WidgetSize): void {
    const widgets = this.widgetsSubject.value;
    const widget = widgets.find(w => w.id === widgetId);
    if (widget) {
      widget.size = size;
      this.widgetsSubject.next([...widgets]);
    }
  }

  updateWidgetsOrder(widgets: WidgetConfig[]): void {
    // Validate that we're not losing any widgets
    if (widgets.length !== this.widgetsSubject.value.length) {
      console.error('Invalid widget order update: widget count mismatch');
      return;
    }
    this.widgetsSubject.next([...widgets]);
  }

  getWidgets(): WidgetConfig[] {
    return [...this.widgetsSubject.value];
  }

  getWidget(id: number): WidgetConfig | undefined {
    return this.widgetsSubject.value.find(w => w.id === id);
  }

  removeWidget(id: number): void {
    const widgets = this.widgetsSubject.value;
    const index = widgets.findIndex(w => w.id === id);
    if (index !== -1) {
      widgets.splice(index, 1);
      this.widgetsSubject.next([...widgets]);
    }
  }

  updateWidgetType(widgetId: number, type: MetricType): void {
    const widgets = this.widgetsSubject.value;
    const widget = widgets.find(w => w.id === widgetId);
    if (widget) {
      widget.type = type;
      this.widgetsSubject.next([...widgets]);
    }
  }
}
