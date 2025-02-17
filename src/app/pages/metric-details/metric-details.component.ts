import { Component, ElementRef, OnInit, ViewChild, ErrorHandler, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { DashboardStateService, DeviceType } from '../../services/dashboard-state.service';
import { NumberAnimationService } from '../../services/number-animation.service';
import { BaseMetricWidget } from '../../components/base-metric-widget';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { DaySelectorComponent } from '../../components/day-selector/day-selector.component';
import { MetricData, DailyMetric } from '../../data/mock-metrics';

// Register all Chart.js components
Chart.register(...registerables);

@Component({
  selector: 'app-metric-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatMenuModule,
    MatIconModule,
    MatButtonModule,
    DaySelectorComponent
  ],
  templateUrl: './metric-details.component.html',
  styleUrl: './metric-details.component.scss'
})
export class MetricDetailsComponent extends BaseMetricWidget implements OnInit, OnDestroy {
  @ViewChild('mainChart') mainChartCanvas!: ElementRef;
  @ViewChild('secondaryChart') secondaryChartCanvas!: ElementRef;
  @ViewChild('tertiaryChart') tertiaryChartCanvas!: ElementRef;
  
  private mainChart: Chart | null = null;
  private secondaryChart: Chart | null = null;
  private tertiaryChart: Chart | null = null;

  isTargetReached: boolean = false;
  actualProgressPercentage: number = 0;

  // Display properties for animated values
  private lastAverageComparison: number = 0;
  private lastWeekComparison: number = 0;
  displayAverageComparison: number = 0;
  displayWeekComparison: number = 0;

  // Add color constants
  private readonly COLORS = {
    users: 'hsl(217.2 91.2% 59.8%)',     // Blue
    pageViews: 'hsl(270 91.2% 59.8%)'    // Purple
  };

  constructor(
    protected override dashboardState: DashboardStateService,
    protected override numberAnimation: NumberAnimationService,
    protected override errorHandler: ErrorHandler,
    private route: ActivatedRoute
  ) {
    super(dashboardState, numberAnimation, errorHandler);
  }

  override ngOnInit() {
    // Get the widget ID from the route parameters
    const widgetId = parseInt(this.route.snapshot.paramMap.get('id') || '0', 10);
    if (widgetId) {
      this.id = widgetId;
      super.ngOnInit();
    }
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    this.destroyCharts();
  }

  ngAfterViewInit() {
    this.initializeCharts();
    this.updateChartData();
    this.setupChartResizeObservers();
  }

  private destroyCharts() {
    if (this.mainChart) {
      this.mainChart.destroy();
    }
    if (this.secondaryChart) {
      this.secondaryChart.destroy();
    }
    if (this.tertiaryChart) {
      this.tertiaryChart.destroy();
    }
  }

  private initializeCharts(): void {
    const metricColor = this.getMetricColor();

    // Initialize main chart
    if (this.mainChartCanvas?.nativeElement) {
      const ctx = this.mainChartCanvas.nativeElement.getContext('2d');
      if (ctx) {
        this.mainChart = new Chart(ctx, this.getChartConfig(metricColor));
      }
    }

    // Initialize secondary chart (device distribution)
    if (this.secondaryChartCanvas?.nativeElement) {
      const ctx = this.secondaryChartCanvas.nativeElement.getContext('2d');
      if (ctx) {
        this.secondaryChart = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Desktop', 'Mobile'],
            datasets: [{
              data: [0, 0],
              backgroundColor: [
                metricColor,
                `${metricColor.split(')')[0]} / 0.6)`
              ],
              borderColor: 'white',
              borderWidth: 2
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            layout: {
              padding: 20
            },
            plugins: {
              legend: {
                display: true,
                position: 'bottom',
                labels: {
                  padding: 20,
                  usePointStyle: true,
                  font: {
                    size: 12
                  }
                }
              },
              tooltip: {
                backgroundColor: 'hsl(0 0% 100%)',
                titleColor: 'hsl(240 5.9% 10%)',
                bodyColor: 'hsl(240 3.8% 46.1%)',
                borderColor: 'hsl(240 5.9% 90%)',
                borderWidth: 1,
                padding: 12,
                displayColors: true,
                callbacks: {
                  label: (context) => {
                    const value = context.raw as number;
                    const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
                    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                    return ` ${this.formatNumber(value)} (${percentage}%)`;
                  }
                }
              }
            }
          }
        });
      }
    }

