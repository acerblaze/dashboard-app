import { Component, OnInit, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardStateService, MetricType } from '../../services/dashboard-state.service';
import { NumberAnimationService } from '../../services/number-animation.service';
import { BaseMetricWidget } from '../base-metric-widget';
import { Chart, ChartConfiguration } from 'chart.js';

@Component({
  selector: 'app-expanded-metric-widget',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink
  ],
  templateUrl: './expanded-metric-widget.component.html',
  styleUrl: './expanded-metric-widget.component.scss'
})
export class ExpandedMetricWidgetComponent extends BaseMetricWidget implements OnInit, OnDestroy {
  isTargetReached: boolean = false;
  @ViewChild('trendChart') trendChartCanvas!: ElementRef;
  private chart: Chart | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor(
    dashboardState: DashboardStateService,
    numberAnimation: NumberAnimationService
  ) {
    super(dashboardState, numberAnimation);
  }

  override ngOnInit() {
    super.ngOnInit();
    // Subscribe to day changes
    this.subscriptions.add(
      this.dashboardState.selectedDay$.subscribe(() => {
        this.updateChartData();
      })
    );

    // Subscribe to device type changes
    this.subscriptions.add(
      this.dashboardState.deviceType$.subscribe(() => {
        this.updateChartData();
      })
    );

    // Subscribe to metric type changes
    this.subscriptions.add(
      this.dashboardState.widgets$.subscribe(() => {
        this.updateChartData();
        // Also update the dataset label
        if (this.chart) {
          this.chart.data.datasets[0].label = this.metricLabel;
        }
      })
    );
  }

  ngAfterViewInit() {
    this.initChart();
    // Setup resize observer
    this.resizeObserver = new ResizeObserver(() => {
      if (this.chart) {
        this.chart.resize();
      }
    });
    
    if (this.trendChartCanvas?.nativeElement) {
      this.resizeObserver.observe(this.trendChartCanvas.nativeElement);
    }
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    if (this.chart) {
      this.chart.destroy();
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  private initChart() {
    if (this.trendChartCanvas) {
      const ctx = this.trendChartCanvas.nativeElement.getContext('2d');
      
      const config: ChartConfiguration = {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            label: this.metricLabel,
            data: [],
            fill: true,
            borderColor: 'hsl(217.2 91.2% 59.8%)',
            backgroundColor: 'hsl(217.2 91.2% 59.8% / 0.1)',
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            duration: 750,
            easing: 'easeOutQuart'
          },
          transitions: {
            active: {
              animation: {
                duration: 750
              }
            }
          },
          animations: {
            y: {
              easing: 'easeOutQuart',
              duration: 750
            }
          },
          interaction: {
            intersect: false,
            mode: 'index'
          },
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
              padding: 8,
              boxPadding: 6,
              usePointStyle: true,
              callbacks: {
                label: (context) => {
                  return ` ${this.formatNumber(context.raw as number)}`;
                }
              }
            }
          },
          scales: {
            x: {
              grid: {
                display: false
              },
              ticks: {
                maxRotation: 0,
                font: {
                  size: 10
                }
              }
            },
            y: {
              beginAtZero: true,
              grid: {
                color: 'hsl(240 5.9% 90%)'
              },
              border: {
                display: false
              },
              ticks: {
                font: {
                  size: 10
                },
                callback: (value) => this.formatNumber(value as number)
              }
            }
          }
        }
      };

      this.chart = new Chart(ctx, config);
      this.updateChartData();
    }
  }

  protected override calculateMetrics(): void {
    super.calculateMetrics();
    this.isTargetReached = this.progressPercentage >= 100;
  }

  private updateChartData() {
    if (!this.chart) return;

    const widget = this.dashboardState.getWidget(this.id);
    if (!widget) return;

    const metricData = this.dashboardState.getMetricData(widget.type);
    const deviceType = this.dashboardState.getCurrentDeviceType();
    const selectedDay = this.dashboardState.getCurrentSelectedDay();

    // Find the index of the selected day
    const selectedDayIndex = metricData.dailyData.findIndex(d => d.date === selectedDay);
    if (selectedDayIndex === -1) return;

    // Get 7 days of data ending at the selected day
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

    // Update data with animation
    const dataset = this.chart.data.datasets[0];
    dataset.data = data;
    this.chart.data.labels = labels;
    
    // Force a full render with animations
    this.chart.update('active');
  }

  toggleSize(): void {
    this.dashboardState.updateWidgetSize(this.id, 'small');
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
}
