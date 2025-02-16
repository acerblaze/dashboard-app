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
    // Initialize persistence
    this.loadPersistedState();
    // Set up auto-save
    this.setupStatePersistence();
    this.setupCacheCleanup();
  }

  // Enhanced error handling
  private handleStateError(error: unknown, operation: string): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error during ${operation}:`, errorMessage);
    // You could also integrate with an error reporting service here
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
          // Update nextWidgetId based on existing widgets
          this.updateNextWidgetId(state);
        }
      }
    } catch (error) {
      this.handleStateError(error, 'state loading');
    }
  }

  private updateNextWidgetId(state: DashboardState): void {
    const allWidgets = [...state.regularWidgets, ...state.expandedWidgets];
    if (allWidgets.length > 0) {
      const maxId = Math.max(...allWidgets.map(w => w.id));
      this.nextWidgetId = maxId + 1;
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
    if (type !== this.deviceTypeSubject.value) {
      this.deviceTypeSubject.next(type);
    }
  }

  getCurrentDeviceType(): DeviceType {
    return this.deviceTypeSubject.value;
  }

  setSelectedDay(date: string): void {
    if (date !== this.selectedDaySubject.value) {
      this.selectedDaySubject.next(date);
    }
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
    this.updateWidgets(this.regularWidgetsSubject, widgets => 
      widgets.filter(widget => widget.id !== id)
    );
  }

  removeExpandedWidget(id: number): void {
    this.updateWidgets(this.expandedWidgetsSubject, widgets => 
      widgets.filter(widget => widget.id !== id)
    );
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

  private setupStatePersistence(): void {
    combineLatest([
      this.deviceType$,
      this.selectedDay$,
      this.regularWidgets$,
      this.expandedWidgets$
    ]).pipe(
      debounceTime(300)
    ).subscribe(() => {
      this.persistState();
    });
  }

  private setupCacheCleanup(): void {
    setInterval(() => this.clearExpiredCache(), this.CACHE_CLEANUP_INTERVAL);
  }
}