    // Initialize tertiary chart (daily pattern)
    if (this.tertiaryChartCanvas?.nativeElement) {
      const ctx = this.tertiaryChartCanvas.nativeElement.getContext('2d');
      if (ctx) {
        this.tertiaryChart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            datasets: [{
              label: 'Average by Day of Week',
              data: Array(7).fill(0),
              backgroundColor: `${metricColor.split(')')[0]} / 0.2)`,
              borderColor: metricColor,
              borderWidth: 2,
              borderRadius: 4,
              hoverBackgroundColor: `${metricColor.split(')')[0]} / 0.3)`
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              },
              tooltip: {
                backgroundColor: 'hsl(0 0% 100%)',
                titleColor: 'hsl(240 5.9% 10%)',
                bodyColor: 'hsl(240 3.8% 46.1%)',
                borderColor: 'hsl(240 5.9% 90%)',
                borderWidth: 1,
                padding: 12,
                displayColors: false,
                callbacks: {
                  label: (context) => `Average: ${this.formatNumber(context.raw as number)}`
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
            }
          }
        });
      }
    }

    // Initial data update
    this.updateChartData();
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

  private getHourLabels(): string[] {
    return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  }

  private generateDailyPattern(metricData: MetricData, deviceType: DeviceType): number[] {
    // Initialize arrays to store sums and counts for each day of the week (0 = Monday, 6 = Sunday)
    const dailySums = Array(7).fill(0);
    const dailyCounts = Array(7).fill(0);

    // Process each day's data
    metricData.dailyData.forEach((day: DailyMetric) => {
      const value = deviceType === 'total' ? day.total :
                   deviceType === 'desktop' ? day.desktop : day.mobile;
      
      const date = new Date(day.date);
      let dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
      // Convert to Monday-based index (0 = Monday, 6 = Sunday)
      dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

      dailySums[dayOfWeek] += value;
      dailyCounts[dayOfWeek]++;
    });

    // Calculate averages for each day of the week
    return dailySums.map((sum, index) => 
      dailyCounts[index] > 0 ? Math.round(sum / dailyCounts[index]) : 0
    );
  }

  private updateChartData(): void {
    if (!this.mainChart || !this.secondaryChart || !this.tertiaryChart) return;

    const widget = this.dashboardState.getWidget(this.id);
    if (!widget) return;

    try {
      const metricData = this.dashboardState.getMetricData(widget.type);
      const selectedDay = this.dashboardState.getCurrentSelectedDay();
      const deviceType = this.dashboardState.getCurrentDeviceType();

      const selectedDayIndex = metricData.dailyData.findIndex(d => d.date === selectedDay);
      if (selectedDayIndex === -1) return;

      // Update main trend chart
      const startIndex = Math.max(0, selectedDayIndex - 29);
      const relevantDays = metricData.dailyData.slice(startIndex, selectedDayIndex + 1);

      const labels = relevantDays.map(d => {
        const date = new Date(d.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      });

      const data = relevantDays.map(d => 
        deviceType === 'total' ? d.total :
        deviceType === 'desktop' ? d.desktop : d.mobile
      );

      this.mainChart.data.labels = labels;
      this.mainChart.data.datasets[0].data = data;
      this.mainChart.update();

      // Update device distribution chart
      const currentDayData = metricData.dailyData[selectedDayIndex];
      const desktopValue = currentDayData.desktop;
      const mobileValue = currentDayData.mobile;

      this.secondaryChart.data.datasets[0].data = [desktopValue, mobileValue];
      this.secondaryChart.update();

      // Update daily pattern chart
      const patternData = this.generateDailyPattern(metricData, deviceType);
      this.tertiaryChart.data.datasets[0].data = patternData;
      this.tertiaryChart.update();

    } catch (error) {
      this.handleError(error);
    }
  }

  private setupChartResizeObservers(): void {
    if (this.mainChartCanvas?.nativeElement) {
      const resizeObserver = new ResizeObserver(() => {
        if (this.mainChart) {
          this.mainChart.resize();
        }
      });

      resizeObserver.observe(this.mainChartCanvas.nativeElement);
      this.subscriptions.add({
        unsubscribe: () => resizeObserver.disconnect()
      });
    }

    if (this.secondaryChartCanvas?.nativeElement) {
      const resizeObserver = new ResizeObserver(() => {
        if (this.secondaryChart) {
          this.secondaryChart.resize();
        }
      });

      resizeObserver.observe(this.secondaryChartCanvas.nativeElement);
      this.subscriptions.add({
        unsubscribe: () => resizeObserver.disconnect()
      });
    }

    if (this.tertiaryChartCanvas?.nativeElement) {
      const resizeObserver = new ResizeObserver(() => {
        if (this.tertiaryChart) {
          this.tertiaryChart.resize();
        }
      });

      resizeObserver.observe(this.tertiaryChartCanvas.nativeElement);
      this.subscriptions.add({
        unsubscribe: () => resizeObserver.disconnect()
      });
    }
  }

  protected override calculateMetrics(): void {
    super.calculateMetrics();
    this.updateChartData();
    this.updateComparisonMetrics();
    this.updateProgressStatus();
    this.actualProgressPercentage = this.progressPercentage;
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

    this.isTargetReached = (cumulativeValue / metricData.monthlyTarget) * 100 >= 100;
  }

  private updateComparisonMetrics(): void {
    const widget = this.dashboardState.getWidget(this.id);
    if (!widget) return;

    try {
      const data = this.getMetricDataForComparisons();
      if (!data.length) return;

      const weekChange = this.calculateWeekOverWeekChange(data);
      if (weekChange !== this.lastWeekComparison) {
        this.numberAnimation.animateValue(
          this.lastWeekComparison,
          weekChange,
          (value: number) => this.displayWeekComparison = value,
          { duration: 500, precision: 1 }
        );
        this.lastWeekComparison = weekChange;
      }

      const avgComparison = this.calculateMonthlyAverageComparison(data);
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
    
    const selectedDayIndex = metricData.dailyData.findIndex(d => d.date === selectedDay);
    if (selectedDayIndex === -1) return [];

    const startIndex = Math.max(0, selectedDayIndex - 29);
    const relevantDays = metricData.dailyData.slice(startIndex, selectedDayIndex + 1);

    return relevantDays.map(d => 
      deviceType === 'total' ? d.total : 
      deviceType === 'desktop' ? d.desktop : d.mobile
    );
  }

  private calculateWeekOverWeekChange(data: number[]): number {
    if (data.length < 8) return 0;

    const todayValue = data[data.length - 1];
    const lastWeekValue = data[data.length - 8];
    if (lastWeekValue === 0) return 0;

    const change = ((todayValue - lastWeekValue) / lastWeekValue) * 100;
    
    if (!isFinite(change)) return 0;
    return Math.round(change);
  }

  private calculateMonthlyAverageComparison(data: number[]): number {
    if (data.length < 2) return 0;

    const todayValue = data[data.length - 1];
    const previousDays = data.slice(0, -1);
    if (previousDays.length === 0) return 0;

    const monthlyAverage = previousDays.reduce((sum, value) => sum + value, 0) / previousDays.length;
    if (monthlyAverage === 0) return 0;

    const change = ((todayValue - monthlyAverage) / monthlyAverage) * 100;
    
    if (!isFinite(change)) return 0;
    return Math.round(change);
  }

  getMetricName(): string {
    const widget = this.dashboardState.getWidget(this.id);
    return widget?.type === 'users' ? 'Active Users' : 'Page Views';
  }

  getMonthlyTarget(): number {
    const widget = this.dashboardState.getWidget(this.id);
    if (!widget) return 0;
    return this.dashboardState.getMetricData(widget.type).monthlyTarget;
  }

  // Required abstract method implementation
  toggleSize(): void {
    // No-op for details page
  }

  private getMetricColor(): string {
    const widget = this.dashboardState.getWidget(this.id);
    return widget?.type === 'users' ? this.COLORS.users : this.COLORS.pageViews;
  }
}
