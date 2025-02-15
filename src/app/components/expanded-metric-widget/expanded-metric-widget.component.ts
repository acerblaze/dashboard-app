import { Component, ElementRef, Input, OnInit, ViewChild, ErrorHandler } from '@angular/core';
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
export class ExpandedMetricWidgetComponent extends BaseMetricWidget implements OnInit {
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

  constructor(
    protected override dashboardState: DashboardStateService,
    protected override numberAnimation: NumberAnimationService,
    protected override errorHandler: ErrorHandler
  ) {
    super(dashboardState, numberAnimation, errorHandler);
  }

  override ngOnInit() {
    // Use the same subscription setup as the base widget
    this.subscriptions.add(
      combineLatest([
        this.dashboardState.deviceType$,
        this.dashboardState.selectedDay$,
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

  ngAfterViewInit() {
    this.initTrendChart();
    this.updateChartData();
  }

  private initTrendChart() {
    const ctx = this.trendChartCanvas.nativeElement.getContext('2d');
    
    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: this.getLastSevenDays(),
        datasets: [{
          label: this.metricLabel,
          data: [],
          backgroundColor: this.metricType === 'users' ? 'rgba(25, 118, 210, 0.2)' : 'rgba(156, 39, 176, 0.2)',
          borderColor: this.metricType === 'users' ? '#1976d2' : '#9c27b0',
          borderWidth: 2,
          borderRadius: 4,
          barThickness: 24,
          maxBarThickness: 32
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          tooltip: {
            mode: 'index',
            intersect: false,
            padding: 12,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            titleColor: '#1a1a1a',
            bodyColor: '#666',
            borderColor: '#e9ecef',
            borderWidth: 1,
            displayColors: false,
            titleFont: {
              size: 13,
              weight: 600
            },
            bodyFont: {
              size: 12
            },
            callbacks: {
              title: (items) => {
                return items[0].label;
              },
              label: (context) => {
                return `${this.metricLabel}: ${this.formatNumber(context.parsed.y)}`;
              }
            }
          },
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            border: {
              display: false
            },
            ticks: {
              color: '#666',
              font: {
                size: 12
              }
            }
          },
          y: {
            beginAtZero: true,
            border: {
              display: false
            },
            grid: {
              color: '#e9ecef'
            },
            ticks: {
              color: '#666',
              font: {
                size: 12
              },
              callback: (value) => this.formatNumber(value as number)
            }
          }
        }
      }
    };

    this.trendChart = new Chart(ctx, config);
  }

  private updateChartData() {
    if (!this.trendChart) return;
    
    const data = this.getLastSevenDaysData();
    this.trendChart.data.labels = this.getLastSevenDays();
    this.trendChart.data.datasets[0].data = data;
    this.trendChart.update();
  }

  getMonthlyTarget(): number {
    const widget = this.dashboardState.getWidget(this.id);
    if (!widget) return 0;
    return this.dashboardState.getMetricData(widget.type).monthlyTarget;
  }

  showMenu = false;

  toggleMenu(): void {
    this.showMenu = !this.showMenu;
  }

  override toggleMetricType(): void {
    const widget = this.dashboardState.getWidget(this.id);
    if (widget) {
      const newType: MetricType = widget.type === 'users' ? 'pageViews' : 'users';
      this.dashboardState.updateWidgetType(this.id, newType);
      this.showMenu = false;
    }
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
    const average = this.getAverageValue();
    if (average === 0) return 0;
    
    return Math.round(((this.displayValue - average) / average) * 100);
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
    try {
      // Calculate all new values first
      const widget = this.dashboardState.getWidget(this.id);
      if (!widget) return;

      const deviceType = this.dashboardState.getCurrentDeviceType();
      const selectedDay = this.dashboardState.getCurrentSelectedDay();
      const metricData = this.dashboardState.getMetricData(widget.type);
      const dayData = metricData.dailyData.find(d => d.date === selectedDay);
      
      if (!dayData) return;

      // Calculate base metrics
      const newCurrentValue = deviceType === 'total' 
        ? dayData.total 
        : deviceType === 'desktop' 
          ? dayData.desktop 
          : dayData.mobile;

      const newCumulativeValue = metricData.dailyData
        .filter(d => d.date <= selectedDay)
        .reduce((sum, day) => {
          const value = deviceType === 'total' ? day.total :
                       deviceType === 'desktop' ? day.desktop : day.mobile;
          return sum + value;
        }, 0);

      // Use requestAnimationFrame to ensure all animations start in the same frame
      requestAnimationFrame(() => {
        // First update the current value
        const isSignificantIncrease = (newCurrentValue - this.lastCurrentValue) > this.lastCurrentValue * 0.1;
        
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

        // Then start other animations immediately after
        this.numberAnimation.animateValue(
          this.lastCumulativeValue,
          newCumulativeValue,
          (value) => {
            this.displayCumulativeValue = value;
            this.cumulativeValue = newCumulativeValue;
          },
          {
            duration: 750,
            easing: NumberAnimationService.easings.easeOutExpo
          }
        );

        // Calculate and animate comparisons after current value is set
        const newAverageComparison = this.calculateAverageComparison();
        const newWeekComparison = this.calculateWeekOverWeekChange();

        this.numberAnimation.animateValue(
          this.lastAverageComparison,
          newAverageComparison,
          (value) => {
            this.displayAverageComparison = value;
          },
          {
            duration: 750,
            easing: NumberAnimationService.easings.easeOutExpo
          }
        );
        
        this.numberAnimation.animateValue(
          this.lastWeekComparison,
          newWeekComparison,
          (value) => {
            this.displayWeekComparison = value;
          },
          {
            duration: 750,
            easing: NumberAnimationService.easings.easeOutExpo
          }
        );

        // Calculate actual progress percentage (can exceed 100%)
        const newProgressPercentage = (newCumulativeValue / metricData.monthlyTarget) * 100;
        
        // Animate the actual percentage display (uncapped)
        this.numberAnimation.animateValue(
          this.actualProgressPercentage,
          newProgressPercentage,
          (value) => {
            this.actualProgressPercentage = value;
            // Update isTargetReached based on the actual percentage
            this.isTargetReached = value >= 100;
          },
          {
            duration: 750,
            easing: NumberAnimationService.easings.easeOutExpo
          }
        );

        // Animate the progress bar width (capped at 100%)
        this.numberAnimation.animateValue(
          this.progressPercentage,
          Math.min(newProgressPercentage, 100),
          (value) => this.progressPercentage = value,
          {
            duration: 750,
            easing: NumberAnimationService.easings.easeOutExpo
          }
        );
        
        // Update all last values
        this.lastCurrentValue = newCurrentValue;
        this.lastCumulativeValue = newCumulativeValue;
        this.lastAverageComparison = newAverageComparison;
        this.lastWeekComparison = newWeekComparison;
        
        // Update chart
        this.updateChartData();
      });
    } catch (err) {
      this.handleError(err);
    }
  }

  private calculateAverageComparison(): number {
    const average = this.getAverageValue();
    if (average === 0) return 0;
    
    // Use displayValue instead of currentValue for smoother animations
    return Math.round(((this.displayValue - average) / average) * 100);
  }

  private calculateWeekOverWeekChange(): number {
    const widget = this.dashboardState.getWidget(this.id);
    if (!widget) return 0;

    const metricData = this.dashboardState.getMetricData(widget.type);
    const deviceType = this.dashboardState.getCurrentDeviceType();
    const selectedDay = this.dashboardState.getCurrentSelectedDay();
    
    const selectedDayIndex = metricData.dailyData.findIndex(d => d.date === selectedDay);
    if (selectedDayIndex === -1 || selectedDayIndex < 7) return 0;

    // Use current day's displayValue for smoother animations
    const lastWeekValue = deviceType === 'total'
      ? metricData.dailyData[selectedDayIndex - 7].total
      : deviceType === 'desktop'
        ? metricData.dailyData[selectedDayIndex - 7].desktop
        : metricData.dailyData[selectedDayIndex - 7].mobile;

    if (lastWeekValue === 0) return 0;
    return Math.round(((this.displayValue - lastWeekValue) / lastWeekValue) * 100);
  }
}
