import { Input, OnInit, OnDestroy, Directive, ErrorHandler } from '@angular/core';
import { DashboardStateService, MetricType, DeviceType } from '../services/dashboard-state.service';
import { MetricData, DailyMetric } from '../data/mock-metrics';
import { Subscription, combineLatest } from 'rxjs';
import { NumberAnimationService } from '../services/number-animation.service';
import { distinctUntilChanged, filter, map, debounceTime } from 'rxjs/operators';

@Directive()
export abstract class BaseMetricWidget implements OnInit, OnDestroy {
  @Input() metricType!: MetricType;
  @Input() id!: number;

  protected currentValue = 0;
  protected displayValue = 0;
  protected cumulativeValue = 0;
  protected displayCumulativeValue = 0;
  protected progressPercentage = 0;
  protected displayProgressPercentage = 0;
  protected subscription = new Subscription();
  protected lastValues = {
    current: 0,
    cumulative: 0
  };
  protected error: string | null = null;

  constructor(
    protected dashboardState: DashboardStateService,
    protected numberAnimation: NumberAnimationService,
    protected errorHandler: ErrorHandler
  ) {}

  ngOnInit() {
    this.initializeSubscription();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  protected initializeSubscription(): void {
    const widgetUpdates$ = combineLatest([
      this.dashboardState.regularWidgets$.pipe(
        map(widgets => widgets.find(w => w.id === this.id))
      ),
      this.dashboardState.expandedWidgets$.pipe(
        map(widgets => widgets.find(w => w.id === this.id))
      )
    ]).pipe(
      distinctUntilChanged((prev, curr) => 
        prev[0]?.id === curr[0]?.id && 
        prev[0]?.type === curr[0]?.type &&
        prev[1]?.id === curr[1]?.id && 
        prev[1]?.type === curr[1]?.type
      )
    );

    this.subscription.add(
      combineLatest([
        this.dashboardState.deviceType$,
        this.dashboardState.selectedDay$,
        widgetUpdates$
      ]).pipe(
        debounceTime(50),
        filter(() => !!this.dashboardState.getWidget(this.id))
      ).subscribe({
        next: () => this.safelyCalculateMetrics(),
        error: (err) => this.handleError(err)
      })
    );
  }

  protected safelyCalculateMetrics(): void {
    try {
      this.calculateMetrics();
      this.error = null;
    } catch (err) {
      this.handleError(err);
    }
  }

  protected handleError(err: unknown): void {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error('Error in metric widget:', errorMessage);
    this.error = errorMessage;
    this.errorHandler.handleError(err);
  }

  protected calculateMetrics(): void {
    const widget = this.dashboardState.getWidget(this.id);
    if (!widget) return;

    const metricData = this.dashboardState.getMetricData(widget.type);
    const deviceType = this.dashboardState.getCurrentDeviceType();
    const selectedDay = this.dashboardState.getCurrentSelectedDay();
    const selectedDayData = this.findDayData(metricData, selectedDay);
    
    this.updateMetricValues(selectedDayData, deviceType, metricData, selectedDay);
  }

  private findDayData(metricData: MetricData, selectedDay: string): DailyMetric {
    const dayData = metricData.dailyData.find(d => d.date === selectedDay);
    if (!dayData) {
      throw new Error(`No data found for selected day: ${selectedDay}`);
    }
    return dayData;
  }

  private getDeviceValue(data: DailyMetric, deviceType: DeviceType): number {
    return deviceType === 'total' ? data.total :
           deviceType === 'desktop' ? data.desktop : 
           data.mobile;
  }

  private updateMetricValues(
    selectedDayData: DailyMetric, 
    deviceType: DeviceType,
    metricData: MetricData,
    selectedDay: string
  ): void {
    const newCurrentValue = this.getDeviceValue(selectedDayData, deviceType);
    const newCumulativeValue = metricData.dailyData
      .filter(d => d.date <= selectedDay)
      .reduce((sum, day) => sum + this.getDeviceValue(day, deviceType), 0);

    this.animateValueChange('current', newCurrentValue);
    this.animateValueChange('cumulative', newCumulativeValue);
    this.updateProgress(metricData);
  }

  private animateValueChange(type: 'current' | 'cumulative', newValue: number): void {
    const lastValue = this.lastValues[type];
    if (Math.abs(lastValue - newValue) > 0.1) {
      this.numberAnimation.animateValue(
        lastValue,
        newValue,
        (value: number) => {
          if (type === 'current') {
            this.displayValue = value;
            this.currentValue = newValue;
          } else {
            this.displayCumulativeValue = value;
            this.cumulativeValue = newValue;
          }
        },
        { precision: 0 }
      );
      this.lastValues[type] = newValue;
    }
  }

  private updateProgress(metricData: MetricData): void {
    const newProgressPercentage = (this.cumulativeValue / metricData.monthlyTarget) * 100;
    
    if (Math.abs(this.progressPercentage - newProgressPercentage) > 0.1) {
      this.numberAnimation.animatePercentage(
        this.progressPercentage,
        newProgressPercentage,
        (value: number) => this.displayProgressPercentage = value
      );
      this.progressPercentage = newProgressPercentage;
    }
  }

  get metricLabel(): string {
    const widget = this.dashboardState.getWidget(this.id);
    return widget?.type === 'users' ? 'Users' : 'Page Views';
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US').format(Math.round(value));
  }

  formatPercentage(value: number): string {
    return `${Math.round(value)}%`;
  }

  abstract toggleSize(): void;

  toggleMetricType(): void {
    const widget = this.dashboardState.getWidget(this.id);
    if (!widget) return;
    
    const newType = widget.type === 'users' ? 'pageViews' : 'users';
    this.dashboardState.updateWidgetType(this.id, newType);
  }
} 