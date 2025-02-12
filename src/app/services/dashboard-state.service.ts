import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

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
  private deviceTypeSubject = new BehaviorSubject<DeviceType>('total');
  deviceType$ = this.deviceTypeSubject.asObservable();

  private widgetsSubject = new BehaviorSubject<WidgetConfig[]>([]);
  widgets$ = this.widgetsSubject.asObservable();

  private nextWidgetId = 1;

  constructor() {}

  setDeviceType(type: DeviceType): void {
    this.deviceTypeSubject.next(type);
  }

  getCurrentDeviceType(): DeviceType {
    return this.deviceTypeSubject.value;
  }

  addWidget(type: MetricType): void {
    const widgets = this.widgetsSubject.value;
    widgets.push({
      id: this.nextWidgetId++,
      type,
      size: 'small'
    });
    this.widgetsSubject.next(widgets);
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
    this.widgetsSubject.next([...widgets]);
  }

  getWidgets(): WidgetConfig[] {
    return this.widgetsSubject.value;
  }
}
