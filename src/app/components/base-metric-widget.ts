import { Input, OnInit, OnDestroy, Directive, ErrorHandler } from '@angular/core';
import { DashboardStateService, MetricType } from '../services/dashboard-state.service';
import { Subscription, combineLatest } from 'rxjs';
import { NumberAnimationService } from '../services/number-animation.service';
import { distinctUntilChanged, filter, map, debounceTime } from 'rxjs/operators';
import { MetricCalculationService } from '../services/metric-calculation.service';
import { MetricData } from '../data/mock-metrics';

export interface Widget {
  id: number;
  type: MetricType;
}

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
    protected errorHandler: ErrorHandler,
    protected metricCalculation: MetricCalculationService
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
        map((widgets: Widget[]) => widgets.find((w: Widget) => w.id === this.id))
      ),
      this.dashboardState.expandedWidgets$.pipe(
        map((widgets: Widget[]) => widgets.find((w: Widget) => w.id === this.id))
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
    
    const selectedDayData = this.metricCalculation.findDayData(metricData, selectedDay);
    const newCurrentValue = this.metricCalculation.calculateCurrentValue(selectedDayData, deviceType);
    const newCumulativeValue = this.metricCalculation.calculateCumulativeValue(metricData, selectedDay, deviceType);

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
    const newProgressPercentage = this.metricCalculation.calculateProgressPercentage(
      metricData,
      this.dashboardState.getCurrentSelectedDay(),
      this.dashboardState.getCurrentDeviceType()
    );
    
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
    return this.metricCalculation.formatNumber(value);
  }

  formatPercentage(value: number): string {
    return this.metricCalculation.formatPercentage(value);
  }

  abstract toggleSize(): void;

  toggleMetricType(): void {
    const widget = this.dashboardState.getWidget(this.id);
    if (!widget) return;
    
    const newType = widget.type === 'users' ? 'pageViews' : 'users';
    this.dashboardState.updateWidgetType(this.id, newType);
  }
} 