import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { mockMetricsData } from '../data/mock-metrics';
import { MetricData } from '../data/mock-metrics';

export type DeviceType = 'total' | 'desktop' | 'mobile';
export type MetricType = 'users' | 'pageViews';
export type WidgetSize = 'small' | 'large';

export interface WidgetConfig {
  id: number;
  type: MetricType;
}

// Enhanced type definitions
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface DashboardState {
  deviceType: DeviceType;
  selectedDay: string;
  regularWidgets: WidgetConfig[];
  expandedWidgets: WidgetConfig[];
}

@Injectable({
  providedIn: 'root'
})
export class DashboardStateService {
  private readonly deviceTypeSubject = new BehaviorSubject<DeviceType>('total');
  readonly deviceType$ = this.deviceTypeSubject.pipe(distinctUntilChanged());

  private readonly selectedDaySubject = new BehaviorSubject<string>('2025-02-28');
  readonly selectedDay$ = this.selectedDaySubject.pipe(distinctUntilChanged());

  private readonly regularWidgetsSubject = new BehaviorSubject<WidgetConfig[]>([]);
  readonly regularWidgets$ = this.regularWidgetsSubject.pipe(
    distinctUntilChanged((prev, curr) => this.areWidgetsEqual(prev, curr))
  );

  private readonly expandedWidgetsSubject = new BehaviorSubject<WidgetConfig[]>([]);
  readonly expandedWidgets$ = this.expandedWidgetsSubject.pipe(
    distinctUntilChanged((prev, curr) => this.areWidgetsEqual(prev, curr))
  );

  // Store metric data
  private readonly metricsData = mockMetricsData;
  private nextWidgetId = 1;

  // Memoization cache
  private readonly metricDataCache = new Map<string, CacheEntry<MetricData>>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly CACHE_CLEANUP_INTERVAL = 60 * 1000; // 1 minute

  constructor() {
    this.setupCacheCleanup();
  }

  private areWidgetsEqual(prev: WidgetConfig[], curr: WidgetConfig[]): boolean {
    if (prev.length !== curr.length) return false;
    return prev.every((widget, index) => 
      widget.id === curr[index].id && widget.type === curr[index].type
    );
  }

