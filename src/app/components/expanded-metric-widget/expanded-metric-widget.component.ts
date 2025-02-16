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
    this.initializeChart();
    this.updateChartData();
    this.resizeChart();
  }

  private initializeChart(): void {
    if (!this.trendChartCanvas) return;

    const ctx = this.trendChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    // Destroy existing chart if it exists
    if (this.trendChart) {
      this.trendChart.destroy();
    }

    // Use requestAnimationFrame for smoother rendering
    requestAnimationFrame(() => {
      this.trendChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            data: [],
            borderColor: '#4CAF50',
            tension: 0.4,
            pointRadius: 0,
            borderWidth: 2,
            fill: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            duration: 0 // Disable animations for better performance
          },
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            x: {
              display: true,
              grid: {
                display: false
              }
            },
            y: {
              display: true,
              beginAtZero: true,
              grid: {
                color: 'rgba(0, 0, 0, 0.1)'
              }
            }
          }
        }
      });
    });
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

      // Get 7 days of data ending at the selected day
      const startIndex = Math.max(0, selectedDayIndex - 6);
      const relevantDays = metricData.dailyData.slice(startIndex, selectedDayIndex + 1);

      // Prepare data outside of animation frame
      const labels = relevantDays.map(d => {
        const date = new Date(d.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      });

      const data = relevantDays.map(d => 
        deviceType === 'total' ? d.total :
        deviceType === 'desktop' ? d.desktop : d.mobile
      );

      // Use requestAnimationFrame for smoother updates
      requestAnimationFrame(() => {
        this.trendChart!.data.labels = labels;
        this.trendChart!.data.datasets[0].data = data;
        this.trendChart!.update('none'); // Use 'none' mode for better performance
      });
    } catch (error) {
      console.error('Error updating chart:', error);
    }
  }

  // Add resize observer for responsive charts
  private resizeChart(): void {
    if (this.trendChartCanvas?.nativeElement) {
      const resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => {
          if (this.trendChart) {
            this.trendChart.resize();
          }
        });
      });

      resizeObserver.observe(this.trendChartCanvas.nativeElement);

      // Clean up observer on destroy
      this.subscriptions.add({
        unsubscribe: () => resizeObserver.disconnect()
      });
    }
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

        // Calculate and animate comparisons
        const newWeekComparison = this.getWeekOverWeekChange();
        const newAverageComparison = this.getAverageComparison();

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
        this.lastWeekComparison = newWeekComparison;
        this.lastAverageComparison = newAverageComparison;
        
        // Update chart
        this.updateChartData();
      });
    } catch (err) {
      this.handleError(err);
    }
  }
}
