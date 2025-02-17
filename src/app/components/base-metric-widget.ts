import { Input, OnInit, OnDestroy, Directive, ErrorHandler } from '@angular/core';
import { DashboardStateService, MetricType, DeviceType } from '../services/dashboard-state.service';
import { MetricData } from '../data/mock-metrics';
import { Subscription, combineLatest } from 'rxjs';
import { NumberAnimationService } from '../services/number-animation.service';
import { distinctUntilChanged, filter, map, debounceTime } from 'rxjs/operators';

@Directive()
export abstract class BaseMetricWidget implements OnInit, OnDestroy {
  @Input() metricType!: MetricType;
  @Input() id!: number;

  protected currentValue: number = 0;
  protected displayValue: number = 0;
  protected cumulativeValue: number = 0;
  protected displayCumulativeValue: number = 0;
  protected progressPercentage: number = 0;
  protected displayProgressPercentage: number = 0;
  protected subscriptions = new Subscription();
  protected lastCurrentValue: number = 0;
  protected lastCumulativeValue: number = 0;
  protected error: string | null = null;

  constructor(
    protected dashboardState: DashboardStateService,
    protected numberAnimation: NumberAnimationService,
    protected errorHandler: ErrorHandler
  ) {}

  ngOnInit() {
    this.initializeSubscriptions();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  protected initializeSubscriptions(): void {
    this.subscriptions.add(
      combineLatest([
        this.dashboardState.deviceType$,
        this.dashboardState.selectedDay$,
        this.getWidgetUpdates()
      ]).pipe(
        debounceTime(50),
        filter(() => !!this.dashboardState.getWidget(this.id))
      ).subscribe({
        next: () => {
          try {
            this.calculateMetrics();
            this.error = null;
          } catch (err) {
            this.handleError(err);
          }
        },
        error: (err) => this.handleError(err)
      })
    );
  }

  protected getWidgetUpdates() {
    return combineLatest([
      this.dashboardState.regularWidgets$.pipe(
        map(widgets => widgets.find(w => w.id === this.id)),
        distinctUntilChanged((prev, curr) => 
          prev?.id === curr?.id && prev?.type === curr?.type
        )
      ),
      this.dashboardState.expandedWidgets$.pipe(
        map(widgets => widgets.find(w => w.id === this.id)),
        distinctUntilChanged((prev, curr) => 
          prev?.id === curr?.id && prev?.type === curr?.type
        )
      )
    ]);
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

    try {
      const metricData = this.dashboardState.getMetricData(widget.type);
      const deviceType = this.dashboardState.getCurrentDeviceType();
      const selectedDay = this.dashboardState.getCurrentSelectedDay();
      const selectedDayData = this.getSelectedDayData(metricData, selectedDay);
      
      this.updateCurrentValue(selectedDayData, deviceType);
      this.updateCumulativeValue(metricData, selectedDay, deviceType);
      this.updateProgressPercentage(metricData);
    } catch (err) {
      this.handleError(err);
    }
  }

  private getSelectedDayData(metricData: MetricData, selectedDay: string) {
    const selectedDayData = metricData.dailyData.find(d => d.date === selectedDay);
    if (!selectedDayData) {
      throw new Error(`No data found for selected day: ${selectedDay}`);
    }
    return selectedDayData;
  }

  private updateCurrentValue(selectedDayData: any, deviceType: DeviceType): void {
    const newCurrentValue = deviceType === 'total' ? selectedDayData.total :
                          deviceType === 'desktop' ? selectedDayData.desktop : 
                          selectedDayData.mobile;

    if (Math.abs(this.lastCurrentValue - newCurrentValue) > 0.1) {
      this.numberAnimation.animateValue(
        this.lastCurrentValue,
        newCurrentValue,
        (value: number) => this.displayValue = value,
        { precision: 0 }
      );
      this.lastCurrentValue = newCurrentValue;
      this.currentValue = newCurrentValue;
    }
  }

  private updateCumulativeValue(metricData: MetricData, selectedDay: string, deviceType: DeviceType): void {
    const cumulativeValue = metricData.dailyData
      .filter(d => d.date <= selectedDay)
      .reduce((sum, day) => {
        const value = deviceType === 'total' ? day.total :
                     deviceType === 'desktop' ? day.desktop : day.mobile;
        return sum + value;
      }, 0);

    if (Math.abs(this.lastCumulativeValue - cumulativeValue) > 0.1) {
      this.numberAnimation.animateValue(
        this.lastCumulativeValue,
        cumulativeValue,
        (value: number) => this.displayCumulativeValue = value
      );
      this.lastCumulativeValue = cumulativeValue;
      this.cumulativeValue = cumulativeValue;
    }
  }

  private updateProgressPercentage(metricData: MetricData): void {
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