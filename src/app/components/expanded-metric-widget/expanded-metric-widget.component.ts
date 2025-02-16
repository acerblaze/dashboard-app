import { Component, ElementRef, Input, OnInit, ViewChild, ErrorHandler, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { DashboardStateService, MetricType } from '../../services/dashboard-state.service';
import { NumberAnimationService } from '../../services/number-animation.service';
import { BaseMetricWidget } from '../base-metric-widget';
import { Chart, ChartConfiguration } from 'chart.js';
import { combineLatest, filter, map, distinctUntilChanged } from 'rxjs';

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
  actualProgressPercentage: number = 0;

  // Add display properties for animated values
  private lastAverageComparison: number = 0;
  private lastWeekComparison: number = 0;
  displayAverageComparison: number = 0;
  displayWeekComparison: number = 0;

  showMenu: boolean = false;

  constructor(
    protected override dashboardState: DashboardStateService,
    protected override numberAnimation: NumberAnimationService,
    protected override errorHandler: ErrorHandler
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
    this.updateChartData();
    this.setupChartResizeObserver();
  }

  private initializeChart(): void {
    if (!this.trendChartCanvas?.nativeElement) return;

    const ctx = this.trendChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const widget = this.dashboardState.getWidget(this.id);
    if (!widget) return;

    const isPageViews = widget.type === 'pageViews';
    const chartColor = isPageViews ? 'hsl(270 91.2% 59.8%)' : 'hsl(217.2 91.2% 59.8%)';

    this.trendChart = new Chart(ctx, this.getChartConfig(chartColor));
  }

  private getChartConfig(chartColor: string): ChartConfiguration {
    return {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          data: [],
          borderColor: chartColor,
          backgroundColor: `${chartColor.split(')')[0]} / 0.1)`,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 2,
          pointHoverRadius: 4,
          pointBackgroundColor: chartColor,
          pointBorderColor: 'white',
          pointBorderWidth: 1,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 300
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'hsl(0 0% 100%)',
            titleColor: 'hsl(240 5.9% 10%)',
            bodyColor: 'hsl(240 3.8% 46.1%)',
            borderColor: 'hsl(240 5.9% 90%)',
            borderWidth: 1,
            padding: 8,
            displayColors: false,
            callbacks: {
              label: (context) => `${this.formatNumber(context.raw as number)}`
            }
          }
        },
        scales: {
          x: {
            display: true,
            grid: {
              display: false
            },
            ticks: {
              maxRotation: 0,
              font: {
                size: 11
              }
            }
          },
          y: {
            display: true,
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            },
            ticks: {
              font: {
                size: 11
              },
              callback: (value) => this.formatNumber(value as number)
            }
          }
        },
        interaction: {
          mode: 'index',
          intersect: false
        },
        hover: {
          mode: 'index',
          intersect: false
        }
      }
    };
  }

  private updateChartData(): void {
    if (!this.trendChart) return;

    const widget = this.dashboardState.getWidget(this.id);
    if (!widget) return;

    try {
      const metricData = this.dashboardState.getMetricData(widget.type);
      const deviceType = this.dashboardState.getCurrentDeviceType();
      const selectedDay = this.dashboardState.getCurrentSelectedDay();

      const selectedDayIndex = metricData.dailyData.findIndex(d => d.date === selectedDay);
      if (selectedDayIndex === -1) return;

      // Get last 7 days of data
      const startIndex = Math.max(0, selectedDayIndex - 6);
      const relevantDays = metricData.dailyData.slice(startIndex, selectedDayIndex + 1);

      const labels = relevantDays.map(d => {
        const date = new Date(d.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      });

      const data = relevantDays.map(d => 
        deviceType === 'total' ? d.total :
        deviceType === 'desktop' ? d.desktop : d.mobile
      );

      this.trendChart.data.labels = labels;
      this.trendChart.data.datasets[0].data = data;
      this.trendChart.update('none');
    } catch (error) {
      this.handleError(error);
    }
  }

  private setupChartResizeObserver(): void {
    if (!this.trendChartCanvas?.nativeElement) return;

    const resizeObserver = new ResizeObserver(() => {
      if (this.trendChart) {
        this.trendChart.resize();
      }
    });

    resizeObserver.observe(this.trendChartCanvas.nativeElement);
    this.subscriptions.add({
      unsubscribe: () => resizeObserver.disconnect()
    });
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
    
    // Calculate cumulative value up to selected day
    const cumulativeValue = metricData.dailyData
      .filter(d => d.date <= selectedDay)
      .reduce((sum, day) => {
        const value = deviceType === 'total' ? day.total :
                     deviceType === 'desktop' ? day.desktop : day.mobile;
        return sum + value;
      }, 0);

    // Only update isTargetReached flag here
    this.isTargetReached = (cumulativeValue / metricData.monthlyTarget) * 100 >= 100;
  }

  getHighestValue(): number {
    const data = this.getLastSevenDaysData();
    return Math.max(...data);
  }

  getAverageValue(): number {
    const data = this.getLastSevenDaysData();
    const sum = data.reduce((a, b) => a + b, 0);
    return Math.round(sum / data.length);
  }

  getDayOverDayChange(): number {
    const data = this.getLastSevenDaysData();
    if (data.length < 2) return 0;
    
    const today = data[data.length - 1];
    const yesterday = data[data.length - 2];
    
    if (yesterday === 0) return 0;
    return Math.round(((today - yesterday) / yesterday) * 100);
  }

  getWeekOverWeekChange(): number {
    const data = this.getLastSevenDaysData();
    if (data.length < 7) return 0;
    
    const today = data[data.length - 1];
    const lastWeek = data[0];
    
    if (lastWeek === 0) return 0;
    return Math.round(((today - lastWeek) / lastWeek) * 100);
  }

  getAverageComparison(): number {
    const data = this.getLastSevenDaysData();
    if (data.length === 0) return 0;
    
    const today = data[data.length - 1];
    const average = data.reduce((sum, value) => sum + value, 0) / data.length;
    
    if (average === 0) return 0;
    return Math.round(((today - average) / average) * 100);
  }

  private getLastSevenDays(): string[] {
    const widget = this.dashboardState.getWidget(this.id);
    if (!widget) return [];

    const metricData = this.dashboardState.getMetricData(widget.type);
    const selectedDay = this.dashboardState.getCurrentSelectedDay();
    
    // Find the index of the selected day
    const selectedDayIndex = metricData.dailyData.findIndex(d => d.date === selectedDay);
    if (selectedDayIndex === -1) return [];

    // Get 7 days of data ending at the selected day
    const startIndex = Math.max(0, selectedDayIndex - 6);
    const relevantDays = metricData.dailyData.slice(startIndex, selectedDayIndex + 1);

    return relevantDays.map(d => {
      const date = new Date(d.date);
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    });
  }

  private getLastSevenDaysData(): number[] {
    const widget = this.dashboardState.getWidget(this.id);
    if (!widget) return [];

    const metricData = this.dashboardState.getMetricData(widget.type);
    const deviceType = this.dashboardState.getCurrentDeviceType();
    const selectedDay = this.dashboardState.getCurrentSelectedDay();
    
    // Find the index of the selected day
    const selectedDayIndex = metricData.dailyData.findIndex(d => d.date === selectedDay);
    if (selectedDayIndex === -1) return [];

    // Get 7 days of data ending at the selected day
    const startIndex = Math.max(0, selectedDayIndex - 6);
    const relevantDays = metricData.dailyData.slice(startIndex, selectedDayIndex + 1);

    return relevantDays.map(d => 
      deviceType === 'total' ? d.total : 
      deviceType === 'desktop' ? d.desktop : d.mobile
    );
  }

  protected override calculateMetrics(): void {
    super.calculateMetrics();
    this.updateChartData();
    this.updateComparisonMetrics();
    this.updateProgressStatus();
    this.actualProgressPercentage = this.progressPercentage;
  }

  private updateComparisonMetrics(): void {
    const widget = this.dashboardState.getWidget(this.id);
    if (!widget) return;

    try {
      // Get the last 30 days of data for monthly average
      const data = this.getMetricDataForComparisons();
      if (!data.length) return;

      console.log('Comparison data:', {
        type: widget.type,
        data: data,
        today: data[data.length - 1],
        lastWeek: data[data.length - 8],
        weekChange: this.calculateWeekOverWeekChange(data),
        monthlyAvg: data.slice(0, -1).reduce((sum, value) => sum + value, 0) / (data.length - 1),
        monthlyChange: this.calculateMonthlyAverageComparison(data)
      });

      // Week over week comparison
      const weekChange = this.calculateWeekOverWeekChange(data);
      // Only animate if there's a significant change
      if (weekChange !== this.lastWeekComparison) {
        this.numberAnimation.animateValue(
          this.lastWeekComparison,
          weekChange,
          (value: number) => this.displayWeekComparison = value,
          { duration: 500, precision: 1 }
        );
        this.lastWeekComparison = weekChange;
      }

      // Monthly average comparison
      const avgComparison = this.calculateMonthlyAverageComparison(data);
      // Only animate if there's a significant change
      if (avgComparison !== this.lastAverageComparison) {
        this.numberAnimation.animateValue(
          this.lastAverageComparison,
          avgComparison,
          (value: number) => this.displayAverageComparison = value,
          { duration: 500, precision: 1 }
        );
        this.lastAverageComparison = avgComparison;
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  private getMetricDataForComparisons(): number[] {
    const widget = this.dashboardState.getWidget(this.id);
    if (!widget) return [];

    const metricData = this.dashboardState.getMetricData(widget.type);
    const deviceType = this.dashboardState.getCurrentDeviceType();
    const selectedDay = this.dashboardState.getCurrentSelectedDay();
    
    // Find the index of the selected day
    const selectedDayIndex = metricData.dailyData.findIndex(d => d.date === selectedDay);
    if (selectedDayIndex === -1) return [];

    // Get up to 30 days of data ending at the selected day
    const startIndex = Math.max(0, selectedDayIndex - 29);
    const relevantDays = metricData.dailyData.slice(startIndex, selectedDayIndex + 1);

    return relevantDays.map(d => 
      deviceType === 'total' ? d.total : 
      deviceType === 'desktop' ? d.desktop : d.mobile
    );
  }

  private calculateWeekOverWeekChange(data: number[]): number {
    // Need at least 8 days of data for week-over-week comparison
    if (data.length < 8) return 0;

    // Get today's value (last in array)
    const todayValue = data[data.length - 1];
    
    // Get the value from exactly 7 days ago
    const lastWeekValue = data[data.length - 8];
    if (lastWeekValue === 0) return 0;

    // Calculate percentage change
    const change = ((todayValue - lastWeekValue) / lastWeekValue) * 100;
    
    // Return rounded value, handling edge cases
    if (!isFinite(change)) return 0;
    return Math.round(change);
  }

  private calculateMonthlyAverageComparison(data: number[]): number {
    // Need at least 2 days of data for comparison
    if (data.length < 2) return 0;

    // Get today's value (last in array)
    const todayValue = data[data.length - 1];
    
    // Calculate average of all previous days (excluding today)
    const previousDays = data.slice(0, -1);
    if (previousDays.length === 0) return 0;

    // Calculate average, handling potential zero values
    const monthlyAverage = previousDays.reduce((sum, value) => sum + value, 0) / previousDays.length;
    if (monthlyAverage === 0) return 0;

    // Calculate percentage difference
    const change = ((todayValue - monthlyAverage) / monthlyAverage) * 100;
    
    // Return rounded value, handling edge cases
    if (!isFinite(change)) return 0;
    return Math.round(change);
  }
}
