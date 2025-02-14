import { Input, OnInit, OnDestroy, Directive } from '@angular/core';
import { DashboardStateService, MetricType } from '../services/dashboard-state.service';
import { MetricData } from '../data/mock-metrics';
import { Subscription, combineLatest } from 'rxjs';
import { NumberAnimationService } from '../services/number-animation.service';

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

  constructor(
    protected dashboardState: DashboardStateService,
    protected numberAnimation: NumberAnimationService
  ) {}

  ngOnInit() {
    this.subscriptions.add(
      combineLatest([
        this.dashboardState.deviceType$,
        this.dashboardState.selectedDay$,
        this.dashboardState.regularWidgets$,
        this.dashboardState.expandedWidgets$
      ]).subscribe(() => {
        this.calculateMetrics();
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  protected calculateMetrics(): void {
    const deviceType = this.dashboardState.getCurrentDeviceType();
    const selectedDay = this.dashboardState.getCurrentSelectedDay();
    const widget = this.dashboardState.getWidget(this.id);
    if (!widget) return;

    const metricData = this.dashboardState.getMetricData(widget.type);
    const dayData = metricData.dailyData.find(d => d.date === selectedDay);
    
    if (!dayData) {
      console.warn(`No data found for day: ${selectedDay}`);
      return;
    }
    
    const newCurrentValue = deviceType === 'total' 
      ? dayData.total 
      : deviceType === 'desktop' 
        ? dayData.desktop 
        : dayData.mobile;

    const newCumulativeValue = metricData.dailyData
      .filter(d => d.date <= selectedDay)
      .reduce((sum, day) => {
        const dayValue = deviceType === 'total'
          ? day.total
          : deviceType === 'desktop'
            ? day.desktop
            : day.mobile;
        return sum + dayValue;
      }, 0);

    // Animate current value with bounce effect for significant increases
    const currentValueIncrease = newCurrentValue - this.lastCurrentValue;
    const isSignificantIncrease = currentValueIncrease > this.lastCurrentValue * 0.1;

    this.numberAnimation.animateValue(
      this.lastCurrentValue,
      newCurrentValue,
      (value) => this.displayValue = value,
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
      (value) => this.displayCumulativeValue = value,
      {
        duration: 1000,
        easing: NumberAnimationService.easings.easeInOutQuad
      }
    );

    // Update stored values
    this.currentValue = newCurrentValue;
    this.cumulativeValue = newCumulativeValue;
    this.lastCurrentValue = newCurrentValue;
    this.lastCumulativeValue = newCumulativeValue;

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