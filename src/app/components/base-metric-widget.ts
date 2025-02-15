import { Input, OnInit, OnDestroy, Directive, ErrorHandler } from '@angular/core';
import { DashboardStateService, MetricType, DeviceType } from '../services/dashboard-state.service';
import { MetricData } from '../data/mock-metrics';
import { Subscription, combineLatest } from 'rxjs';
import { NumberAnimationService } from '../services/number-animation.service';
import { distinctUntilChanged, filter, map } from 'rxjs/operators';

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
    // Only subscribe to state changes that affect this specific widget
    this.subscriptions.add(
      combineLatest([
        this.dashboardState.deviceType$,
        this.dashboardState.selectedDay$,
        // Filter widget updates to only those affecting this widget
        this.dashboardState.regularWidgets$.pipe(
          map(widgets => widgets.find(w => w.id === this.id)),
          distinctUntilChanged()
        ),
        this.dashboardState.expandedWidgets$.pipe(
          map(widgets => widgets.find(w => w.id === this.id)),
          distinctUntilChanged()
        )
      ]).pipe(
        filter(() => {
          const widget = this.dashboardState.getWidget(this.id);
          return !!widget; // Only process if widget exists
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

  protected handleError(error: any): void {
    this.error = 'Error updating widget metrics';
    this.errorHandler.handleError(error);
  }

  protected calculateMetrics(): void {
    const deviceType = this.dashboardState.getCurrentDeviceType();
    const selectedDay = this.dashboardState.getCurrentSelectedDay();
    const widget = this.dashboardState.getWidget(this.id);
    
    if (!widget) {
      throw new Error(`Widget with id ${this.id} not found`);
    }

    const metricData = this.dashboardState.getMetricData(widget.type);
    const dayData = metricData.dailyData.find(d => d.date === selectedDay);
    
    if (!dayData) {
      throw new Error(`No data found for day: ${selectedDay}`);
    }
    
    const newCurrentValue = deviceType === 'total' 
      ? dayData.total 
      : deviceType === 'desktop' 
        ? dayData.desktop 
        : dayData.mobile;

    const newCumulativeValue = this.calculateCumulativeValue(metricData, selectedDay, deviceType);

    this.animateMetricChanges(newCurrentValue, newCumulativeValue, metricData);
    
    // Update last values after successful calculation
    this.lastCurrentValue = newCurrentValue;
    this.lastCumulativeValue = newCumulativeValue;
  }

  private calculateCumulativeValue(data: MetricData, selectedDay: string, deviceType: DeviceType): number {
    return data.dailyData
      .filter(d => d.date <= selectedDay)
      .reduce((sum, day) => {
        const dayValue = deviceType === 'total'
          ? day.total
          : deviceType === 'desktop'
            ? day.desktop
            : day.mobile;
        return sum + dayValue;
      }, 0);
  }

  private animateMetricChanges(newCurrentValue: number, newCumulativeValue: number, metricData: MetricData): void {
    // Animate current value with bounce effect for significant increases
    const currentValueIncrease = newCurrentValue - this.lastCurrentValue;
    const isSignificantIncrease = currentValueIncrease > this.lastCurrentValue * 0.1;

    this.numberAnimation.animateValue(
      this.lastCurrentValue,
      newCurrentValue,
      (value) => {
        this.displayValue = value;
        this.currentValue = newCurrentValue;
      },
      {
        easing: isSignificantIncrease 
          ? NumberAnimationService.easings.easeOutBack 
          : NumberAnimationService.easings.easeOutExpo,
        duration: isSignificantIncrease ? 1000 : 750
      }
    );

    // Animate cumulative value
    this.numberAnimation.animateValue(
      this.lastCumulativeValue,
      newCumulativeValue,
      (value) => {
        this.displayCumulativeValue = value;
        this.cumulativeValue = newCumulativeValue;
      },
      {
        duration: 1000,
        easing: NumberAnimationService.easings.easeInOutQuad
      }
    );

    // Animate progress percentage
    const newProgressPercentage = (this.cumulativeValue / metricData.monthlyTarget) * 100;
    this.numberAnimation.animatePercentage(
      this.progressPercentage,
      newProgressPercentage,
      (value) => this.displayProgressPercentage = value
    );
    this.progressPercentage = newProgressPercentage;
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