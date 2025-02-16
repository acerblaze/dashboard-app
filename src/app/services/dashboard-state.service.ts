import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, debounceTime } from 'rxjs/operators';
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

  // Memoization cache
  private metricDataCache = new Map<string, any>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Initialize persistence
    this.loadPersistedState();
    // Set up auto-save
    this.setupStatePersistence();
  }

  // Enhanced error handling
  private handleStateError(error: unknown, operation: string): void {
    console.error(`Error during ${operation}:`, error);
    // You could also integrate with an error reporting service here
  }

  // Improved cache management
  private clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.metricDataCache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.metricDataCache.delete(key);
      }
    }
  }

  // Enhanced state persistence
  private persistState(): void {
    try {
      const state: DashboardState = {
        deviceType: this.deviceTypeSubject.value,
        selectedDay: this.selectedDaySubject.value,
        regularWidgets: this.regularWidgetsSubject.value,
        expandedWidgets: this.expandedWidgetsSubject.value
      };
      localStorage.setItem('dashboardState', JSON.stringify(state));
    } catch (error) {
      this.handleStateError(error, 'state persistence');
    }
  }

  private loadPersistedState(): void {
    try {
      const savedState = localStorage.getItem('dashboardState');
      if (savedState) {
        const state: DashboardState = JSON.parse(savedState);
        if (this.isValidState(state)) {
          this.deviceTypeSubject.next(state.deviceType);
          this.selectedDaySubject.next(state.selectedDay);
          this.regularWidgetsSubject.next(state.regularWidgets);
          this.expandedWidgetsSubject.next(state.expandedWidgets);
        }
      }
    } catch (error) {
      this.handleStateError(error, 'state loading');
    }
  }

  private isValidState(state: any): state is DashboardState {
    return (
      state &&
      typeof state.deviceType === 'string' &&
      ['total', 'desktop', 'mobile'].includes(state.deviceType) &&
      typeof state.selectedDay === 'string' &&
      Array.isArray(state.regularWidgets) &&
      Array.isArray(state.expandedWidgets) &&
      state.regularWidgets.every(this.isValidWidgetConfig) &&
      state.expandedWidgets.every(this.isValidWidgetConfig)
    );
  }

  private isValidWidgetConfig(config: any): config is WidgetConfig {
    return (
      config &&
      typeof config.id === 'number' &&
      typeof config.type === 'string' &&
      ['users', 'pageViews'].includes(config.type)
    );
  }

  // Enhanced metric data retrieval with error handling
  getMetricData(type: MetricType): MetricData {
    try {
      const cacheKey = `${type}_${this.deviceTypeSubject.value}_${this.selectedDaySubject.value}`;
      const cached = this.metricDataCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data;
      }

      // Clear expired cache entries periodically
      this.clearExpiredCache();

      const data = this.metricsData[type];
      if (!data) {
        throw new Error(`No metric data found for type: ${type}`);
      }

      this.metricDataCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      this.handleStateError(error, 'metric data retrieval');
      // Return empty metric data as fallback
      return {
        dailyData: [],
        monthlyTarget: 0
      };
    }
  }

  // Optimized widget operations
  private updateWidgets(subject: BehaviorSubject<WidgetConfig[]>, updater: (widgets: WidgetConfig[]) => WidgetConfig[]): void {
    const currentWidgets = subject.value;
    const updatedWidgets = updater([...currentWidgets]);
    
    if (!this.areWidgetsEqual(currentWidgets, updatedWidgets)) {
      subject.next(updatedWidgets);
    }
  }

  private areWidgetsEqual(a: WidgetConfig[], b: WidgetConfig[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((widget, index) => 
      widget.id === b[index].id && 
      widget.type === b[index].type
    );
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

  updateRegularWidgetsOrder(widgets: WidgetConfig[]): void {
    if (!this.validateWidgetList(widgets, this.regularWidgetsSubject.value)) {
      console.error('Invalid widget order update: widget validation failed');
      return;
    }
    this.updateWidgets(this.regularWidgetsSubject, () => [...widgets]);
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

  private setupStatePersistence(): void {
    combineLatest([
      this.deviceType$,
      this.selectedDay$,
      this.regularWidgets$,
      this.expandedWidgets$
    ]).pipe(
      debounceTime(1000) // Debounce saves to reduce storage operations
    ).subscribe(() => {
      this.persistState();
    });
  }
}
