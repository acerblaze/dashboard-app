import { Component, ElementRef, Input, OnInit, ViewChild, ErrorHandler, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { DashboardStateService, MetricType } from '../../services/dashboard-state.service';
import { NumberAnimationService } from '../../services/number-animation.service';
import { BaseMetricWidget } from '../base-metric-widget';
import { Chart } from 'chart.js';
import { ChartService } from '../../services/chart.service';

@Component({
  selector: 'app-expanded-metric-widget',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatMenuModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './expanded-metric-widget.component.html',
  styleUrl: './expanded-metric-widget.component.scss'
})
export class ExpandedMetricWidgetComponent extends BaseMetricWidget implements OnInit, OnDestroy {
  @ViewChild('trendChart') trendChartCanvas!: ElementRef;
  
  private trendChart: Chart | null = null;
  isTargetReached: boolean = false;
  override progressPercentage: number = 0;
  override displayProgressPercentage: number = 0;

  // Add display properties for animated values
  private lastAverageComparison: number = 0;
  private lastWeekComparison: number = 0;
  displayAverageComparison: number = 0;
  displayWeekComparison: number = 0;

  showMenu: boolean = false;

  constructor(
    protected override dashboardState: DashboardStateService,
    protected override numberAnimation: NumberAnimationService,
    protected override errorHandler: ErrorHandler,
    private chartService: ChartService
  ) {
    super(dashboardState, numberAnimation, errorHandler);
  }

  override ngOnInit() {
    super.ngOnInit();
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    if (this.trendChart) {
      this.trendChart.destroy();
    }
  }

  ngAfterViewInit() {
    this.initializeChart();
  }

  private initializeChart(): void {
    if (!this.trendChartCanvas?.nativeElement) return;

    const ctx = this.trendChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const widget = this.dashboardState.getWidget(this.id);
    if (!widget) return;

    const chartColor = this.chartService.getChartColor(widget.type);
    const config = this.chartService.getBaseChartConfig(chartColor, false);
    
    this.trendChart = new Chart(ctx, config);
    this.updateChartData();
    this.subscriptions.add({
      unsubscribe: () => this.chartService.setupChartResizeObserver(
        this.trendChart!,
        this.trendChartCanvas.nativeElement
      ).disconnect()
    });
  }

  private updateChartData(): void {
    if (!this.trendChart) return;

    try {
      const { labels, data } = this.chartService.getChartData(this.id);
      this.trendChart.data.labels = labels;
      this.trendChart.data.datasets[0].data = data;
      this.trendChart.update('none');
    } catch (error) {
      this.handleError(error);
    }
  }

  getMonthlyTarget(): number {
    const widget = this.dashboardState.getWidget(this.id);
    if (!widget) return 0;
    return this.dashboardState.getMetricData(widget.type).monthlyTarget;
  }

  toggleMenu(): void {
    this.showMenu = !this.showMenu;
  }

  override toggleMetricType(): void {
    const widget = this.dashboardState.getWidget(this.id);
    if (!widget) return;
    
    const newType: MetricType = widget.type === 'users' ? 'pageViews' : 'users';
    this.dashboardState.updateWidgetType(this.id, newType);
    this.showMenu = false;
    this.updateChartData();
  }

  override toggleSize(): void {
    this.dashboardState.toggleWidgetSize(this.id);
    this.showMenu = false;
  }

  removeWidget(): void {
    this.dashboardState.removeExpandedWidget(this.id);
    this.showMenu = false;
  }

  private updateProgressStatus() {
    const widget = this.dashboardState.getWidget(this.id);
    if (!widget) return;

    const metricData = this.dashboardState.getMetricData(widget.type);
    const deviceType = this.dashboardState.getCurrentDeviceType();
    const selectedDay = this.dashboardState.getCurrentSelectedDay();
    
    const cumulativeValue = metricData.dailyData
      .filter(d => d.date <= selectedDay)
      .reduce((sum, day) => {
        const value = deviceType === 'total' ? day.total :
                     deviceType === 'desktop' ? day.desktop : day.mobile;
        return sum + value;
      }, 0);

    const newProgressPercentage = (cumulativeValue / metricData.monthlyTarget) * 100;
    
    // Animate the progress percentage if it has changed significantly
    if (Math.abs(this.progressPercentage - newProgressPercentage) > 0.1) {
      this.numberAnimation.animateValue(
        this.progressPercentage,
        newProgressPercentage,
        (value: number) => this.displayProgressPercentage = value,
        { precision: 1 }
      );
      this.progressPercentage = newProgressPercentage;
    }

    this.isTargetReached = this.progressPercentage >= 100;
  }

  getHighestValue(): number {
    const data = this.getLastSevenDaysData();
    return Math.max(...data);
  }

  getAverageValue(): number {
    const data = this.getLastSevenDaysData();
    return data.reduce((a, b) => a + b, 0) / data.length;
  }

  getDayOverDayChange(): number {
    const data = this.getLastSevenDaysData();
    if (data.length < 2) return 0;

    const today = data[data.length - 1];
    const yesterday = data[data.length - 2];
    return ((today - yesterday) / yesterday) * 100;
  }

  getWeekOverWeekChange(): number {
    const data = this.getMetricDataForComparisons();
    return this.calculateWeekOverWeekChange(data);
  }

  getAverageComparison(): number {
    const data = this.getMetricDataForComparisons();
    return this.calculateMonthlyAverageComparison(data);
  }

  private getLastSevenDays(): string[] {
    const widget = this.dashboardState.getWidget(this.id);
    if (!widget) return [];

    const metricData = this.dashboardState.getMetricData(widget.type);
    const selectedDay = this.dashboardState.getCurrentSelectedDay();
    const selectedDayIndex = metricData.dailyData.findIndex(d => d.date === selectedDay);
    if (selectedDayIndex === -1) return [];

    const startIndex = Math.max(0, selectedDayIndex - 6);
    return metricData.dailyData
      .slice(startIndex, selectedDayIndex + 1)
      .map(d => d.date);
  }

  private getLastSevenDaysData(): number[] {
    const widget = this.dashboardState.getWidget(this.id);
    if (!widget) return [];

    const metricData = this.dashboardState.getMetricData(widget.type);
    const deviceType = this.dashboardState.getCurrentDeviceType();
    const selectedDay = this.dashboardState.getCurrentSelectedDay();
    const selectedDayIndex = metricData.dailyData.findIndex(d => d.date === selectedDay);
    if (selectedDayIndex === -1) return [];

    const startIndex = Math.max(0, selectedDayIndex - 6);
    return metricData.dailyData
      .slice(startIndex, selectedDayIndex + 1)
      .map(d => deviceType === 'total' ? d.total :
                deviceType === 'desktop' ? d.desktop : d.mobile);
  }

  protected override calculateMetrics(): void {
    super.calculateMetrics();
    this.updateChartData();
    this.updateProgressStatus();
    this.updateComparisonMetrics();
  }

  private updateComparisonMetrics(): void {
    const data = this.getMetricDataForComparisons();
    
    // Calculate week-over-week change
    const weekChange = this.calculateWeekOverWeekChange(data);
    if (Math.abs(this.lastWeekComparison - weekChange) > 0.1) {
      this.numberAnimation.animateValue(
        this.lastWeekComparison,
        weekChange,
        (value: number) => this.displayWeekComparison = value,
        { precision: 1 }
      );
      this.lastWeekComparison = weekChange;
    }

    // Calculate monthly average comparison
    const avgComparison = this.calculateMonthlyAverageComparison(data);
    if (Math.abs(this.lastAverageComparison - avgComparison) > 0.1) {
      this.numberAnimation.animateValue(
        this.lastAverageComparison,
        avgComparison,
        (value: number) => this.displayAverageComparison = value,
        { precision: 1 }
      );
      this.lastAverageComparison = avgComparison;
    }
  }

  private getMetricDataForComparisons(): number[] {
    const widget = this.dashboardState.getWidget(this.id);
    if (!widget) return [];

    const metricData = this.dashboardState.getMetricData(widget.type);
    const deviceType = this.dashboardState.getCurrentDeviceType();
    const selectedDay = this.dashboardState.getCurrentSelectedDay();
    const selectedDayIndex = metricData.dailyData.findIndex(d => d.date === selectedDay);
    if (selectedDayIndex === -1) return [];

    // Get data for the last 14 days (2 weeks)
    const startIndex = Math.max(0, selectedDayIndex - 13);
    return metricData.dailyData
      .slice(startIndex, selectedDayIndex + 1)
      .map(d => deviceType === 'total' ? d.total :
                deviceType === 'desktop' ? d.desktop : d.mobile);
  }

  private calculateWeekOverWeekChange(data: number[]): number {
    if (data.length < 14) return 0;

    // Calculate average for current week (last 7 days)
    const currentWeek = data.slice(-7);
    const currentWeekAvg = currentWeek.reduce((a, b) => a + b, 0) / currentWeek.length;

    // Calculate average for previous week (7 days before current week)
    const previousWeek = data.slice(-14, -7);
    const previousWeekAvg = previousWeek.reduce((a, b) => a + b, 0) / previousWeek.length;

    if (previousWeekAvg === 0) return 0;
    return ((currentWeekAvg - previousWeekAvg) / previousWeekAvg) * 100;
  }

  private calculateMonthlyAverageComparison(data: number[]): number {
    if (data.length === 0) return 0;

    // Calculate current value (most recent day)
    const currentValue = data[data.length - 1];

    // Calculate average of all values
    const average = data.reduce((a, b) => a + b, 0) / data.length;

    if (average === 0) return 0;
    return ((currentValue - average) / average) * 100;
  }
}