  // Improved cache management
  private clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.metricDataCache.entries()) {
      if (now >= value.expiresAt) {
        this.metricDataCache.delete(key);
      }
    }
  }

  private updateNextWidgetId(state: DashboardState): void {
    const allWidgets = [...state.regularWidgets, ...state.expandedWidgets];
    if (allWidgets.length > 0) {
      this.nextWidgetId = Math.max(...allWidgets.map(w => w.id)) + 1;
    }
  }

  private updateWidgets(subject: BehaviorSubject<WidgetConfig[]>, updateFn: (widgets: WidgetConfig[]) => WidgetConfig[]): void {
    subject.next(updateFn(subject.value));
  }

  // Enhanced metric data retrieval with error handling
  getMetricData(type: MetricType): MetricData {
    try {
      const cacheKey = `${type}_${this.deviceTypeSubject.value}_${this.selectedDaySubject.value}`;
      const cached = this.metricDataCache.get(cacheKey);
      const now = Date.now();
      
      if (cached && now < cached.expiresAt) {
        return cached.data;
      }

      const data = this.metricsData[type];
      if (!data) {
        throw new Error(`No metric data found for type: ${type}`);
      }

      this.metricDataCache.set(cacheKey, {
        data,
        timestamp: now,
        expiresAt: now + this.CACHE_TTL
      });

      return data;
    } catch (error) {
      console.error('Error retrieving metric data:', error);
      // Return empty metric data as fallback
      return {
        dailyData: [],
        monthlyTarget: 0
      };
    }
  }

  // Enhanced widget operations
  addRegularWidget(type: MetricType): number {
    const newId = this.nextWidgetId++;
    this.updateWidgets(this.regularWidgetsSubject, widgets => [
      ...widgets,
      { id: newId, type }
    ]);
    return newId;
  }

  addExpandedWidget(type: MetricType): number {
    const newId = this.nextWidgetId++;
    this.updateWidgets(this.expandedWidgetsSubject, widgets => [
      ...widgets,
      { id: newId, type }
    ]);
    return newId;
  }

  updateExpandedWidgetsOrder(widgets: WidgetConfig[]): void {
    if (!this.validateWidgetList(widgets, this.expandedWidgetsSubject.value)) {
      console.error('Invalid widget order update: widget validation failed');
      return;
    }
    this.updateWidgets(this.expandedWidgetsSubject, () => [...widgets]);
  }

  private validateWidgetList(newWidgets: WidgetConfig[], currentWidgets: WidgetConfig[]): boolean {
    if (newWidgets.length !== currentWidgets.length) return false;
    
    const currentIds = new Set(currentWidgets.map(w => w.id));
    const validMetricTypes: MetricType[] = ['users', 'pageViews'];
    return newWidgets.every(widget => 
      currentIds.has(widget.id) && 
      validMetricTypes.includes(widget.type)
    );
  }

  setDeviceType(type: DeviceType): void {
    if (type !== this.deviceTypeSubject.value) {
      this.deviceTypeSubject.next(type);
    }
  }

  setSelectedDay(date: string): void {
    if (date !== this.selectedDaySubject.value) {
      this.selectedDaySubject.next(date);
    }
  }

  getCurrentSelectedDay(): string {
    return this.selectedDaySubject.value;
  }

  getCurrentDeviceType(): DeviceType {
    return this.deviceTypeSubject.value;
  }

  getRegularWidgets(): WidgetConfig[] {
    return [...this.regularWidgetsSubject.value];
  }

  removeRegularWidget(id: number): void {
    this.updateWidgets(this.regularWidgetsSubject, widgets =>
      widgets.filter(w => w.id !== id)
    );
  }

  updateRegularWidgetsOrder(widgets: WidgetConfig[]): void {
    if (!this.validateWidgetList(widgets, this.regularWidgetsSubject.value)) {
      console.error('Invalid widget order update: widget validation failed');
      return;
    }
    this.updateWidgets(this.regularWidgetsSubject, () => [...widgets]);
  }

  getExpandedWidgets(): WidgetConfig[] {
    return [...this.expandedWidgetsSubject.value];
  }

  removeExpandedWidget(id: number): void {
    this.updateWidgets(this.expandedWidgetsSubject, widgets =>
      widgets.filter(w => w.id !== id)
    );
  }

  getWidget(id: number): WidgetConfig | undefined {
    return [...this.regularWidgetsSubject.value, ...this.expandedWidgetsSubject.value]
      .find(w => w.id === id);
  }

  updateWidgetType(widgetId: number, type: MetricType): void {
    const regularWidget = this.regularWidgetsSubject.value.find(w => w.id === widgetId);
    if (regularWidget) {
      this.updateWidgets(this.regularWidgetsSubject, widgets =>
        widgets.map(w => w.id === widgetId ? { ...w, type } : w)
      );
      return;
    }

    const expandedWidget = this.expandedWidgetsSubject.value.find(w => w.id === widgetId);
    if (expandedWidget) {
      this.updateWidgets(this.expandedWidgetsSubject, widgets =>
        widgets.map(w => w.id === widgetId ? { ...w, type } : w)
      );
    }
  }

  toggleWidgetSize(widgetId: number): void {
    const regularWidget = this.regularWidgetsSubject.value.find(w => w.id === widgetId);
    if (regularWidget) {
      this.updateWidgets(this.regularWidgetsSubject, widgets =>
        widgets.filter(w => w.id !== widgetId)
      );
      this.updateWidgets(this.expandedWidgetsSubject, widgets => [
        ...widgets,
        regularWidget
      ]);
      return;
    }

    const expandedWidget = this.expandedWidgetsSubject.value.find(w => w.id === widgetId);
    if (expandedWidget) {
      this.updateWidgets(this.expandedWidgetsSubject, widgets =>
        widgets.filter(w => w.id !== widgetId)
      );
      this.updateWidgets(this.regularWidgetsSubject, widgets => [
        ...widgets,
        expandedWidget
      ]);
    }
  }

  private setupCacheCleanup(): void {
    setInterval(() => this.clearExpiredCache(), this.CACHE_CLEANUP_INTERVAL);
  }
}
