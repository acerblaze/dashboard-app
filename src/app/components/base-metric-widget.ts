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

  currentValue: number = 0;
  displayValue: number = 0;
  cumulativeValue: number = 0;
  displayCumulativeValue: number = 0;
  progressPercentage: number = 0;
  displayProgressPercentage: number = 0;
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
    // Combine all state updates into a single stream
    this.subscriptions.add(
      combineLatest([
        this.dashboardState.deviceType$,
        this.dashboardState.selectedDay$,
        // Filter widget updates to only those affecting this widget
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
      ]).pipe(
        // Debounce updates to prevent rapid recalculations
        debounceTime(50),
        // Only process if widget exists
        filter(() => {
          const widget = this.dashboardState.getWidget(this.id);
          return !!widget;
        })
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

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  protected handleError(err: unknown): void {
    console.error('Error in metric widget:', err);
    this.error = err instanceof Error ? err.message : 'An unknown error occurred';
  }

  protected calculateMetrics(): void {
    const widget = this.dashboardState.getWidget(this.id);
    if (!widget) return;

    try {
      const metricData = this.dashboardState.getMetricData(widget.type);
      const deviceType = this.dashboardState.getCurrentDeviceType();
      const selectedDay = this.dashboardState.getCurrentSelectedDay();

      // Find the selected day's data
      const selectedDayData = metricData.dailyData.find(d => d.date === selectedDay);
      if (!selectedDayData) {
        throw new Error(`No data found for selected day: ${selectedDay}`);
      }

      // Calculate current value based on device type
      const newCurrentValue = deviceType === 'total' ? selectedDayData.total :
                            deviceType === 'desktop' ? selectedDayData.desktop : 
                            selectedDayData.mobile;

      // Only trigger animation if value has changed significantly
      if (Math.abs(this.lastCurrentValue - newCurrentValue) > 0.1) {
        this.numberAnimation.animateValue(
          this.lastCurrentValue,
          newCurrentValue,
          (value: number) => this.displayValue = value
        );
        this.lastCurrentValue = newCurrentValue;
      }

      // Calculate cumulative value
      const cumulativeValue = metricData.dailyData
        .filter(d => d.date <= selectedDay)
        .reduce((sum, day) => {
          const value = deviceType === 'total' ? day.total :
                       deviceType === 'desktop' ? day.desktop : day.mobile;
          return sum + value;
        }, 0);

      // Only trigger cumulative animation if value has changed significantly
      if (Math.abs(this.lastCumulativeValue - cumulativeValue) > 0.1) {
        this.numberAnimation.animateValue(
          this.lastCumulativeValue,
          cumulativeValue,
          (value: number) => this.displayCumulativeValue = value
        );
        this.lastCumulativeValue = cumulativeValue;
      }

      // Calculate progress percentage
      const newProgressPercentage = (cumulativeValue / metricData.monthlyTarget) * 100;
      
      // Only trigger progress animation if value has changed significantly
      if (Math.abs(this.progressPercentage - newProgressPercentage) > 0.1) {
        this.numberAnimation.animatePercentage(
          this.progressPercentage,
          newProgressPercentage,
          (value: number) => this.displayProgressPercentage = value
        );
        this.progressPercentage = newProgressPercentage;
      }
    } catch (err) {
      this.handleError(err);
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